// Emisor ultrasónico Web Audio API - Sincronizado con protocolo y mapeo del sistema
// Autor: IA (basado en tu emisor Python)

import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, charToFrequency, SYMBOL_DURATION, MARKER_DURATION, CHARACTER_GAP } from './protocolo_ultrasonico.js';
import { generarOnda } from './generador_onda.js';

/**
 * Emite un mensaje por ultrasonido usando el protocolo SONAR, generando la onda manualmente (senoidal pura).
 * @param {string} mensaje - Mensaje en mayúsculas (A-Z, 0-9)
 * @param {object} [opts] - Opciones avanzadas (duraciones, amplitud)
 */
export async function emitirUltrasonico(mensaje, opts = {}) {
    // Filtrar mensaje: solo A-Z, 0-9 y espacio
    mensaje = mensaje.replace(/[^A-Z0-9 ]/g, '');
    const SAMPLE_RATE = opts.SAMPLE_RATE || 48000;
    const AMPLITUDE = opts.AMPLITUDE || 0.9;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });

    // Secuencia de frecuencias según protocolo
    const secuencia = [
        START_FREQUENCY,         // START
        SYNC_FREQUENCY,          // SYNC inicial
        ...mensaje.split('').map(c => charToFrequency(c)),
        SYNC_FREQUENCY,          // SYNC final
        END_FREQUENCY            // END
    ];
    // Duraciones por símbolo
    const duraciones = secuencia.map(f =>
        (f === START_FREQUENCY || f === SYNC_FREQUENCY || f === END_FREQUENCY) ? MARKER_DURATION : SYMBOL_DURATION
    );

    let now = audioCtx.currentTime;
    for (let i = 0; i < secuencia.length; i++) {
        const freq = secuencia[i];
        const dur = duraciones[i];
        // Tono principal
        generarOnda({
            frecuencia: freq,
            duracion: dur,
            tipo: 'sine',
            amplitud: AMPLITUDE,
            sampleRate: SAMPLE_RATE,
            audioCtx: audioCtx
        });
        // Tono paralelo (solo para datos, no marcadores)
        if (freq !== START_FREQUENCY && freq !== SYNC_FREQUENCY && freq !== END_FREQUENCY) {
            generarOnda({
                frecuencia: freq + 35,
                duracion: dur,
                tipo: 'sine',
                amplitud: AMPLITUDE * 0.5,
                sampleRate: SAMPLE_RATE,
                audioCtx: audioCtx
            });
        }
        now += dur;
        if (i > 1 && i < secuencia.length - 2 && dur === SYMBOL_DURATION) {
            now += CHARACTER_GAP;
            await new Promise(res => setTimeout(res, CHARACTER_GAP * 1000));
        }
        await new Promise(res => setTimeout(res, dur * 1000));
    }
    setTimeout(() => audioCtx.close(), 200);
} 