/**
 * Capa de trama del protocolo de archivos V2.
 *
 * Un paquete es autocontenido: lleva su tipo, a qué transferencia pertenece,
 * su número de secuencia, su longitud y un CRC16. Así el receptor puede
 * aceptar o rechazar cada paquete sin depender de los anteriores.
 *
 *   TIPO | ID | SECUENCIA (2) | LONGITUD | DATOS (0–32) | CRC16 (2)
 */
import { crc16ccitt } from '../../../archivos/static/js/protocolo_archivos.js';

export const TIPO_PAQUETE = Object.freeze({ CABECERA: 1, DATOS: 2, FIN: 3 });
export const MAX_DATOS_PAQUETE = 32;
export const BYTES_ANTES_DE_DATOS = 5;
export const BYTES_FIJOS_PAQUETE = BYTES_ANTES_DE_DATOS + 2;

export function longitudTotalPaquete(longitudDatos) {
    return BYTES_FIJOS_PAQUETE + longitudDatos;
}

export function crearPaquete({ tipo, id, secuencia, datos = new Uint8Array(0) }) {
    if (!Object.values(TIPO_PAQUETE).includes(tipo)) {
        throw new RangeError(`Tipo de paquete desconocido: ${tipo}`);
    }
    if (!Number.isInteger(id) || id < 0 || id > 255) {
        throw new RangeError('El identificador debe caber en un byte');
    }
    if (!Number.isInteger(secuencia) || secuencia < 0 || secuencia > 0xFFFF) {
        throw new RangeError('La secuencia debe caber en dos bytes');
    }
    if (!(datos instanceof Uint8Array) || datos.length > MAX_DATOS_PAQUETE) {
        throw new RangeError(
            `Los datos deben ser un Uint8Array de hasta ${MAX_DATOS_PAQUETE} bytes`
        );
    }

    const paquete = new Uint8Array(longitudTotalPaquete(datos.length));

    paquete[0] = tipo;
    paquete[1] = id;
    paquete[2] = secuencia >> 8;
    paquete[3] = secuencia & 0xFF;
    paquete[4] = datos.length;
    paquete.set(datos, BYTES_ANTES_DE_DATOS);

    const crc = crc16ccitt(paquete.subarray(0, paquete.length - 2));

    paquete[paquete.length - 2] = crc >> 8;
    paquete[paquete.length - 1] = crc & 0xFF;

    return paquete;
}

/** Valida un paquete recibido. Nunca lanza: devuelve `valido` y el motivo. */
export function leerPaquete(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < BYTES_FIJOS_PAQUETE) {
        return { valido: false, motivo: 'paquete incompleto' };
    }

    const longitudDatos = bytes[4];

    if (longitudDatos > MAX_DATOS_PAQUETE) {
        return { valido: false, motivo: 'longitud fuera de rango' };
    }
    if (bytes.length !== longitudTotalPaquete(longitudDatos)) {
        return { valido: false, motivo: 'longitud no coincide' };
    }

    const crcRecibido = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];

    if (crcRecibido !== crc16ccitt(bytes.subarray(0, bytes.length - 2))) {
        return { valido: false, motivo: 'CRC incorrecto' };
    }
    if (!Object.values(TIPO_PAQUETE).includes(bytes[0])) {
        return { valido: false, motivo: 'tipo desconocido' };
    }

    return {
        valido: true,
        tipo: bytes[0],
        id: bytes[1],
        secuencia: (bytes[2] << 8) | bytes[3],
        datos: bytes.slice(BYTES_ANTES_DE_DATOS, BYTES_ANTES_DE_DATOS + longitudDatos)
    };
}

/** CRC32 (IEEE 802.3) del archivo completo, para la verificación final. */
export function crc32(bytes) {
    let crc = 0xFFFFFFFF;

    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
        }
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}
