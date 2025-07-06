// app.js - Sistema de archivos
// Aplicación específica para transmisión de archivos por ultrasonido
// Protocolo independiente: 17000-18000 Hz

import { Visualizer } from '/static/js/fft_visualizer.js';
import { ReceptorBinario } from '/static/js/receptor_binario.js';
import { emitirArchivoBinario } from '/static/js/emisor_binario.js';

const visualizer = new Visualizer('fft-canvas');

// Variables globales para control de transmisión
let transmisionEnCurso = false;
let audioCtxActual = null;
let transmisionCancelada = false;
let transmisionFinalizada = false;

document.addEventListener('DOMContentLoaded', function () {
    visualizer.start();

    console.log('=== SISTEMA DE ARCHIVOS ULTRASÓNICOS ===');
    console.log('Protocolo: 17000-18000 Hz');
    console.log('Frecuencias: START(17000), SYNC(17500), END(18000)');
    console.log('Bits: F0(17100), F1(17600)');
    console.log('Confirmación: ACK(17200), NACK(17700)');
    console.log('==========================================');

    const startBtn = document.getElementById('start-fft-btn');
    const messagesLog = document.getElementById('messages-log');
    let listeningEffect = null;

    function startListeningEffect() {
        if (!messagesLog) return;
        let showCursor = true;
        function update() {
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES', { hour12: false });
            messagesLog.innerHTML = `<span class="msg-time">[${time}]</span> escuchando archivos<span class="terminal-cursor">${showCursor ? '_' : ''}</span>`;
            showCursor = !showCursor;
            listeningEffect = setTimeout(update, 600);
        }
        update();
    }
    function stopListeningEffect() {
        if (listeningEffect) clearTimeout(listeningEffect);
    }

    const panelMsg = document.createElement('div');
    panelMsg.id = 'panel-msg';
    panelMsg.style = 'margin-top:1rem;color:#0ff;font-family:monospace;font-size:1.1rem;word-break:break-all;';
    if (messagesLog && messagesLog.parentElement) {
        messagesLog.parentElement.appendChild(panelMsg);
    }

    if (startBtn) {
        startBtn.addEventListener('click', function () {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                audioCtxActual = new (window.AudioContext || window.webkitAudioContext)();
                const audioCtx = audioCtxActual;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.3;
                source.connect(analyser);

                const minFreq = 17000;  // Rango específico para archivos
                const maxFreq = 18000;  // Solo frecuencias de archivos

                function processFrame() {
                    if (transmisionCancelada) return;
                    requestAnimationFrame(processFrame);
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(dataArray);

                    visualizer.drawSpectrum({
                        data: Array.from(dataArray),
                        minFreq: 0,
                        maxFreq: 22500,
                        sampleRate: audioCtx.sampleRate,
                        fftSize: analyser.fftSize
                    });

                    if (!messagesLog) return;
                    const binSize = audioCtx.sampleRate / analyser.fftSize;
                    const minBin = Math.floor(minFreq / binSize);
                    const maxBin = Math.ceil(maxFreq / binSize);
                    let maxMag = 0;
                    let maxIdx = -1;
                    let sum = 0;
                    let count = 0;

                    for (let i = minBin; i <= maxBin; i++) {
                        const mag = dataArray[i];
                        sum += mag;
                        count++;
                        if (mag > maxMag) {
                            maxMag = mag;
                            maxIdx = i;
                        }
                    }

                    const avg = sum / count;
                    const freqPeak = maxIdx * binSize;

                    if (panelMsg) {
                        panelMsg.textContent = `Freq: ${freqPeak.toFixed(1)} Hz | Mag: ${maxMag} | Avg: ${avg.toFixed(1)} | Rango: ${minFreq}-${maxFreq} Hz`;
                    }

                    // Solo procesar frecuencias en el rango de archivos
                    if (maxMag < 12 || freqPeak < minFreq || freqPeak > maxFreq) return;

                    // Procesar con receptor binario
                    if (window.receptorBinario) {
                        window.receptorBinario.procesarFrecuencia(freqPeak, maxMag);
                    }
                }

                processFrame();
                startBtn.style.display = 'none';
                startListeningEffect();

            }).catch(err => {
                alert('No se pudo acceder al micrófono: ' + err);
                startBtn.style.display = '';
                if (messagesLog) messagesLog.innerHTML = '<span class="msg-time">[00:00:00]</span> esperando archivos...';
                stopListeningEffect();
            });
        });
    } else {
        console.error('No se encontró el botón con id start-fft-btn');
    }

    // --- Cancelación robusta de transmisión ---
    function cancelarTransmision() {
        transmisionCancelada = true;
        transmisionEnCurso = false;
        if (audioCtxActual && audioCtxActual.state !== 'closed') {
            audioCtxActual.close();
        }
        if (panelMsg) {
            panelMsg.textContent = '[CANCELADO]';
            panelMsg.style.color = '#ff184c';
        }
    }

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && transmisionEnCurso && !transmisionFinalizada) {
            cancelarTransmision();
        }
    });
    window.addEventListener('pagehide', () => {
        if (transmisionEnCurso && !transmisionFinalizada) {
            cancelarTransmision();
        }
    });

    // --- Mejorar feedback de transmisión ---
    // Interceptar la función emitirArchivoBinario para mostrar estado final
    const archivoTransmitBtn = document.getElementById('archivo-transmit-btn');
    if (archivoTransmitBtn) {
        archivoTransmitBtn.addEventListener('click', async () => {
            transmisionEnCurso = true;
            transmisionCancelada = false;
            transmisionFinalizada = false;
            // ... código de selección de archivo ...
            try {
                const resultado = await emitirArchivoBinario(archivoSeleccionado, {
                    AMPLITUDE: 0.08,
                    FADE_TIME: 0.035
                }, (progreso) => {
                    // ... actualizar progreso ...
                });
                transmisionFinalizada = true;
                if (resultado === 'ACK') {
                    panelMsg.textContent = '[ARCHIVO ENVIADO CORRECTAMENTE]';
                    panelMsg.style.color = '#00ff41';
                } else if (resultado === 'NACK') {
                    panelMsg.textContent = '[ERROR: RECEPTOR RECHAZÓ EL ARCHIVO]';
                    panelMsg.style.color = '#ff184c';
                } else {
                    panelMsg.textContent = '[ERROR: NO SE RECIBIÓ CONFIRMACIÓN]';
                    panelMsg.style.color = '#ff184c';
                }
            } catch (e) {
                transmisionFinalizada = true;
                panelMsg.textContent = '[ERROR AL ENVIAR ARCHIVO]';
                panelMsg.style.color = '#ff184c';
            }
            transmisionEnCurso = false;
        });
    }
});

function addToMessageLog(msg, type = 'received') {
    const log = document.getElementById('messages-history');
    if (!log) return;
    const now = new Date();
    const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    const entry = document.createElement('div');
    entry.className = 'msg-log-entry ' + type;
    if (type === 'received') {
        entry.innerHTML = `<span class="msg-time">${time}</span> <span class="msg-type" style="color:#ff184c;font-weight:bold;">[ARCHIVO]</span> <span>${msg}</span>`;
        entry.style.borderLeft = '4px solid #ff184c';
        entry.style.padding = '2px 0 2px 8px';
        entry.style.marginBottom = '4px';
        entry.style.fontFamily = 'monospace';
    } else if (type === 'sent') {
        entry.innerHTML = `<span class="msg-time">${time}</span> <span class="msg-type" style="color:#00ff41;font-weight:bold;">[ENVIADO]</span> <span>${msg}</span>`;
        entry.style.borderLeft = '4px solid #00ff41';
        entry.style.padding = '2px 0 2px 8px';
        entry.style.marginBottom = '4px';
        entry.style.fontFamily = 'monospace';
    }
    if (log.firstChild) {
        log.insertBefore(entry, log.firstChild);
    } else {
        log.appendChild(entry);
    }
}
window.addToMessageLog = addToMessageLog; 