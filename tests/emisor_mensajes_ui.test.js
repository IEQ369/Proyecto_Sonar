import test from 'node:test';
import assert from 'node:assert/strict';

import {
    setupEmisorUI
} from '../src/web/static/js/emisor_ultrasonico.js';

function crearElementoFalso(valor = '') {
    const listeners = new Map();

    return {
        value: valor,
        disabled: false,
        textContent: '',
        selectionStart: valor.length,
        selectionEnd: valor.length,
        style: {},
        listeners,
        addEventListener(tipo, listener) {
            const registrados = listeners.get(tipo) ?? [];
            registrados.push(listener);
            listeners.set(tipo, registrados);
        },
        setSelectionRange(inicio, fin) {
            this.selectionStart = inicio;
            this.selectionEnd = fin;
        }
    };
}

function crearEntornoUI(mensaje = 'SONAR') {
    const elementos = {
        messageInput: crearElementoFalso(mensaje),
        'emisor-status': crearElementoFalso(),
        'transmit-btn': crearElementoFalso(),
        'transmission-status': crearElementoFalso()
    };
    const documento = {
        getElementById(id) {
            return elementos[id] ?? null;
        }
    };

    return { elementos, documento };
}

test('Enter y el botón comparten un único controlador de transmisión', async () => {
    const { elementos, documento } = crearEntornoUI();
    const llamadas = [];
    let completarEmision;
    const emisionPendiente = new Promise((resolve) => {
        completarEmision = resolve;
    });
    const visualizer = {
        modos: [],
        setTransmitMode(modo) {
            this.modos.push(modo);
        }
    };
    const controlador = setupEmisorUI(
        visualizer,
        { current: false },
        {
            documento,
            emitir: async (...argumentos) => {
                llamadas.push(argumentos);
                await emisionPendiente;
            },
            registrarMensaje() {}
        }
    );
    const eventoEnter = {
        key: 'Enter',
        shiftKey: false,
        preventDefault() {}
    };
    const listenerEnter = elementos.messageInput.listeners.get('keydown')[0];
    const listenerBoton = elementos['transmit-btn'].listeners.get('click')[0];

    const primeraTransmision = listenerEnter(eventoEnter);
    const segundoIntento = listenerBoton();

    assert.equal(await segundoIntento, false);
    assert.equal(llamadas.length, 1);
    assert.equal(controlador.estaEnviando(), true);

    completarEmision();
    assert.equal(await primeraTransmision, true);
    assert.equal(controlador.estaEnviando(), false);
    assert.deepEqual(llamadas[0], [
        'SONAR',
        { AMPLITUDE: 0.08, FADE_TIME: 0.035 }
    ]);
});

test('la interfaz informa caracteres no soportados sin iniciar audio', async () => {
    const { elementos, documento } = crearEntornoUI('HOLA!');
    let emisiones = 0;
    const controlador = setupEmisorUI(
        { setTransmitMode() {} },
        { current: false },
        {
            documento,
            emitir: async () => {
                emisiones++;
            },
            registrarMensaje() {}
        }
    );

    const resultado = await controlador.enviarMensaje();

    assert.equal(resultado, false);
    assert.equal(emisiones, 0);
    assert.match(
        elementos['emisor-status'].textContent,
        /Caracteres no soportados: !/
    );
});
