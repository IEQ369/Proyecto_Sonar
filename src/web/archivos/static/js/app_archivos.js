// app_archivos.js
// Aplicación específica para transmisión de archivos por ultrasonido
// Protocolo robusto: preámbulo, SOI, cabecera con CRC, datos, END

import { Visualizer } from '../../../static/js/fft_visualizer.js';
import { ReceptorArchivos } from './receptor_archivos.js';
import { setupEmisorArchivoUI } from './emisor_archivos.js';

const visualizer = new Visualizer('fft-canvas');

let receptorArchivos = null;

document.addEventListener('DOMContentLoaded', function () {
    visualizer.start();

    console.log('=== SISTEMA DE ARCHIVOS ULTRASÓNICOS ===');
    console.log('Protocolo robusto: 18500-19600 Hz');
    console.log('Frecuencias: START(18500), SYNC(18700), DATA_0(18900), DATA_1(19100), END(19300), ACK(19500)');
    console.log('==========================================');

    const startBtn = document.getElementById('start-fft-btn');
    const messagesLog = document.getElementById('messages-log');
    let listeningEffect = null;

    // Inicializar el receptor robusto para archivos
    receptorArchivos = new ReceptorArchivos();
    window.receptorArchivos = receptorArchivos;
    receptorArchivos.setCallbacks(
        // onProgreso
        function ({ progreso, bloquesRecibidos, totalBloques, bytesRecibidos, totalBytes }) {
            document.getElementById('feedback-receptor-archivos').style.display = 'block';
            let barra = document.getElementById('barra-progreso-receptor-archivos');
            barra.style.width = progreso + '%';
        },
        // onArchivoCompleto
        function (archivo) {
            let descarga = document.getElementById('descarga-archivo-receptor');
            const url = URL.createObjectURL(archivo.datos);
            descarga.innerHTML = `<a id="enlace-descarga-auto" href="${url}" download="${archivo.nombre}" style="color: #00ff41; text-decoration: none; font-family: monospace;">descargar archivo recibido (${archivo.nombre})</a>`;
            addToMessageLog(`Archivo recibido: ${archivo.nombre} (${archivo.tamaño} bytes)`, 'received');
            // descarga automática
            const enlace = document.getElementById('enlace-descarga-auto');
            if (enlace) {
                setTimeout(() => {
                    enlace.click();
                }, 300); // pequeño retardo para asegurar que el DOM esté listo
            }
        },
        // onEstado
        function (mensaje) {
            document.getElementById('feedback-receptor-archivos').style.display = 'block';
            document.getElementById('estado-receptor-archivos').textContent = mensaje;
            if (mensaje.startsWith('error')) {
                document.getElementById('barra-progreso-receptor-archivos').style.background = '#f44336';
            } else {
                document.getElementById('barra-progreso-receptor-archivos').style.background = '#4caf50';
            }
            if (mensaje.includes('timeout') || mensaje.includes('esperando archivo')) {
                document.getElementById('barra-progreso-receptor-archivos').style.width = '0%';
                document.getElementById('descarga-archivo-receptor').innerHTML = '';
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

                const minFreq = 18000;  // Rango ampliado para pruebas
                const maxFreq = 20000;

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

                    // Solo procesar frecuencias en el rango de archivos con umbral más alto
                    if (maxMag < 8 || freqPeak < minFreq || freqPeak > maxFreq) return;
                    console.log('Detectada frecuencia:', freqPeak, 'Magnitud:', maxMag, 'Avg:', avg);
                    if (maxMag > avg * 1.5) {
                        if (receptorArchivos) {
                            console.log('Llamando a procesarFrecuencia con', freqPeak, maxMag);
                            receptorArchivos.procesarFrecuencia(freqPeak, maxMag);
                        }
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

    // Configurar UI del emisor de archivos
    setupEmisorArchivoUI();
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