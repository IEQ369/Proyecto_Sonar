import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    CHAR_FREQUENCIES
} from '../protocolo_ultrasonico.js';

export const FRECUENCIAS_CANDIDATAS = Object.freeze([
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    ...Object.values(CHAR_FREQUENCIES)
]);

function medirAmplitudFrecuencia(muestras, frecuenciaHz, sampleRate) {
    let componenteReal = 0;
    let componenteImaginaria = 0;
    const factorAngular = 2 * Math.PI * frecuenciaHz / sampleRate;

    for (let indice = 0; indice < muestras.length; indice++) {
        const angulo = factorAngular * indice;
        componenteReal += muestras[indice] * Math.cos(angulo);
        componenteImaginaria -= muestras[indice] * Math.sin(angulo);
    }

    return 2 * Math.hypot(componenteReal, componenteImaginaria)
        / muestras.length;
}

/**
 * Detector de laboratorio para tonos sintéticos conocidos.
 *
 * Proyecta las muestras contra cada frecuencia candidata y elige la de mayor
 * amplitud. No sustituye al detector FFT de la interfaz de SONAR.
 */
export function detectarTonoReferencia(muestras, opciones = {}) {
    if (!(muestras instanceof Float32Array)) {
        throw new TypeError('El detector requiere muestras Float32Array');
    }

    if (muestras.length === 0) {
        return null;
    }

    const sampleRate = opciones.sampleRate ?? 48000;
    const frecuencias = opciones.frecuencias ?? FRECUENCIAS_CANDIDATAS;
    const rmsMinimo = opciones.rmsMinimo ?? 0.001;
    let sumaCuadrados = 0;

    for (const muestra of muestras) {
        sumaCuadrados += muestra * muestra;
    }

    const rms = Math.sqrt(sumaCuadrados / muestras.length);
    if (rms < rmsMinimo) {
        return null;
    }

    let mejorFrecuenciaHz = null;
    let mejorAmplitud = Number.NEGATIVE_INFINITY;
    let segundaAmplitud = Number.NEGATIVE_INFINITY;

    for (const frecuenciaHz of frecuencias) {
        const amplitud = medirAmplitudFrecuencia(
            muestras,
            frecuenciaHz,
            sampleRate
        );

        if (amplitud > mejorAmplitud) {
            segundaAmplitud = mejorAmplitud;
            mejorAmplitud = amplitud;
            mejorFrecuenciaHz = frecuenciaHz;
        } else if (amplitud > segundaAmplitud) {
            segundaAmplitud = amplitud;
        }
    }

    const confianza = segundaAmplitud > 0
        ? mejorAmplitud / segundaAmplitud
        : Number.POSITIVE_INFINITY;

    return {
        frecuenciaHz: mejorFrecuenciaHz,
        amplitud: mejorAmplitud,
        rms,
        confianza
    };
}
