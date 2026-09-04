import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    PROTOCOLO_ARCHIVOS,
    codificarCabeceraArchivo,
    crearCabeceraArchivo,
    decodificarCabeceraArchivo,
    crc16ccitt,
    codificarBloqueDatos,
    decodificarBloqueDatos,
    crc8
} from '../src/web/archivos/static/js/protocolo_archivos.js';

const configUrl = new URL(
    '../docs/experiments/E002-baseline-archivos/config.json',
    import.meta.url
);
const outputUrl = new URL(
    '../docs/experiments/E002-baseline-archivos/results/latest.json',
    import.meta.url
);
const config = JSON.parse(readFileSync(configUrl, 'utf8'));

function calcularCrcCabeceraEmisorV1(nombre) {
    const nombreCodificado = new TextEncoder().encode(
        nombre.slice(0, 16).padEnd(16, '\0')
    );

    return crc16ccitt(new Uint8Array([
        ...new Uint8Array(4),
        ...nombreCodificado
    ]));
}

function aHex(bytes) {
    return Array.from(bytes, (byte) => (
        byte.toString(16).padStart(2, '0')
    )).join(' ');
}

const { fileSizeBytes, fileName } = config.headerVector;
const cabeceraReferencia = crearCabeceraArchivo(fileSizeBytes, fileName);
const crcEmisorV1 = calcularCrcCabeceraEmisorV1(fileName);
const cabeceraEmisorV1 = codificarCabeceraArchivo(
    fileSizeBytes,
    fileName,
    crcEmisorV1
);
const resultadoCabeceraReferencia = decodificarCabeceraArchivo(
    cabeceraReferencia
);
const resultadoCabeceraV1 = decodificarCabeceraArchivo(cabeceraEmisorV1);
const datosBloqueCompleto = new Uint8Array(config.fullBlockVector);
const bloqueCompleto = codificarBloqueDatos(datosBloqueCompleto);
const resultadoBloqueCompleto = decodificarBloqueDatos(bloqueCompleto);
const crcXorReceptorV1 = datosBloqueCompleto.reduce(
    (acumulado, byte) => acumulado ^ byte,
    0
);
const bloqueCorto = codificarBloqueDatos(
    new Uint8Array(config.shortBlockVector)
);
const tamanoBloqueEsperadoV1 = (
    config.receiverV1.expectedBlockDataBytes
    + config.receiverV1.expectedBlockCrcBytes
);
const distanciaDatosHz = Math.abs(
    PROTOCOLO_ARCHIVOS.DATA_1 - PROTOCOLO_ARCHIVOS.DATA_0
);
const ventanasBinariasSolapadas = distanciaDatosHz
    < config.receiverV1.frequencyToleranceHz * 2;
const collisions = [
    {
        left: 'START',
        right: 'DATA_0',
        frequencyHz: PROTOCOLO_ARCHIVOS.START,
        exact: PROTOCOLO_ARCHIVOS.START === PROTOCOLO_ARCHIVOS.DATA_0
    },
    {
        left: 'SYNC',
        right: 'DATA_1',
        frequencyHz: PROTOCOLO_ARCHIVOS.SYNC,
        exact: PROTOCOLO_ARCHIVOS.SYNC === PROTOCOLO_ARCHIVOS.DATA_1
    },
    {
        left: 'END',
        right: 'ACK',
        frequencyHz: PROTOCOLO_ARCHIVOS.END,
        exact: PROTOCOLO_ARCHIVOS.END === PROTOCOLO_ARCHIVOS.ACK
    }
];
const confirmedDefects = [
    !resultadoCabeceraV1.valida && 'header_crc_mismatch',
    crc8(datosBloqueCompleto) !== crcXorReceptorV1
        && 'block_crc_algorithm_mismatch',
    bloqueCorto.length !== tamanoBloqueEsperadoV1
        && 'short_final_block_length_mismatch',
    collisions.every((collision) => collision.exact)
        && 'exact_frequency_role_collisions',
    ventanasBinariasSolapadas && 'binary_decision_windows_overlap'
].filter(Boolean);
const report = {
    schemaVersion: 1,
    experimentId: config.experimentId,
    experimentStatus: config.status,
    executedAt: new Date().toISOString(),
    environment: {
        runtime: 'Node.js',
        runtimeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
    },
    summary: {
        confirmedDefectCount: confirmedDefects.length,
        confirmedDefects
    },
    header: {
        input: config.headerVector,
        reference: {
            bytesHex: aHex(cabeceraReferencia),
            validForReceiver: resultadoCabeceraReferencia.valida,
            crc16: resultadoCabeceraReferencia.crcRecibido
        },
        transmitterV1: {
            bytesHex: aHex(cabeceraEmisorV1),
            validForReceiver: resultadoCabeceraV1.valida,
            transmittedCrc16: resultadoCabeceraV1.crcRecibido,
            receiverCalculatedCrc16: resultadoCabeceraV1.crcCalculado
        }
    },
    fullBlock: {
        data: config.fullBlockVector,
        encodedHex: aHex(bloqueCompleto),
        referenceCrc8: crc8(datosBloqueCompleto),
        receiverV1Xor: crcXorReceptorV1,
        referenceValidation: resultadoBloqueCompleto.valido
    },
    shortFinalBlock: {
        data: config.shortBlockVector,
        encodedLengthBytes: bloqueCorto.length,
        receiverExpectedLengthBytes: tamanoBloqueEsperadoV1,
        compatible: bloqueCorto.length === tamanoBloqueEsperadoV1
    },
    frequencies: {
        collisions,
        dataDistanceHz: distanciaDatosHz,
        receiverToleranceHz: config.receiverV1.frequencyToleranceHz,
        decisionWindowsOverlap: ventanasBinariasSolapadas
    }
};
const outputPath = fileURLToPath(outputUrl);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`E002: ${confirmedDefects.length} incompatibilidades confirmadas`);
for (const defect of confirmedDefects) {
    console.log(`- ${defect}`);
}
console.log(`Resultado: ${outputPath}`);
