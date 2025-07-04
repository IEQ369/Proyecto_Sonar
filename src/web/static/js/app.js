// Clase Visualizer (antes en visualizer.js)
class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isAnimating = false;
        this.transmitMode = false;
        // Añadir clase al contenedor si existe
        if (this.canvas.parentElement) {
            this.canvas.parentElement.classList.add('frequency-visualizer');
        }
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupCanvas();
    }

    setupCanvas() {
        const parent = this.canvas.parentElement;
        if (window.innerWidth <= 600) {
            this.canvas.width = window.innerWidth * window.devicePixelRatio;
            this.canvas.height = 180 * window.devicePixelRatio;
        } else {
            this.canvas.width = parent.offsetWidth * window.devicePixelRatio;
            this.canvas.height = 220 * window.devicePixelRatio;
        }
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        this.gradient.addColorStop(0, '#6e1fff');
        this.gradient.addColorStop(0.5, '#a259f7');
        this.gradient.addColorStop(1, '#e040fb');
    }

    start() {
        this.isAnimating = true;
    }

    stop() {
        this.isAnimating = false;
        this.clear();
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSpectrum(frequencyData) {
        if (!this.isAnimating) return;
        const { data, minFreq, maxFreq, sampleRate, fftSize } = frequencyData;
        const binSize = sampleRate / fftSize;
        const minBin = Math.floor(minFreq / binSize);
        const maxBin = Math.ceil(maxFreq / binSize);
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const numBars = Math.min(256, maxBin - minBin);
        const barWidth = width / numBars;

        let maxBarIdx = 0;
        let maxBarMag = 0;
        let secondIdx = -1;
        let secondMag = 0;
        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            const magnitude = data[bin];
            if (magnitude > maxBarMag) {
                secondMag = maxBarMag;
                secondIdx = maxBarIdx;
                maxBarMag = magnitude;
                maxBarIdx = i;
            } else if (magnitude > secondMag) {
                secondMag = magnitude;
                secondIdx = i;
            }
        }

        this.clear();

        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            let magnitude = data[bin];
            const freq = bin * binSize;
            const barHeight = (magnitude / 255) * (height - 30);
            const x = i * barWidth;
            if (i === maxBarIdx) {
                // Pico dominante: cian brillante
                this.ctx.fillStyle = '#00fff7';
                this.ctx.shadowColor = '#00fff7';
                this.ctx.shadowBlur = 16;
            } else if (i === secondIdx) {
                // Segundo pico: magenta brillante
                this.ctx.fillStyle = '#e040fb';
                this.ctx.shadowColor = '#e040fb';
                this.ctx.shadowBlur = 12;
            } else {
                this.ctx.fillStyle = this.gradient;
                this.ctx.shadowColor = '#00f0ff';
                this.ctx.shadowBlur = 8;
            }
            this.ctx.fillRect(x, height - barHeight, barWidth * 0.8, barHeight);
            this.ctx.shadowBlur = 0;
        }
        this.drawFrequencyLines(minFreq, maxFreq, width, height);
        this.drawMarkers(minFreq, maxFreq, width, height);
    }

    drawFrequencyLines(minFreq, maxFreq, width, height) {
        const step = 2000; // 2kHz para menos saturación
        const freqRange = maxFreq - minFreq;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        this.ctx.lineWidth = 1;
        this.ctx.font = '13px monospace';
        this.ctx.fillStyle = '#e040fb'; // Morado claro cyberpunk
        this.ctx.textAlign = 'center';
        for (let freq = minFreq; freq <= maxFreq; freq += step) {
            const x = ((freq - minFreq) / freqRange) * width;
            // Línea vertical
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - 2);
            this.ctx.lineTo(x, 10);
            this.ctx.stroke();
            // Etiqueta
            const label = `${Math.round(freq / 1000)}kHz`;
            this.ctx.fillText(label, x, height - 5);
        }
        this.ctx.restore();
    }

    drawMarkers(minFreq, maxFreq, width, height) {
        // Líneas de marcadores de protocolo (START, SYNC, END) al estilo Chirp: finas, semitransparentes, con etiquetas pequeñas
        const markerFreqs = [
            { freq: START_FREQUENCY, label: 'START' },
            { freq: SYNC_FREQUENCY, label: 'SYNC' },
            { freq: END_FREQUENCY, label: 'END' }
        ];
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        markerFreqs.forEach(marker => {
            if (marker.freq >= minFreq && marker.freq <= maxFreq) {
                const x = Math.round((marker.freq - minFreq) / (maxFreq - minFreq) * width);
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
                this.ctx.stroke();
                // Etiqueta encima de la línea
                this.ctx.fillText(marker.label, x, 13);
            }
        });
        this.ctx.restore();
    }

    setTransmitMode(active) {
        this.transmitMode = !!active;
        if (this.transmitMode) {
            this.canvas.classList.add('transmit-active');
        } else {
            this.canvas.classList.remove('transmit-active');
        }
    }
}

// Instancia global del visualizador
const visualizer = new Visualizer('fft-canvas');

// --- Lógica de decodificación de protocolo ultrasónico ---
// Mapeo de frecuencias (debe coincidir con frecuencias.py)
import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, MIN_DATA_FREQUENCY, MAX_DATA_FREQUENCY, FREQUENCY_STEP, CHAR_FREQUENCIES, charToFrequency, frequencyToChar, SYMBOL_DURATION, CHARACTER_GAP } from './protocolo_ultrasonico.js';
import { emitirUltrasonico } from './emisor_ultrasonico.js';

const PROTO = {
    START: START_FREQUENCY,
    SYNC: SYNC_FREQUENCY,
    END: END_FREQUENCY,
    MIN_DATA: MIN_DATA_FREQUENCY,
    MAX_DATA: MAX_DATA_FREQUENCY,
    STEP: FREQUENCY_STEP,
    TOLERANCE: 100 // Hz
};

// Estado del receptor
let rxState = 'IDLE'; // IDLE, SYNC, DATA, END
let rxBuffer = '';
let lastChar = '';
let lastSymbolTime = 0;
let lastDetectedFreq = 0;
let lastPanelMsg = '';

// --- Mejoras de robustez para la decodificación ultrasónica ---
// Buffer circular para frecuencias detectadas
let freqHistory = [];
const HISTORY_SIZE = 5;
function updateFreqHistory(freq) {
    freqHistory.push(freq);
    if (freqHistory.length > HISTORY_SIZE) freqHistory.shift();
}
function isStableFrequency(targetFreq) {
    // Verifica si la mayoría de los últimos frames detectaron la misma frecuencia
    return freqHistory.filter(f => Math.abs(f - targetFreq) < PROTO.TOLERANCE).length > HISTORY_SIZE / 2;
}

// Definir duración de símbolo para lockout (debe coincidir con el emisor)
const SYMBOL_LOCKOUT_MS = (SYMBOL_DURATION + CHARACTER_GAP) * 1000; // ms

document.addEventListener('DOMContentLoaded', function () {
    visualizer.start();

    // Test de la función frequencyToChar
    console.log('=== TEST PROTOCOLO ===');
    console.log('J (19600 Hz):', frequencyToChar(19600));
    console.log('K (19700 Hz):', frequencyToChar(19700));
    console.log('Z (21200 Hz):', frequencyToChar(21200));
    console.log('Ñ (22400 Hz):', frequencyToChar(22400));
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
                analyser.fftSize = 2048; // Más rápido y fluido
                analyser.smoothingTimeConstant = 0.2; // Cambios más en tiempo real
                source.connect(analyser);
                let lastUltrasound = 0;
                let lastMsg = '';
                const SIGNAL_THRESHOLD = 135;
                const minFreq = 18000;
                const maxFreq = 22500;
                function processFrame() {
                    requestAnimationFrame(processFrame);
                    // FFT para visualizador
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
                    // Detección para receptor
                    if (!messagesLog) return;
                    const binSize = audioCtx.sampleRate / analyser.fftSize;
                    const minBin = Math.floor(minFreq / binSize);
                    const maxBin = Math.ceil(maxFreq / binSize);
                    let maxMag = 0;
                    let maxIdx = -1;
                    let secondMag = 0;
                    let secondIdx = -1;
                    let sum = 0;
                    let count = 0;
                    for (let i = minBin; i <= maxBin; i++) {
                        const mag = dataArray[i];
                        sum += mag;
                        count++;
                        if (mag > maxMag) {
                            secondMag = maxMag;
                            secondIdx = maxIdx;
                            maxMag = mag;
                            maxIdx = i;
                        } else if (mag > secondMag) {
                            secondMag = mag;
                            secondIdx = i;
                        }
                    }
                    const avg = sum / count;
                    const freqPeak = maxIdx * binSize;
                    const freqSecond = secondIdx * binSize;
                    // Mostrar frecuencia dominante y magnitud en el panel
                    if (panelMsg) {
                        panelMsg.textContent = `Freq: ${freqPeak.toFixed(1)} Hz | Mag: ${maxMag}` + (secondMag > 0 ? ` | 2nd: ${freqSecond.toFixed(1)} Hz (${secondMag})` : '');
                    }
                    // --- Decodificación de protocolo ---
                    // Detectar frecuencia dominante en el rango de datos y control
                    let protoDetectedFreq = null;
                    let protoMaxMag = 0;
                    let protoMaxIdx = -1;
                    for (let i = 0; i < dataArray.length; i++) {
                        if (dataArray[i] > protoMaxMag) {
                            protoMaxMag = dataArray[i];
                            protoMaxIdx = i;
                        }
                    }
                    const protoBinSize = audioCtx.sampleRate / analyser.fftSize;
                    protoDetectedFreq = protoMaxIdx * protoBinSize;
                    updateFreqHistory(protoDetectedFreq);
                    // Solo considerar si la magnitud es suficiente (umbral ajustado para frecuencias altas)
                    if (protoMaxMag < 20 || protoDetectedFreq < 18000) return;
                    // Confianza extra si el segundo pico está cerca del paralelo
                    const PARALLEL_OFFSET = 35;
                    let parallelConfidence = false;
                    if (
                        secondMag > 0 &&
                        Math.abs(freqSecond - (freqPeak + PARALLEL_OFFSET)) < 7 &&
                        secondMag > 0.3 * maxMag
                    ) {
                        parallelConfidence = true;
                    }
                    // Decodificación de estado
                    const now = performance.now();
                    function freqNear(target) {
                        return Math.abs(protoDetectedFreq - target) <= PROTO.TOLERANCE;
                    }
                    if (rxState === 'IDLE') {
                        if (freqNear(PROTO.START) && isStableFrequency(PROTO.START)) {
                            rxState = 'SYNC';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[SYNC]';
                        }
                    } else if (rxState === 'SYNC') {
                        if (freqNear(PROTO.SYNC) && isStableFrequency(PROTO.SYNC)) {
                            rxState = 'DATA';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[DATA]';
                        }
                    } else if (rxState === 'DATA') {
                        // Detectar END
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
                            return;
                        }
                        // Detectar SYNC final (opcional, solo loguear)
                        if (freqNear(PROTO.SYNC) && isStableFrequency(PROTO.SYNC)) {
                            lastSymbolTime = now;
                            return;
                        }
                        // Detectar carácter SOLO por el pico dominante
                        const detectedChar = frequencyToChar(freqPeak);
                        const tiempoDesdeUltimo = now - lastSymbolTime;
                        if (
                            detectedChar &&
                            (parallelConfidence || isStableFrequency(charToFrequency(detectedChar))) &&
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
                        }
                    }
                    // Reinicio por timeout (si pasa mucho tiempo sin símbolo)
                    if (now - lastSymbolTime > 2000) {
                        rxState = 'IDLE';
                        rxBuffer = '';
                        lastChar = '';
                        if (panelMsg) panelMsg.textContent = '[TIMEOUT]';
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

    // Lógica para el panel TRANSMIT (enviar mensaje y agregar al historial)
    const input = document.getElementById('messageInput');
    const status = document.getElementById('emisor-status');
    if (input && status) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// --- EMISOR ULTRASÓNICO (Web Audio API) ---
function sendMessage() {
    const val = input.value.trim().toUpperCase();
    if (val) {
        status.textContent = 'enviando...';
        visualizer.setTransmitMode(true);
        // Emitir por ultrasonido en el navegador (frontend)
        emitirUltrasonico(val).then(() => {
            visualizer.setTransmitMode(false);
        });
        // Enviar al backend como antes
        fetch('/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: val })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    status.textContent = 'mensaje enviado';
                    input.value = '';
                } else {
                    status.textContent = 'error: ' + (data.error || 'no se pudo enviar');
                }
            })
            .catch(err => {
                status.textContent = 'error de red';
            });
    }
}

// Función para agregar mensaje al historial tipo Chirp
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
    // Insertar arriba
    if (log.firstChild) {
        log.insertBefore(entry, log.firstChild);
    } else {
        log.appendChild(entry);
    }
}
window.addToMessageLog = addToMessageLog;