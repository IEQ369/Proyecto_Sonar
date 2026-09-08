import test from 'node:test';
import assert from 'node:assert/strict';

import {
    emitirArchivoRobusto
} from '../src/web/archivos/static/js/emisor_archivos.js';
import {
    calcularTotalSimbolosArchivo
} from '../src/web/archivos/static/js/protocolo_archivos.js';

test('el emisor cuenta todos los símbolos y termina exactamente en 100 por ciento', async () => {
    const contenido = new Uint8Array([42]);
    const archivo = {
        name: 'área.bin',
        size: contenido.length,
        async arrayBuffer() {
            return contenido.buffer.slice(0);
        }
    };
    const audioContexto = {
        cerrado: false,
        close() {
            this.cerrado = true;
        }
    };
    const progresos = [];
    let tonosEmitidos = 0;

    await emitirArchivoRobusto(
        archivo,
        {
            audioContexto,
            emitirTono: async () => {
                tonosEmitidos++;
            },
            programar: (callback) => callback()
        },
        (progreso) => progresos.push(progreso)
    );

    const totalEsperado = calcularTotalSimbolosArchivo(archivo.size);
    const ultimo = progresos.at(-1);

    assert.equal(tonosEmitidos, totalEsperado);
    assert.equal(progresos.length, totalEsperado);
    assert.equal(ultimo.simbolosTransmitidos, totalEsperado);
    assert.equal(ultimo.totalSimbolos, totalEsperado);
    assert.equal(ultimo.progreso, 100);
    assert.equal(audioContexto.cerrado, true);
});

test('el emisor valida la cabecera antes de crear o reproducir audio', async () => {
    const archivoDemasiadoGrande = {
        name: 'grande.bin',
        size: 0x100000000,
        async arrayBuffer() {
            return new ArrayBuffer(0);
        }
    };

    await assert.rejects(
        emitirArchivoRobusto(archivoDemasiadoGrande),
        /El tamaño debe ser un entero entre 0 y 2\^32-1/
    );
});
