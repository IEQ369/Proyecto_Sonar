import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ReceptorMensajesCore
} from '../src/web/static/js/core/receptor_mensajes_core.js';

const MAGNITUD_VALIDA = 100;

function alimentarFrecuenciaEstable(receptor, frecuenciaHz, tiempoInicialMs) {
    let evento = null;

    for (let indice = 0; indice < 3; indice++) {
        evento = receptor.procesarDeteccion({
            frecuenciaHz,
            magnitud: MAGNITUD_VALIDA,
            tiempoMs: tiempoInicialMs + indice * 10
        });
    }

    return evento;
}

test('el receptor inicia esperando START', () => {
    const receptor = new ReceptorMensajesCore();

    assert.equal(receptor.estado, 'IDLE');
});

test('el receptor inicia con el buffer vacío', () => {
    const receptor = new ReceptorMensajesCore();

    assert.equal(receptor.buffer, '');
});

test('una detección aislada de START no cambia el estado', () => {
    const receptor = new ReceptorMensajesCore();

    const evento = receptor.procesarDeteccion({
        frecuenciaHz: 18500,
        magnitud: MAGNITUD_VALIDA,
        tiempoMs: 0
    });

    assert.equal(evento, null);
    assert.equal(receptor.estado, 'IDLE');
});

test('tres detecciones estables de START cambian el estado a SYNC', () => {
    const receptor = new ReceptorMensajesCore();

    const evento = alimentarFrecuenciaEstable(receptor, 18500, 0);

    assert.equal(evento.tipo, 'inicio');
    assert.equal(receptor.estado, 'SYNC');
});

test('START seguido de SYNC prepara la recepción de datos', () => {
    const receptor = new ReceptorMensajesCore();

    alimentarFrecuenciaEstable(receptor, 18500, 0);
    const evento = alimentarFrecuenciaEstable(receptor, 19050, 30);

    assert.equal(evento.tipo, 'sincronizado');
    assert.equal(receptor.estado, 'DATA');
});

test('el receptor reconstruye el mensaje A y vuelve a IDLE', () => {
    const receptor = new ReceptorMensajesCore();

    alimentarFrecuenciaEstable(receptor, 18500, 0);
    alimentarFrecuenciaEstable(receptor, 19050, 30);
    const eventoCaracter = alimentarFrecuenciaEstable(receptor, 18800, 60);
    const eventoFinal = alimentarFrecuenciaEstable(receptor, 19600, 90);

    assert.equal(eventoCaracter.tipo, 'caracter');
    assert.equal(eventoCaracter.caracter, 'A');
    assert.equal(eventoFinal.tipo, 'mensaje_completo');
    assert.equal(eventoFinal.mensaje, 'A');
    assert.equal(receptor.estado, 'IDLE');
    assert.equal(receptor.buffer, '');
});

test('una señal débil no inicia el receptor', () => {
    const receptor = new ReceptorMensajesCore();

    for (let indice = 0; indice < 3; indice++) {
        receptor.procesarDeteccion({
            frecuenciaHz: 18500,
            magnitud: 5,
            tiempoMs: indice * 10
        });
    }

    assert.equal(receptor.estado, 'IDLE');
});

test('un timeout cancela una recepción incompleta', () => {
    const receptor = new ReceptorMensajesCore();

    alimentarFrecuenciaEstable(receptor, 18500, 0);
    const evento = receptor.procesarDeteccion({
        frecuenciaHz: Number.NaN,
        magnitud: 0,
        tiempoMs: 2101
    });

    assert.equal(evento.tipo, 'timeout');
    assert.equal(receptor.estado, 'IDLE');
    assert.equal(receptor.buffer, '');
});
