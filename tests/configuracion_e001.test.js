import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    charToFrequency,
    SYMBOL_DURATION,
    MARKER_DURATION,
    CHARACTER_GAP
} from '../src/web/static/js/protocolo_ultrasonico.js';

const configUrl = new URL(
    '../docs/experiments/E001-baseline-mensajes/config.json',
    import.meta.url
);
const config = JSON.parse(readFileSync(configUrl, 'utf8'));

test('la configuración E001 coincide con las duraciones del protocolo V1', () => {
    assert.equal(
        config.canonicalSignal.symbolDurationSeconds,
        SYMBOL_DURATION
    );
    assert.equal(
        config.canonicalSignal.markerDurationSeconds,
        MARKER_DURATION
    );
    assert.equal(
        config.canonicalSignal.characterGapSeconds,
        CHARACTER_GAP
    );
});

test('E001 empieza con un canal identidad determinista', () => {
    const identidad = config.channelProfiles.find(
        (profile) => profile.id === 'identity'
    );

    assert.deepEqual(identidad, {
        id: 'identity',
        gain: 1,
        noiseAmplitude: 0,
        delaySamples: 0,
        echoGain: 0
    });
});

test('el perfil actual de Enter solapa los fades de un símbolo', () => {
    const perfilEnter = config.observedTransmitProfiles.enterSetupListener;
    const duracionSimbolo = config.canonicalSignal.symbolDurationSeconds;

    assert.ok(perfilEnter.fadeSeconds * 2 > duracionSimbolo);
});

test('los vectores documentados coinciden con el protocolo ejecutable', () => {
    for (const vector of config.initialVectors) {
        const dataFrequencies = vector.message
            .split('')
            .map(charToFrequency);

        assert.deepEqual(
            vector.frequenciesHz,
            [
                START_FREQUENCY,
                SYNC_FREQUENCY,
                ...dataFrequencies,
                SYNC_FREQUENCY,
                END_FREQUENCY
            ]
        );
    }
});
