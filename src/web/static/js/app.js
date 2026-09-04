import { Visualizer } from './fft_visualizer.js';
import { frequencyToChar } from './protocolo_ultrasonico.js';
import { setupEmisorUI } from './emisor_ultrasonico.js';
import { ReceptorMensajesCore } from './core/receptor_mensajes_core.js';

const visualizer = new Visualizer('fft-canvas');
const receptorMensajes = new ReceptorMensajesCore();

// estado global para evitar auto eco (patrón chirp)
let isTransmittingRef = { current: false };

document.addEventListener('DOMContentLoaded', function () {
    visualizer.start();

    console.log('=== TEST PROTOCOLO ===');
    console.log('J (19600 Hz):', frequencyToChar(19600));
    console.log('K (19700 Hz):', frequencyToChar(19700));
    console.log('Z (21200 Hz):', frequencyToChar(21200));
    console.log('Ñ (18700 Hz):', frequencyToChar(18700));
    console.log('Frecuencia inexistente (20000 Hz):', frequencyToChar(20000));
    console.log('=====================');

    const startBtn = document.getElementById('start-fft-btn');
    const messagesLog = document.getElementById('messages-log');
    let listeningEffect = null;

    function startListeningEffect() {
        if (!messagesLog) return;
        let showCursor = true;
        function update() {
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES', { hour12: false });
            messagesLog.innerHTML = `<span class="msg-time">[${time}]</span> escuchando<span class="terminal-cursor">${showCursor ? '_' : ''}</span>`;
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
                const minFreq = 18100;
                const maxFreq = 22500;
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
                    for (let i = minBin; i <= maxBin; i++) {
                        const mag = dataArray[i];
                        if (mag > maxMag) {
                            maxMag = mag;
                            maxIdx = i;
                        }
                    }
                    const freqPeak = maxIdx * binSize;
                    const now = performance.now();

                    // evitar auto eco: solo bloquear el procesamiento de mensajes, no la detección
                    if (isTransmittingRef.current) {
                        // seguir mostrando la frecuencia detectada pero no procesar mensajes
                        return;
                    }

                    const evento = receptorMensajes.procesarDeteccion({
                        frecuenciaHz: freqPeak,
                        magnitud: maxMag,
                        tiempoMs: now
                    });

                    if (!evento) {
                        return;
                    }

                    if (evento.tipo === 'inicio') {
                        panelMsg.textContent = '[SYNC]';
                        console.log('START detectado:', freqPeak.toFixed(1), 'Hz');
                    } else if (evento.tipo === 'sincronizado') {
                        panelMsg.textContent = '[DATA]';
                        console.log('SYNC detectado:', freqPeak.toFixed(1), 'Hz');
                    } else if (evento.tipo === 'caracter') {
                        panelMsg.textContent = evento.mensajeParcial;
                        console.log(`Carácter agregado: ${evento.caracter} (${freqPeak.toFixed(1)} Hz)`);
                    } else if (evento.tipo === 'mensaje_completo') {
                        addToMessageLog(evento.mensaje, 'received');
                        panelMsg.textContent = '[RECIBIDO] ' + evento.mensaje;
                        console.log('END detectado, mensaje completo:', evento.mensaje);
                    } else if (evento.tipo === 'timeout') {
                        panelMsg.textContent = '';
                        console.log('Timeout - reiniciando receptor');
                    }
                }
                processFrame();
                startBtn.style.display = 'none';
                startListeningEffect();
            }).catch(err => {
                alert('No se pudo acceder al micrófono: ' + err);
                startBtn.style.display = '';
                if (messagesLog) messagesLog.innerHTML = '<span class="msg-time">[00:00:00]</span> esperando datos...';
                stopListeningEffect();
            });
        });
    } else {
        console.error('No se encontró el botón con id start-fft-btn');
    }

    setupEmisorUI(visualizer, isTransmittingRef);
});

function addToMessageLog(msg, type = 'received') {
    const log = document.getElementById('messages-history');
    if (!log) return;
    const now = new Date();
    const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    const entry = document.createElement('div');
    entry.className = 'msg-log-entry ' + type;
    if (type === 'received') {
        entry.innerHTML = `<span class="msg-time">${time}</span> <span class="msg-type" style="color:#ff184c;font-weight:bold;">[RECEIVED]</span> <span>${msg}</span>`;
        entry.style.borderLeft = '4px solid #ff184c';
        entry.style.padding = '2px 0 2px 8px';
        entry.style.marginBottom = '4px';
        entry.style.fontFamily = 'monospace';
    } else if (type === 'sent') {
        entry.innerHTML = `<span class="msg-time">${time}</span> <span class="msg-type" style="color:#00ff41;font-weight:bold;">[SENT]</span> <span>${msg}</span>`;
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
