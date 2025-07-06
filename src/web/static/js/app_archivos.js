// app_archivos.js
// Aplicación específica para transmisión de archivos por ultrasonido
// Protocolo independiente: 17000-18000 Hz

import { Visualizer } from './fft_visualizer.js';
import { ReceptorBinario } from './receptor_binario.js';

const visualizer = new Visualizer('fft-canvas');

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

    // Inicializar el receptor binario
    window.receptorBinario = new ReceptorBinario();
    window.receptorBinario.setCallbacks(
        // Callback de progreso
        (progreso) => {
            console.log('Progreso:', progreso);
        },
        // Callback de archivo completo
        (archivo) => {
            console.log('Archivo recibido:', archivo);
            addToMessageLog(`Archivo recibido: ${archivo.nombre} (${archivo.tamaño} bytes)`, 'received');
        },
        // Callback de estado
        (estado) => {
            console.log('Estado:', estado);
            if (messagesLog) {
                const now = new Date();
                const time = now.toLocaleTimeString('es-ES', { hour12: false });
                messagesLog.innerHTML = `<span class="msg-time">[${time}]</span> ${estado}`;
            }
        }
    );

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
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.3;
                source.connect(analyser);

                const minFreq = 17000;  // Rango específico para archivos
                const maxFreq = 18000;  // Solo frecuencias de archivos

                function processFrame() {
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