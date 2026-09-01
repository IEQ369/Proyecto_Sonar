import test from 'node:test';
import assert from 'node:assert/strict';

import {
    generarMuestrasOnda,
    generarSilencio,
    concatenarMuestras
} from '../src/web/static/js/generador_onda.js';
import {
    aplicarCanalIdentidad
} from '../src/web/static/js/simulacion/canal_simulado.js';

const SAMPLE_RATE = 48000;

test('un tono sintético posee la cantidad exacta de muestras', () => {
    const muestras = generarMuestrasOnda({
        frecuencia: 18800,
        duracion: 0.06,
        tipo: 'sine',
        amplitud: 0.15,
        sampleRate: SAMPLE_RATE,
        fadeTime: 0.004
    });

    assert.ok(muestras instanceof Float32Array);
    assert.equal(muestras.length, 2880);
});

test('la generación del mismo tono es determinista', () => {
    const options = {
        frecuencia: 18800,
        duracion: 0.06,
        tipo: 'sine',
        amplitud: 0.15,
        sampleRate: SAMPLE_RATE,
        fadeTime: 0.004
    };

    const primera = generarMuestrasOnda(options);
    const segunda = generarMuestrasOnda(options);

    assert.deepEqual(primera, segunda);
});

test('una onda sinusoidal sin fade sigue la fórmula muestreada', () => {
    const frecuencia = 1000;
    const amplitud = 0.25;
    const muestras = generarMuestrasOnda({
        frecuencia,
        duracion: 0.01,
        tipo: 'sine',
        amplitud,
        sampleRate: SAMPLE_RATE,
        fadeTime: 0
    });

    for (const indice of [0, 1, 12, 48, 127]) {
        const esperada = amplitud * Math.sin(
            2 * Math.PI * frecuencia * indice / SAMPLE_RATE
        );

        assert.ok(Math.abs(muestras[indice] - esperada) < 1e-7);
    }
});

test('el silencio posee longitud exacta y amplitud cero', () => {
    const silencio = generarSilencio({
        duracion: 0.02,
        sampleRate: SAMPLE_RATE
    });

    assert.equal(silencio.length, 960);
    assert.ok(silencio.every((muestra) => muestra === 0));
});

test('la concatenación conserva orden, valores y longitud', () => {
    const primero = new Float32Array([0.1, 0.2]);
    const segundo = new Float32Array([0]);
    const tercero = new Float32Array([-0.3, -0.4]);
    const resultado = concatenarMuestras([primero, segundo, tercero]);

    assert.deepEqual(
        Array.from(resultado),
        Array.from(new Float32Array([0.1, 0.2, 0, -0.3, -0.4]))
    );
});

test('la secuencia sintética A tiene 21120 muestras a 48 kHz', () => {
    const tono = (frecuencia, duracion) => generarMuestrasOnda({
        frecuencia,
        duracion,
        tipo: 'sine',
        amplitud: 0.1,
        sampleRate: SAMPLE_RATE,
        fadeTime: 0.004
    });
    const secuenciaA = concatenarMuestras([
        tono(18500, 0.09),
        tono(19050, 0.09),
        tono(18800, 0.06),
        generarSilencio({ duracion: 0.02, sampleRate: SAMPLE_RATE }),
        tono(19050, 0.09),
        tono(19600, 0.09)
    ]);

    assert.equal(secuenciaA.length, 21120);
});

test('el canal identidad preserva todas las muestras sin compartir memoria', () => {
    const entrada = new Float32Array([0, 0.25, -0.5, 1]);
    const salida = aplicarCanalIdentidad(entrada);

    assert.deepEqual(salida, entrada);
    assert.notEqual(salida.buffer, entrada.buffer);

    salida[1] = 0.75;
    assert.equal(entrada[1], 0.25);
});

test('el canal identidad rechaza entradas que no sean muestras Float32', () => {
    assert.throws(
        () => aplicarCanalIdentidad([0, 1]),
        /Float32Array/
    );
});
