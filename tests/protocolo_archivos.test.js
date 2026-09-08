import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PROTOCOLO_ARCHIVOS,
    byteToBits,
    bitsToByte,
    codificarCabeceraArchivo,
    crearCabeceraArchivo,
    decodificarCabeceraArchivo,
    codificarNombreArchivo,
    crc16ccitt,
    codificarBloqueDatos,
    decodificarBloqueDatos,
    crc8,
    calcularTotalSimbolosArchivo,
    calcularProgresoArchivo
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

test('una alteración en la cabecera es detectada por CRC16', () => {
    const cabecera = crearCabeceraArchivo(513, 'A.TXT');
    cabecera[0] ^= 0x01;

    const resultado = decodificarCabeceraArchivo(cabecera);

    assert.equal(resultado.valida, false);
});

test('un nombre UTF-8 conserva eñe y tilde dentro de la cabecera', () => {
    const cabecera = crearCabeceraArchivo(7, 'área-ñ.txt');
    const resultado = decodificarCabeceraArchivo(cabecera);

    assert.equal(resultado.valida, true);
    assert.equal(resultado.nombre, 'área-ñ.txt');
});

test('un nombre largo se trunca sin cortar un carácter UTF-8', () => {
    const nombre = 'archivo-📡-ultrasónico.bin';
    const nombreCodificado = codificarNombreArchivo(nombre);
    const cabecera = crearCabeceraArchivo(1, nombre);
    const resultado = decodificarCabeceraArchivo(cabecera);

    assert.ok(nombreCodificado.length <= PROTOCOLO_ARCHIVOS.NOMBRE_BYTES);
    assert.equal(resultado.valida, true);
    assert.equal(resultado.nombre, 'archivo-📡-ult');
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

test('una alteración en los datos es detectada por CRC8', () => {
    const bloque = codificarBloqueDatos(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    );
    bloque[3] ^= 0x01;

    const resultado = decodificarBloqueDatos(bloque);

    assert.equal(resultado.valido, false);
});

test('el XOR usado por el receptor V1 no equivale al CRC8 del emisor', () => {
    const datos = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const crcPolinomial = crc8(datos);
    const crcXor = datos.reduce((acumulado, byte) => acumulado ^ byte, 0);

    assert.notEqual(crcPolinomial, crcXor);
});

test('el baseline E002 conserva que el bloque final V1 medía solo 4 bytes', () => {
    const datos = new Uint8Array([1, 2, 3]);
    const bloqueFinalV1 = new Uint8Array(datos.length + 1);
    bloqueFinalV1.set(datos);
    bloqueFinalV1[datos.length] = crc8(datos);

    assert.equal(bloqueFinalV1.length, 4);
});

test('un bloque final corto se rellena, valida y recupera sin ceros extra', () => {
    const bloqueFinal = codificarBloqueDatos(new Uint8Array([1, 2, 3]));
    const resultado = decodificarBloqueDatos(bloqueFinal, {
        longitudDatos: 3
    });

    assert.equal(
        bloqueFinal.length,
        PROTOCOLO_ARCHIVOS.BLOQUE_DATOS + PROTOCOLO_ARCHIVOS.CRC_BLOQUE
    );
    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.datos, new Uint8Array([1, 2, 3]));
    assert.deepEqual(
        resultado.datosRellenos,
        new Uint8Array([1, 2, 3, 0, 0, 0, 0, 0])
    );
});

test('un bloque no puede exceder los 8 bytes definidos por el contrato', () => {
    assert.throws(
        () => codificarBloqueDatos(new Uint8Array(9)),
        /Un bloque debe contener entre 1 y 8 bytes/
    );
});

test('archivos de 1 a 25 bytes sobreviven al empaquetado por bloques', () => {
    for (let tamano = 1; tamano <= 25; tamano++) {
        const original = Uint8Array.from(
            { length: tamano },
            (_, indice) => (indice * 17 + 3) % 256
        );
        const reconstruido = [];

        for (
            let offset = 0;
            offset < original.length;
            offset += PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
        ) {
            const datos = original.slice(
                offset,
                offset + PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
            );
            const bloque = codificarBloqueDatos(datos);
            const resultado = decodificarBloqueDatos(bloque, {
                longitudDatos: datos.length
            });

            assert.equal(resultado.valido, true);
            reconstruido.push(...resultado.datos);
        }

        assert.deepEqual(new Uint8Array(reconstruido), original);
    }
});

test('el total de símbolos incluye SOI, cabecera, bloques completos y END', () => {
    const baseSinDatos = 10 + 24 + 528 + 3;

    assert.equal(calcularTotalSimbolosArchivo(0), baseSinDatos);
    assert.equal(calcularTotalSimbolosArchivo(1), baseSinDatos + 72);
    assert.equal(calcularTotalSimbolosArchivo(8), baseSinDatos + 72);
    assert.equal(calcularTotalSimbolosArchivo(9), baseSinDatos + 144);
});

test('el progreso llega a 100 por ciento sin excederlo', () => {
    const total = calcularTotalSimbolosArchivo(1);

    assert.equal(calcularProgresoArchivo(0, total), 0);
    assert.equal(calcularProgresoArchivo(total, total), 100);
    assert.equal(calcularProgresoArchivo(total + 1, total), 100);
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
