import { Visualizer } from './fft_visualizer.js';

const visualizer = new Visualizer('fft-canvas');

import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, MIN_DATA_FREQUENCY, MAX_DATA_FREQUENCY, FREQUENCY_STEP, CHAR_FREQUENCIES, charToFrequency, frequencyToChar, SYMBOL_DURATION, CHARACTER_GAP } from './protocolo_ultrasonico.js';
import { emitirUltrasonico, setupEmisorUI } from './emisor_ultrasonico.js';

const PROTO = {
    START: START_FREQUENCY,
    SYNC: SYNC_FREQUENCY,
    END: END_FREQUENCY,
    MIN_DATA: MIN_DATA_FREQUENCY,
    MAX_DATA: MAX_DATA_FREQUENCY,
    STEP: FREQUENCY_STEP,
    TOLERANCE: 60
};

let rxState = 'IDLE';
let rxBuffer = '';
let lastChar = '';
let lastSymbolTime = 0;
let lastDetectedFreq = 0;
let lastPanelMsg = '';
let startDetected = false;
let syncDetected = false;

let freqHistory = [];
const HISTORY_SIZE = 5;
function updateFreqHistory(freq) {
    freqHistory.push(freq);
    if (freqHistory.length > HISTORY_SIZE) freqHistory.shift();
}
function isStableFrequency(targetFreq) {
    return freqHistory.filter(f => Math.abs(f - targetFreq) < PROTO.TOLERANCE).length >= 3;
}

const SYMBOL_LOCKOUT_MS = (SYMBOL_DURATION + CHARACTER_GAP) * 1000;

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
                let lastUltrasound = 0;
                let lastMsg = '';
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
                        panelMsg.textContent = `Freq: ${freqPeak.toFixed(1)} Hz | Mag: ${maxMag} | Avg: ${avg.toFixed(1)} | State: ${rxState} | Buffer: ${rxBuffer}`;
                    }

                    updateFreqHistory(freqPeak);
                    if (maxMag < 12 || freqPeak < 18000) return;

                    const now = performance.now();
                    function freqNear(target) {
                        return Math.abs(freqPeak - target) <= PROTO.TOLERANCE;
                    }



                    if (rxState === 'IDLE') {
                        if (freqNear(PROTO.START) && isStableFrequency(PROTO.START)) {
                            rxState = 'SYNC';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            startDetected = true;
                            syncDetected = false;
                            if (panelMsg) panelMsg.textContent = '[SYNC]';
                            console.log('START detectado:', freqPeak.toFixed(1), 'Hz');
                        }
                    } else if (rxState === 'SYNC') {
                        if (freqNear(PROTO.SYNC) && isStableFrequency(PROTO.SYNC)) {
                            rxState = 'DATA';
                            lastSymbolTime = now;
                            syncDetected = true;
                            if (panelMsg) panelMsg.textContent = '[DATA]';
                            console.log('SYNC detectado:', freqPeak.toFixed(1), 'Hz');
                        }
                    } else if (rxState === 'DATA') {
                        if (freqNear(PROTO.END) && isStableFrequency(PROTO.END)) {
                            rxState = 'END';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[END]';
                            addToMessageLog(rxBuffer, 'received');
                            if (panelMsg) panelMsg.textContent = '[RECIBIDO] ' + rxBuffer;
                            rxState = 'IDLE';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            startDetected = false;
                            syncDetected = false;
                            console.log('END detectado, mensaje completo:', rxBuffer);
                            return;
                        }
                        if (freqNear(PROTO.SYNC) && isStableFrequency(PROTO.SYNC)) {
                            lastSymbolTime = now;
                            return;
                        }
                        const detectedChar = frequencyToChar(freqPeak);
                        const tiempoDesdeUltimo = now - lastSymbolTime;

                        // Debug específico para caracteres problemáticos
                        if (detectedChar && 'ÑCDIYZO0123456789'.includes(detectedChar)) {
                            console.log(`DEBUG ${detectedChar}: Freq=${freqPeak.toFixed(1)}Hz, Mag=${maxMag}, Estable=${isStableFrequency(charToFrequency(detectedChar))}`);
                        }

                        if (
                            detectedChar &&
                            isStableFrequency(charToFrequency(detectedChar)) &&
                            (detectedChar !== lastChar || tiempoDesdeUltimo > SYMBOL_LOCKOUT_MS)
                        ) {
                            rxBuffer += detectedChar;
                            lastChar = detectedChar;
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = rxBuffer;
                            console.log(`Carácter agregado: ${detectedChar} (${freqPeak.toFixed(1)} Hz)`);
                        } else if (detectedChar === lastChar && tiempoDesdeUltimo <= SYMBOL_LOCKOUT_MS) {
                            console.log(`Carácter ignorado por lockout: ${detectedChar} (${freqPeak.toFixed(1)} Hz)`);
                        } else if (detectedChar) {
                            console.log(`Carácter detectado pero no agregado: ${detectedChar} (${freqPeak.toFixed(1)} Hz)`);
                        }
                    } else if (rxState === 'END') {
                        if (freqNear(PROTO.END) && isStableFrequency(PROTO.END)) {
                            addToMessageLog(rxBuffer, 'received');
                            if (panelMsg) panelMsg.textContent = '[RECIBIDO] ' + rxBuffer;
                            rxState = 'IDLE';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            startDetected = false;
                            syncDetected = false;
                        }
                    }
                    if (now - lastSymbolTime > 2000) {
                        rxState = 'IDLE';
                        rxBuffer = '';
                        lastChar = '';
                        startDetected = false;
                        syncDetected = false;
                        if (panelMsg) panelMsg.textContent = '[TIMEOUT]';
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

    setupEmisorUI(visualizer);
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