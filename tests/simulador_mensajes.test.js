import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calcularDistanciaEdicion,
    calcularMetricasMensaje
} from '../src/web/static/js/core/metricas_mensajes.js';
import {
    aplicarCanalSimulado
} from '../src/web/static/js/simulacion/canal_simulado.js';
import {
    detectarTonoReferencia
} from '../src/web/static/js/simulacion/detector_tonos_referencia.js';
import {
    crearPlanMensajeSintetico,
    generarMensajeSintetico
} from '../src/web/static/js/simulacion/emisor_mensajes_sintetico.js';
import {
    simularMensaje
} from '../src/web/static/js/simulacion/simulador_mensajes.js';

test('el plan sintético A contiene marcadores, dato y silencio', () => {
    const plan = crearPlanMensajeSintetico('A');

    assert.equal(plan.mensaje, 'A');
    assert.deepEqual(
        plan.segmentos.map((segmento) => segmento.rol),
        ['START', 'SYNC_INICIAL', 'DATA', 'GAP', 'SYNC_FINAL', 'END']
    );
});

test('el emisor sintético normaliza la entrada y conserva 21120 muestras para A', () => {
    const transmision = generarMensajeSintetico('a');

    assert.equal(transmision.mensaje, 'A');
    assert.equal(transmision.muestras.length, 21120);
});

test('el emisor sintético no elimina silenciosamente caracteres desconocidos', () => {
    assert.throws(
        () => generarMensajeSintetico('a!'),
        /Caracteres no soportados: !/
    );
});

test('el detector de referencia recupera una frecuencia sintética', () => {
    const transmision = generarMensajeSintetico('A');
    const segmentoA = transmision.segmentos.find(
        (segmento) => segmento.rol === 'DATA'
    );
    const muestrasA = transmision.muestras.slice(
        segmentoA.muestraInicial,
        segmentoA.muestraFinal
    );
    const deteccion = detectarTonoReferencia(muestrasA, {
        sampleRate: transmision.sampleRate
    });

    assert.equal(deteccion.frecuenciaHz, 18800);
    assert.ok(deteccion.confianza > 1);
});

test('el ruido del canal es reproducible con la misma semilla', () => {
    const entrada = new Float32Array([0, 0.25, -0.5, 0.75]);
    const opciones = {
        ganancia: 0.8,
        amplitudRuido: 0.05,
        semilla: 369
    };

    const primera = aplicarCanalSimulado(entrada, opciones);
    const segunda = aplicarCanalSimulado(entrada, opciones);

    assert.deepEqual(primera, segunda);
    assert.notDeepEqual(primera, entrada);
});

test('la distancia de edición cuenta sustituciones, omisiones e inserciones', () => {
    assert.equal(calcularDistanciaEdicion('SONAR', 'SONAR'), 0);
    assert.equal(calcularDistanciaEdicion('SONAR', 'SOMAR'), 1);
    assert.equal(calcularDistanciaEdicion('SONAR', 'SONA'), 1);
    assert.equal(calcularDistanciaEdicion('SONAR', 'SONARR'), 1);
});

test('SER es cero cuando todos los símbolos coinciden', () => {
    const metricas = calcularMetricasMensaje('SONAR', 'SONAR');

    assert.equal(metricas.erroresSimbolo, 0);
    assert.equal(metricas.ser, 0);
    assert.equal(metricas.mensajeCorrecto, true);
});

test('la simulación ideal recupera A con SER igual a cero', () => {
    const resultado = simularMensaje('A');

    assert.equal(resultado.mensajeRecibido, 'A');
    assert.equal(resultado.metricas.ser, 0);
    assert.equal(resultado.metricas.mensajeCorrecto, true);
});

test('la simulación ideal recupera SONAR 01 con SER igual a cero', () => {
    const resultado = simularMensaje('SONAR 01');

    assert.equal(resultado.mensajeRecibido, 'SONAR 01');
    assert.equal(resultado.metricas.ser, 0);
});

test('la simulación ideal recupera caracteres consecutivos iguales', () => {
    const resultado = simularMensaje('AA');

    assert.equal(resultado.mensajeRecibido, 'AA');
    assert.equal(resultado.metricas.erroresSimbolo, 0);
    assert.equal(resultado.metricas.ser, 0);
});
