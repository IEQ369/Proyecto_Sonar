import test from 'node:test';
import assert from 'node:assert/strict';

import { frequencyToChar } from '../src/web/static/js/protocolo_ultrasonico.js';
import {
    MAPA_V1,
    MAPA_V2_CANDIDATO,
    SIMBOLO_END,
    SIMBOLO_SYNC,
    POLITICAS_LOGICAS,
    barrerBanda,
    decidirFrecuenciaConReceptorV1,
    decidirMasCercano,
    decidirPrimerCoincidente,
    estimarPicoAnalizador,
    medirSistema,
    medirVentanas,
    observarTono,
    resumirVentanas,
    simbolosDeDatos,
    velocidadDopplerEquivalente
} from '../src/web/static/js/simulacion/caracterizacion.js';
import {
    V2_DISTANCIA_MAXIMA_HZ,
    V2_FRECUENCIA_MAXIMA_HZ,
    V2_PASO_HZ
} from '../src/web/static/js/simulacion/mapa_candidato_v2.js';
import { generarMuestrasOnda } from '../src/web/static/js/generador_onda.js';

test('el detector de pico localiza un tono dentro de medio bin', () => {
    for (const sampleRate of [48000, 44100]) {
        const muestras = generarMuestrasOnda({
            frecuencia: 19000,
            duracion: 0.1,
            tipo: 'sine',
            amplitud: 0.1,
            sampleRate,
            fadeTime: 0
        });
        const pico = estimarPicoAnalizador(muestras, { sampleRate });

        assert.ok(Math.abs(pico.frecuenciaHz - 19000) <= pico.binHz / 2 + 1e-9);
        assert.ok(pico.magnitud > 200);
    }
});

test('el detector no reporta magnitud cuando solo hay silencio', () => {
    const pico = estimarPicoAnalizador(new Float32Array(2048));

    assert.equal(pico.magnitud, 0);
});

test('primer coincidente ±80 Hz reproduce frequencyToChar fuera del control', () => {
    for (let hz = 18000; hz <= 22500; hz += 5) {
        const decidido = decidirPrimerCoincidente(hz, MAPA_V1);

        if (decidido === SIMBOLO_SYNC || decidido === SIMBOLO_END) continue;
        assert.equal(decidido ?? '', frequencyToChar(hz), `${hz} Hz`);
    }
});

test('el receptor real de V1 decide cada símbolo en su frecuencia nominal', () => {
    for (const { simbolo, frecuenciaHz } of simbolosDeDatos(MAPA_V1)) {
        assert.equal(decidirFrecuenciaConReceptorV1(frecuenciaHz), simbolo);
    }
});

test('baseline medido: la región de V1 es asimétrica (19 Hz abajo, 59 arriba)', () => {
    const ventanas = medirVentanas(
        MAPA_V1,
        POLITICAS_LOGICAS['v1-receptor'].decidir
    );
    const a = ventanas.find((ventana) => ventana.simbolo === 'A');

    assert.equal(a.ventanaInferiorHz, 19);
    assert.equal(a.ventanaSuperiorHz, 59);
    assert.equal(resumirVentanas(ventanas).margenMinimoHz, 19);
});

test('baseline medido: V1 emite un carácter vecino en parte de la banda', () => {
    const barrido = barrerBanda(
        MAPA_V1,
        POLITICAS_LOGICAS['v1-receptor'].decidir
    );

    assert.ok(barrido.simboloEquivocado > 0);
    // 18 750 Hz está más cerca de A (18 800), pero V1 decide Ñ (18 700).
    assert.equal(decidirFrecuenciaConReceptorV1(18750), 'Ñ');
});

test('más cercano nunca decide un símbolo distinto del más próximo', () => {
    for (const mapa of [MAPA_V1, MAPA_V2_CANDIDATO]) {
        const barrido = barrerBanda(mapa, (hz, m) => decidirMasCercano(hz, m));

        assert.equal(barrido.simboloEquivocado, 0);
    }
});

test('más cercano no decide empates ni frecuencias lejanas', () => {
    assert.equal(decidirMasCercano(18850, MAPA_V1), null);
    assert.equal(decidirMasCercano(17000, MAPA_V1), null);
    assert.equal(decidirMasCercano(18810, MAPA_V1), 'A');
});

test('el mapa candidato V2 cumple sus criterios de diseño', () => {
    const frecuencias = [
        MAPA_V2_CANDIDATO.control.START,
        ...simbolosDeDatos(MAPA_V2_CANDIDATO).map((s) => s.frecuenciaHz)
    ].sort((a, b) => a - b);

    assert.equal(new Set(frecuencias).size, frecuencias.length);
    assert.equal(MAPA_V2_CANDIDATO.caracteres.length, MAPA_V1.caracteres.length);
    assert.deepEqual(
        MAPA_V2_CANDIDATO.caracteres.map((s) => s.simbolo).sort(),
        MAPA_V1.caracteres.map((s) => s.simbolo).sort()
    );
    assert.ok(V2_FRECUENCIA_MAXIMA_HZ < 21700);
    for (let i = 1; i < frecuencias.length; i++) {
        assert.ok(frecuencias[i] - frecuencias[i - 1] >= V2_PASO_HZ);
    }

    const ventanas = medirVentanas(
        MAPA_V2_CANDIDATO,
        (hz, mapa) => decidirMasCercano(
            hz, mapa, { distanciaMaximaHz: V2_DISTANCIA_MAXIMA_HZ }
        )
    );
    assert.equal(resumirVentanas(ventanas).margenMinimoHz, 39);
});

test('baseline medido: a 44,1 kHz V1 confunde 7, 8 y 9 por aliasing', () => {
    const medicion = medirSistema('v1-clean', { sampleRate: 44100 });

    assert.deepEqual(medicion.fallos, [
        { esperado: '7', decidido: '6' },
        { esperado: '8', decidido: '5' },
        { esperado: '9', decidido: '4' }
    ]);
    assert.equal(medirSistema('v1-clean', { sampleRate: 48000 }).correctos, 38);
});

test('el candidato V2 decodifica todo el alfabeto a 44,1 y 48 kHz', () => {
    for (const sampleRate of [44100, 48000]) {
        const medicion = medirSistema('v2-candidato-a', { sampleRate });

        assert.equal(medicion.correctos, medicion.total);
    }
});

test('la observación de un tono es determinista para la misma semilla', () => {
    const opciones = {
        frecuenciaHz: 20000,
        ganancia: 0.05,
        amplitudRuido: 0.05,
        semilla: 7
    };

    assert.deepEqual(observarTono(opciones), observarTono(opciones));
});

test('equivalencia Doppler: 19 Hz a 20 kHz son unos 0,33 m/s', () => {
    assert.equal(velocidadDopplerEquivalente(19, 20000), 0.33);
});
