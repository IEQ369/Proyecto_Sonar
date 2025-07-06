// Emisor binario por ultrasonido
// Protocolo: START, bits (F0/F1), END

import { generarOnda } from './generador_onda.js';
import { archivoToSecuencia, calcularProgreso, obtenerInfoTransmision, BINARY_PROTOCOL } from './protocolo_binario.js';

// Usar las constantes del protocolo binario
const BIT_DURATION = BINARY_PROTOCOL.SYMBOL_DURATION;
const MARKER_DURATION = BINARY_PROTOCOL.MARKER_DURATION;
const GAP = BINARY_PROTOCOL.CHARACTER_GAP;
const AMPLITUDE = 0.15;
const FADE_TIME = 0.025;
const SAMPLE_RATE = 48000;

export function arrayBufferToBits(buffer) {
    const bytes = new Uint8Array(buffer);
    let bits = '';
    for (let byte of bytes) {
        bits += byte.toString(2).padStart(8, '0');
    }
    return bits;
}

/**
 * Emite un archivo por ultrasonido usando protocolo binario
 * @param {File} archivo - Archivo a transmitir
 * @param {Object} opts - Opciones de transmisión
 * @param {Function} onProgreso - Callback para actualizar progreso
 */
export async function emitirArchivoBinario(archivo, opts = {}, onProgreso = null) {
    const AMPLITUDE = opts.AMPLITUDE || 0.15;
    const FADE_TIME = opts.FADE_TIME || 0.025;
    const SAMPLE_RATE = opts.SAMPLE_RATE || 48000;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const secuencia = archivoToSecuencia(archivo);
    const info = obtenerInfoTransmision(archivo);

    console.log('=== EMISION ARCHIVO BINARIO ===');
    console.log('Archivo:', info.nombre);
    console.log('Tamaño:', info.tamaño, 'bytes');
    console.log('Bits:', info.bits);
    console.log('Símbolos:', info.simbolos);
    console.log('Duración estimada:', info.duracionEstimada.toFixed(2), 's');

    let now = audioCtx.currentTime;

    for (let i = 0; i < secuencia.length; i++) {
        const simbolo = secuencia[i];
        const esControl = simbolo.tipo === 'control';
        const amplitud = esControl ? AMPLITUDE * 1.2 : AMPLITUDE;

        generarOnda({
            frecuencia: simbolo.freq,
            duracion: simbolo.duracion,
            tipo: 'sine',
            amplitud: amplitud,
            sampleRate: SAMPLE_RATE,
            audioCtx: audioCtx,
            fadeTime: FADE_TIME
        });

        // Log detallado para debugging
        if (simbolo.tipo === 'bit') {
            console.log(`Bit ${simbolo.bitIndex} del byte ${simbolo.byteIndex}: ${simbolo.bit} (${simbolo.freq}Hz)`);
        } else {
            console.log(`Control: ${simbolo.freq}Hz (${simbolo.duracion}s)`);
        }

        // Actualizar progreso
        if (onProgreso) {
            const progreso = calcularProgreso(secuencia, i);
            const bytesTransmitidos = Math.floor((i - 2) / 8); // -2 por START+SYNC
            onProgreso({
                progreso: progreso,
                simboloActual: i + 1,
                totalSimbolos: secuencia.length,
                bytesTransmitidos: Math.max(0, bytesTransmitidos),
                totalBytes: info.bytes,
                simbolo: simbolo
            });
        }

        now += simbolo.duracion;

        // Gap entre bytes (no entre bits del mismo byte)
        if (simbolo.tipo === 'bit' && simbolo.bitIndex === 7 && simbolo.byteIndex < info.bytes - 1) {
            await new Promise(res => setTimeout(res, 0.02 * 1000));
            now += 0.02;
        }

        await new Promise(res => setTimeout(res, simbolo.duracion * 1000));
    }

    console.log('=== EMISION ARCHIVO COMPLETADA ===');

    // Esperar confirmación del receptor
    console.log('Esperando confirmación...');
    const confirmacion = await esperarConfirmacion();

    if (confirmacion === 'ACK') {
        console.log('Archivo confirmado por receptor');
    } else if (confirmacion === 'NACK') {
        console.log('Archivo rechazado por receptor - reintentando...');
        // Aquí podrías implementar reintento
    } else {
        console.log('Timeout - no se recibió confirmación');
    }

    setTimeout(() => audioCtx.close(), 200);
}

/**
 * Espera confirmación del receptor
 */
async function esperarConfirmacion() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve('TIMEOUT');
        }, BINARY_PROTOCOL.TIMEOUT_ACK);

        // Escuchar confirmación
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        function checkConfirmacion() {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            const binSize = audioCtx.sampleRate / analyser.fftSize;
            const ackBin = Math.floor(BINARY_PROTOCOL.ACK / binSize);
            const nackBin = Math.floor(BINARY_PROTOCOL.NACK / binSize);

            if (dataArray[ackBin] > 12) {
                clearTimeout(timeout);
                audioCtx.close();
                resolve('ACK');
            } else if (dataArray[nackBin] > 12) {
                clearTimeout(timeout);
                audioCtx.close();
                resolve('NACK');
            } else {
                requestAnimationFrame(checkConfirmacion);
            }
        }

        checkConfirmacion();
    });
}

/**
 * Configura la UI del emisor de archivos
 * @param {Function} onProgreso - Callback para actualizar progreso en UI
 */
export function setupEmisorArchivoUI(onProgreso = null) {
    const archivoTransmitBtn = document.getElementById('archivo-transmit-btn');
    const archivoProgressContainer = document.getElementById('archivo-progress-container');
    const archivoProgressBar = document.getElementById('archivo-progress-bar');
    const archivoProgressPercent = document.getElementById('archivo-progress-percent');
    const archivoProgressBytes = document.getElementById('archivo-progress-bytes');
    const archivoProgressSpeed = document.getElementById('archivo-progress-speed');
    const archivoProgressText = document.querySelector('.archivo-progress-text');

    let archivoSeleccionado = null;

    // Obtener archivo seleccionado del DOM
    const archivoInput = document.getElementById('archivo-input');
    archivoInput.addEventListener('change', (e) => {
        archivoSeleccionado = e.target.files[0];
    });

    if (archivoTransmitBtn) {
        archivoTransmitBtn.addEventListener('click', async () => {
            if (!archivoSeleccionado) return;

            archivoTransmitBtn.disabled = true;
            archivoProgressContainer.style.display = 'block';
            archivoProgressText.textContent = 'transmitiendo archivo...';

            const startTime = performance.now();
            let lastBytes = 0;
            let lastTime = startTime;

            try {
                await emitirArchivoBinario(archivoSeleccionado, {
                    AMPLITUDE: 0.08,
                    FADE_TIME: 0.035
                }, (progreso) => {
                    // Actualizar barra de progreso
                    archivoProgressBar.style.width = progreso.progreso + '%';
                    archivoProgressPercent.textContent = progreso.progreso + '%';
                    archivoProgressBytes.textContent = `${progreso.bytesTransmitidos} / ${progreso.totalBytes} bytes`;

                    // Calcular velocidad
                    const now = performance.now();
                    const timeDiff = (now - lastTime) / 1000;
                    const bytesDiff = progreso.bytesTransmitidos - lastBytes;
                    const speed = timeDiff > 0 ? Math.round(bytesDiff / timeDiff * 8) : 0;
                    archivoProgressSpeed.textContent = `${speed} bps`;

                    lastBytes = progreso.bytesTransmitidos;
                    lastTime = now;
                });

                archivoProgressText.textContent = 'archivo transmitido';
                setTimeout(() => {
                    archivoProgressContainer.style.display = 'none';
                    archivoTransmitBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error al transmitir archivo:', error);
                archivoProgressText.textContent = 'error en transmisión';
                archivoTransmitBtn.disabled = false;
            }
        });
    }
}