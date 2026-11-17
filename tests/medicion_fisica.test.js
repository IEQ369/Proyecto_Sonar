import test from 'node:test';
import assert from 'node:assert/strict';

import {
    analizarCaptura,
    analizarCuadro,
    crearPlanMedicion,
    formatearAnalisis
} from '../src/web/static/js/core/medicion_fisica.js';
import { calcularEspectroBytes } from '../src/web/static/js/simulacion/caracterizacion.js';
import { aplicarCanalSimulado } from '../src/web/static/js/simulacion/canal_simulado.js';
import { generarMuestrasOnda } from '../src/web/static/js/generador_onda.js';

function cuadroDeTono(frecuenciaHz, opciones = {}) {
    const limpio = generarMuestrasOnda({
        frecuencia: frecuenciaHz,
        duracion: 0.1,
        tipo: 'sine',
        amplitud: opciones.amplitud ?? 0.02,
        sampleRate: 48000,
        fadeTime: 0
    });
    const recibido = aplicarCanalSimulado(limpio, {
        amplitudRuido: opciones.amplitudRuido ?? 0.002,
        semilla: opciones.semilla ?? 1
    });

    return analizarCuadro(calcularEspectroBytes(recibido), { sampleRate: 48000 });
}

test('el plan por defecto cubre de 18 a 22 kHz y dura 13,5 s', () => {
    const plan = crearPlanMedicion();

    assert.equal(plan.frecuenciasHz[0], 18000);
    assert.equal(plan.frecuenciasHz.at(-1), 22000);
    assert.equal(plan.duracionTotalS, 13.5);
});

test('el plan rechaza frecuencias no representables o demasiado juntas', () => {
    assert.throws(
        () => crearPlanMedicion({ frecuenciasHz: [23000], sampleRateHz: 44100 }),
        RangeError
    );
    assert.throws(
        () => crearPlanMedicion({ frecuenciasHz: [19000, 19100] }),
        RangeError
    );
    assert.throws(() => crearPlanMedicion({ frecuenciasHz: [] }), RangeError);
});

test('el pico interpolado es más fino que el bin del receptor', () => {
    for (const frecuenciaHz of [19000, 19010, 20005, 21493]) {
        const cuadro = cuadroDeTono(frecuenciaHz);

        assert.ok(Math.abs(cuadro.picoHz - frecuenciaHz) <= 48000 / 2048 / 2 + 0.01);
        assert.ok(
            Math.abs(cuadro.picoInterpoladoHz - frecuenciaHz) <= 4,
            `${frecuenciaHz} Hz → ${cuadro.picoInterpoladoHz} Hz`
        );
        assert.ok(cuadro.magnitud - cuadro.pisoRuido >= 55);
    }
});

test('un pico saturado no se interpola', () => {
    const bytes = new Uint8Array(1024);
    bytes[810] = 200;
    bytes[811] = 255;
    bytes[812] = 255;

    const cuadro = analizarCuadro(bytes, { sampleRate: 48000 });

    assert.equal(cuadro.picoHz, cuadro.picoInterpoladoHz);
    assert.equal(cuadro.magnitud, 255);
});

test('un cuadro sin energía en la banda no inventa un pico', () => {
    const cuadro = analizarCuadro(new Uint8Array(1024), { sampleRate: 48000 });

    assert.equal(cuadro.picoHz, null);
    assert.equal(cuadro.magnitud, 0);
});

test('la captura se agrupa por tono y recupera un desvío conocido', () => {
    const plan = crearPlanMedicion();
    const cuadros = [];
    let tMs = 0;
    const agregar = (cuadro) => {
        cuadros.push({ tMs, ...cuadro });
        tMs += 16.7;
    };

    for (const [indice, frecuenciaHz] of plan.frecuenciasHz.entries()) {
        // 22 kHz no llega: simula un altavoz que no responde tan arriba.
        const amplitud = frecuenciaHz === 22000 ? 0 : 0.02;

        for (let i = 0; i < 20; i++) {
            agregar(cuadroDeTono(frecuenciaHz + 12, {
                amplitud,
                semilla: indice * 100 + i
            }));
        }
        for (let i = 0; i < 10; i++) {
            agregar(cuadroDeTono(19000, { amplitud: 0, semilla: 9000 + i }));
        }
    }

    const analisis = analizarCaptura(cuadros, plan);

    assert.equal(analisis.tonosDelPlan, 9);
    assert.equal(analisis.tonosDetectados, 8);
    assert.equal(analisis.cuadrosConTonoFueraDelPlan, 0);
    assert.equal(analisis.intervaloMedianoMs, 16.7);

    for (const tono of analisis.tonos.slice(0, 8)) {
        assert.equal(tono.detectado, true);
        assert.equal(tono.cuadros, 20);
        assert.ok(Math.abs(tono.desvioMedianoHz - 12) <= 4, `${tono.frecuenciaHz}`);
        assert.ok(tono.sobrePisoDb > 15);
    }
    assert.equal(analisis.tonos[8].detectado, false);
    assert.equal(analisis.tonos[8].desvioMedianoHz, null);
    assert.match(formatearAnalisis(analisis), /Tonos detectados: 8 de 9/);
});

test('el ruido solo no se cuenta como tono', () => {
    const cuadros = Array.from({ length: 200 }, (_, i) => ({
        tMs: i * 16.7,
        ...cuadroDeTono(19000, { amplitud: 0, amplitudRuido: 0.01, semilla: i })
    }));
    const analisis = analizarCaptura(cuadros, crearPlanMedicion());

    assert.equal(analisis.cuadrosConTono, 0);
    assert.equal(analisis.tonosDetectados, 0);
});

test('una captura vacía se analiza sin errores', () => {
    const analisis = analizarCaptura([], crearPlanMedicion());

    assert.equal(analisis.cuadros, 0);
    assert.equal(analisis.tonosDetectados, 0);
    assert.equal(analisis.desvioAbsolutoMaximoHz, null);
});
