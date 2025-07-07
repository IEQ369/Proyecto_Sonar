// Emisor ultrasónico Web Audio API - Sincronizado con protocolo y mapeo del sistema
// Autor: IA (basado en tu emisor Python)

import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, charToFrequency, SYMBOL_DURATION, MARKER_DURATION, CHARACTER_GAP } from './protocolo_ultrasonico.js';
import { generarOnda } from './generador_onda.js';

/**
 * Obtiene la amplitud específica para un carácter
 * Aumenta el volumen para caracteres problemáticos (números y algunas letras)
 */
function getAmplitudPorCaracter(caracter, amplitudBase = 0.15) {
    const caracterUpper = caracter.toUpperCase();

    // Números: máxima amplitud (frecuencias muy altas)
    if ('0123456789'.includes(caracterUpper)) {
        // Números 6-9: amplitud extra alta (frecuencias ultra-altas)
        if ('6789'.includes(caracterUpper)) {
            return amplitudBase * 3.5; // 350% del volumen normal
        }
        // Números 0-5: amplitud alta
        return amplitudBase * 2.5; // 250% del volumen normal
    }

    // Letras problemáticas: amplitud aumentada
    if ('CDIÑYZOU'.includes(caracterUpper)) {
        return amplitudBase * 1.8; // 180% del volumen normal
    }

    // Letras en frecuencias altas: amplitud moderadamente aumentada
    if ('VWXYZ'.includes(caracterUpper)) {
        return amplitudBase * 1.4; // 140% del volumen normal
    }

    // Resto de letras: amplitud normal
    return amplitudBase;
}

/**
 * Emite un mensaje por ultrasonido usando el protocolo SONAR, generando la onda manualmente (senoidal pura).
 * @param {string} mensaje - Mensaje en mayúsculas (A-Z, 0-9)
 * @param {object} [opts] - Opciones avanzadas (duraciones, amplitud)
 */
export async function emitirUltrasonico(mensaje, opts = {}) {
    mensaje = mensaje.replace(/[^A-Z0-9Ñ ]/g, '');

    const AMPLITUDE = opts.AMPLITUDE || 0.15;
    const FADE_TIME = opts.FADE_TIME || 0.025;
    const SAMPLE_RATE = opts.SAMPLE_RATE || 48000;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });

    const secuencia = [
        START_FREQUENCY,
        SYNC_FREQUENCY,
        ...mensaje.split('').map(c => charToFrequency(c)),
        SYNC_FREQUENCY,
        END_FREQUENCY
    ];

    const duraciones = secuencia.map(f =>
        (f === START_FREQUENCY || f === SYNC_FREQUENCY || f === END_FREQUENCY) ? MARKER_DURATION : SYMBOL_DURATION
    );

    console.log('=== EMISION ULTRASONICA ===');
    console.log('Mensaje:', mensaje);

    let now = audioCtx.currentTime;
    for (let i = 0; i < secuencia.length; i++) {
        const freq = secuencia[i];
        const dur = duraciones[i];
        const esControl = freq === START_FREQUENCY || freq === SYNC_FREQUENCY || freq === END_FREQUENCY;

        let amplitud;
        if (esControl) {
            amplitud = AMPLITUDE * 1.2; // Control: amplitud aumentada
        } else {
            // Para caracteres de datos, usar amplitud específica por carácter
            const caracter = mensaje[i - 2]; // -2 porque los primeros 2 son START y SYNC
            amplitud = getAmplitudPorCaracter(caracter, AMPLITUDE);
        }

        generarOnda({
            frecuencia: freq,
            duracion: dur,
            tipo: 'sine',
            amplitud: amplitud,
            sampleRate: SAMPLE_RATE,
            audioCtx: audioCtx,
            fadeTime: FADE_TIME
        });

        console.log(`Tono ${i}: ${freq}Hz (${dur}s)`);

        now += dur;
        if (i > 1 && i < secuencia.length - 2 && dur === SYMBOL_DURATION) {
            now += CHARACTER_GAP;
            await new Promise(res => setTimeout(res, CHARACTER_GAP * 1000));
        }
        await new Promise(res => setTimeout(res, dur * 1000));
    }

    console.log('=== EMISION COMPLETADA ===');
    setTimeout(() => audioCtx.close(), 200);
}

export function setupEmisorUI(visualizer, isTransmittingRef) {
    const input = document.getElementById('messageInput');
    const status = document.getElementById('emisor-status');
    let isSending = false;

    if (input && status) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function sendMessage() {
        if (isSending) return;
        const val = input.value.trim().toUpperCase();
        if (val) {
            isSending = true;
            input.disabled = true;
            status.textContent = 'enviando...';
            visualizer.setTransmitMode(true);

            // activar estado de transmisión para evitar auto eco
            isTransmittingRef.current = true;
            console.log('transmision iniciada - bloqueando recepcion');

            // mostrar indicador visual de transmisión
            const transmissionStatus = document.getElementById('transmission-status');
            if (transmissionStatus) {
                transmissionStatus.style.display = 'block';
            }

            emitirUltrasonico(val, { AMPLITUDE: 0.08, FADE_TIME: 0.035 })
                .then(() => {
                    status.textContent = 'mensaje enviado';
                    input.value = '';
                })
                .catch((err) => {
                    console.error('Error al emitir:', err);
                    status.textContent = 'error al emitir';
                })
                .finally(() => {
                    isSending = false;
                    input.disabled = false;
                    visualizer.setTransmitMode(false);

                    // desactivar estado de transmisión
                    isTransmittingRef.current = false;
                    console.log('transmision terminada - permitiendo recepcion');

                    // ocultar indicador visual de transmisión
                    const transmissionStatus = document.getElementById('transmission-status');
                    if (transmissionStatus) {
                        transmissionStatus.style.display = 'none';
                    }
                });
        }
    }
} 