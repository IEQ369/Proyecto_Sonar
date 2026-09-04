import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PROTOCOLO_ARCHIVOS,
    byteToBits,
    bitsToByte,
    codificarCabeceraArchivo,
    crearCabeceraArchivo,
    decodificarCabeceraArchivo,
    crc16ccitt,
    codificarBloqueDatos,
    decodificarBloqueDatos,
    crc8
} from '../src/web/archivos/static/js/protocolo_archivos.js';

function calcularCrcCabeceraEmisorV1(nombre) {
    const nombreCodificado = new TextEncoder().encode(
        nombre.slice(0, 16).padEnd(16, '\0')
    );
    const entradaCrc = new Uint8Array([
        ...new Uint8Array(4),
        ...nombreCodificado
    ]);

    return crc16ccitt(entradaCrc);
}

test('todos los bytes conservan su valor después de convertirlos a bits', () => {
    for (let byte = 0; byte <= 255; byte++) {
        assert.equal(bitsToByte(byteToBits(byte)), byte);
    }
});

test('CRC16-CCITT produce el vector estándar 123456789', () => {
    const vector = new TextEncoder().encode('123456789');

    assert.equal(crc16ccitt(vector), 0x29B1);
});

test('CRC8 produce el vector estándar 123456789', () => {
    const vector = new TextEncoder().encode('123456789');

    assert.equal(crc8(vector), 0xF4);
});

test('la cabecera de referencia conserva tamaño, nombre y CRC16', () => {
    const cabecera = crearCabeceraArchivo(513, 'A.TXT');
    const resultado = decodificarCabeceraArchivo(cabecera);

    assert.equal(cabecera.length, 22);
    assert.equal(resultado.valida, true);
    assert.equal(resultado.tamano, 513);
    assert.equal(resultado.nombre, 'A.TXT');
});

test('el CRC de cabecera del emisor V1 no incluye el tamaño real', () => {
    const tamano = 1;
    const nombre = 'A';
    const crcEmisorV1 = calcularCrcCabeceraEmisorV1(nombre);
    const cabeceraV1 = codificarCabeceraArchivo(
        tamano,
        nombre,
        crcEmisorV1
    );
    const resultadoReceptor = decodificarCabeceraArchivo(cabeceraV1);

    assert.equal(resultadoReceptor.valida, false);
    assert.notEqual(
        resultadoReceptor.crcRecibido,
        resultadoReceptor.crcCalculado
    );
});

test('un bloque de referencia recupera sus bytes y valida CRC8', () => {
    const datos = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const bloque = codificarBloqueDatos(datos);
    const resultado = decodificarBloqueDatos(bloque);

    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.datos, datos);
});

test('el XOR usado por el receptor V1 no equivale al CRC8 del emisor', () => {
    const datos = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const crcPolinomial = crc8(datos);
    const crcXor = datos.reduce((acumulado, byte) => acumulado ^ byte, 0);

    assert.notEqual(crcPolinomial, crcXor);
});

test('un bloque final corto no alcanza los 9 bytes esperados por RX V1', () => {
    const bloqueFinal = codificarBloqueDatos(new Uint8Array([1, 2, 3]));

    assert.equal(bloqueFinal.length, 4);
    assert.notEqual(
        bloqueFinal.length,
        PROTOCOLO_ARCHIVOS.BLOQUE_DATOS + PROTOCOLO_ARCHIVOS.CRC_BLOQUE
    );
});

test('el baseline registra colisiones exactas entre control y datos', () => {
    assert.equal(PROTOCOLO_ARCHIVOS.START, PROTOCOLO_ARCHIVOS.DATA_0);
    assert.equal(PROTOCOLO_ARCHIVOS.SYNC, PROTOCOLO_ARCHIVOS.DATA_1);
    assert.equal(PROTOCOLO_ARCHIVOS.END, PROTOCOLO_ARCHIVOS.ACK);
});

test('las ventanas DATA_0 y DATA_1 se solapan con tolerancia de 300 Hz', () => {
    const distancia = Math.abs(
        PROTOCOLO_ARCHIVOS.DATA_1 - PROTOCOLO_ARCHIVOS.DATA_0
    );
    const toleranciaV1 = 300;

    assert.ok(distancia < toleranciaV1 * 2);
});
