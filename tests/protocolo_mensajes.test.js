import test from 'node:test';
import assert from 'node:assert/strict';

import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    CHAR_FREQUENCIES,
    charToFrequency,
    frequencyToChar
} from '../src/web/static/js/protocolo_ultrasonico.js';

function secuenciaPara(mensaje) {
    return [
        START_FREQUENCY,
        SYNC_FREQUENCY,
        ...mensaje.split('').map(charToFrequency),
        SYNC_FREQUENCY,
        END_FREQUENCY
    ];
}

test('cada carácter vuelve desde su frecuencia central exacta', () => {
    for (const [caracter, frecuencia] of Object.entries(CHAR_FREQUENCIES)) {
        assert.equal(
            frequencyToChar(frecuencia),
            caracter,
            `${caracter} debe recuperarse desde ${frecuencia} Hz`
        );
    }
});

test('los marcadores no coinciden exactamente con una frecuencia de datos', () => {
    const frecuenciasDatos = new Set(Object.values(CHAR_FREQUENCIES));

    assert.equal(frecuenciasDatos.has(START_FREQUENCY), false);
    assert.equal(frecuenciasDatos.has(SYNC_FREQUENCY), false);
    assert.equal(frecuenciasDatos.has(END_FREQUENCY), false);
});

test('vector conocido para el mensaje A', () => {
    assert.deepEqual(
        secuenciaPara('A'),
        [18500, 19050, 18800, 19050, 19600]
    );
});

test('vector conocido para el mensaje SONAR 01', () => {
    assert.deepEqual(
        secuenciaPara('SONAR 01'),
        [
            18500,
            19050,
            20600,
            20200,
            20100,
            18800,
            20500,
            18600,
            21400,
            21500,
            19050,
            19600
        ]
    );
});

test('el baseline registra 34 pares de ventanas de decisión solapadas', () => {
    const toleranciaHz = 80;
    const entradas = Object.entries(CHAR_FREQUENCIES);
    const solapamientos = [];

    for (let i = 0; i < entradas.length; i++) {
        for (let j = i + 1; j < entradas.length; j++) {
            const [caracterA, frecuenciaA] = entradas[i];
            const [caracterB, frecuenciaB] = entradas[j];
            const distancia = Math.abs(frecuenciaA - frecuenciaB);

            if (distancia <= toleranciaHz * 2) {
                solapamientos.push({ caracterA, caracterB, distancia });
            }
        }
    }

    assert.equal(solapamientos.length, 34);
});

test('el baseline registra frecuencias de datos sobre Nyquist a 44.1 kHz', () => {
    const nyquistHz = 44100 / 2;
    const fueraDeRango = Object.entries(CHAR_FREQUENCIES)
        .filter(([, frecuencia]) => frecuencia > nyquistHz)
        .map(([caracter]) => caracter);

    assert.deepEqual(fueraDeRango, ['7', '8', '9']);
});
