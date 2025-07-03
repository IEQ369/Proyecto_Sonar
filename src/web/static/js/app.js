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
        // Hacer que el canvas ocupe todo el ancho del contenedor
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.offsetWidth * window.devicePixelRatio;
        this.canvas.height = 220 * window.devicePixelRatio; // Altura fija tipo Chirp
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        // Crear gradiente cian-azul brillante
        this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        this.gradient.addColorStop(0, '#00f0ff');
        this.gradient.addColorStop(0.5, '#00bfff');
        this.gradient.addColorStop(1, '#1e90ff');
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
        const numBars = Math.min(256, maxBin - minBin); // Muchas barras delgadas
        const barWidth = width / numBars;

        // Limpiar el canvas
        this.clear();

        // Dibujar las barras FFT
        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            const magnitude = data[bin];
            const barHeight = (magnitude / 255) * (height - 30);
            const x = i * barWidth;
            // Gradiente brillante
            this.ctx.fillStyle = this.gradient;
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(x, height - barHeight, barWidth * 0.8, barHeight);
            this.ctx.shadowBlur = 0;
        }

        // Dibujar líneas y etiquetas de frecuencia tipo Chirp
        this.drawFrequencyLines(minFreq, maxFreq, width, height);
    }

    drawFrequencyLines(minFreq, maxFreq, width, height) {
        const step = 2000; // 2kHz para menos saturación
        const freqRange = maxFreq - minFreq;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        this.ctx.lineWidth = 1;
        this.ctx.font = '13px monospace';
        this.ctx.fillStyle = '#fff';
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

    setTransmitMode(active) {
        this.transmitMode = !!active;
        if (this.transmitMode) {
            this.canvas.classList.add('transmit-active');
        } else {
            this.canvas.classList.remove('transmit-active');
        }
    }
}

// --- Lógica de decodificación de protocolo ultrasónico ---
// Mapeo de frecuencias (debe coincidir con frecuencias.py)
const PROTO = {
    START: 18500,
    SYNC: 18600,
    END: 19700, // Fin de transmisión
    MIN_DATA: 18700,
    MAX_DATA: 19600,
    STEP: 100,
    TOLERANCE: 80 // Hz
};

// Letras y números (A-Z, 0-9) en el rango funcional - MAPEO ÚNICO
const CHAR_FREQUENCIES = {
    // Letras A-Z (26 letras)
    'A': 18700, 'B': 18800, 'C': 18900, 'D': 19000, 'E': 19100,
    'F': 19200, 'G': 19300, 'H': 19400, 'I': 19500, 'J': 19600,
    'K': 19700, 'L': 19800, 'M': 19900, 'N': 20000, 'O': 20100,
    'P': 20200, 'Q': 20300, 'R': 20400, 'S': 20500, 'T': 20600,
    'U': 20700, 'V': 20800, 'W': 20900, 'X': 21000, 'Y': 21100,
    'Z': 21200,

    // Números 0-9 (10 números)
    '0': 21300, '1': 21400, '2': 21500, '3': 21600, '4': 21700,
    '5': 21800, '6': 21900, '7': 22000, '8': 22100, '9': 22200
};
const FREQ_TO_CHAR = {};
for (const [char, freq] of Object.entries(CHAR_FREQUENCIES)) {
    FREQ_TO_CHAR[freq] = char;
}

// Estado del receptor
let rxState = 'IDLE'; // IDLE, SYNC, DATA, END
let rxBuffer = '';
let lastChar = '';
let lastSymbolTime = 0;
let lastDetectedFreq = 0;
let lastPanelMsg = '';

document.addEventListener('DOMContentLoaded', function () {
    const visualizer = new Visualizer('fft-canvas');
    visualizer.start();

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
                analyser.fftSize = 1024;
                source.connect(analyser);

                let lastUltrasound = 0;
                let lastMsg = '';
                const SIGNAL_THRESHOLD = 135;
                const minFreq = 18000;
                const maxFreq = 22000;

                function processFrame() {
                    requestAnimationFrame(processFrame);
                    // FFT para visualizador
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(dataArray);
                    visualizer.drawSpectrum({
                        data: Array.from(dataArray),
                        minFreq: 0,
                        maxFreq: audioCtx.sampleRate / 2,
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
                    let color = '#aaa';
                    let label = 'señal débil';
                    if (maxMag > SIGNAL_THRESHOLD && maxMag > avg + 15 && freqPeak > minFreq) {
                        color = '#0f0';
                        label = 'ultrasonido detectado';
                        lastUltrasound = Date.now();
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
                    // Solo considerar si la magnitud es suficiente (umbral bajado para mayor sensibilidad)
                    if (protoMaxMag < 40 || protoDetectedFreq < 18000) return; // umbral bajado de 80 a 40
                    // Logs de depuración
                    console.log('Estado:', rxState, 'Freq:', protoDetectedFreq.toFixed(1), 'Mag:', protoMaxMag);
                    // Decodificación de estado
                    const now = performance.now();
                    console.log('[DEBUG] Estado:', rxState, '| Freq:', protoDetectedFreq.toFixed(1), '| Mag:', protoMaxMag, '| Buffer actual:', rxBuffer);
                    function freqNear(target) {
                        return Math.abs(protoDetectedFreq - target) <= PROTO.TOLERANCE;
                    }
                    if (rxState === 'IDLE') {
                        if (freqNear(PROTO.START)) {
                            rxState = 'SYNC';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[SYNC]';
                            console.log('[PROTOCOLO] START detectado, esperando SYNC...');
                        }
                    } else if (rxState === 'SYNC') {
                        if (freqNear(PROTO.SYNC)) {
                            rxState = 'DATA';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[DATA]';
                            console.log('[PROTOCOLO] SYNC detectado, decodificando datos...');
                        }
                    } else if (rxState === 'DATA') {
                        // Detectar END
                        if (freqNear(PROTO.END)) {
                            rxState = 'END';
                            lastSymbolTime = now;
                            if (panelMsg) panelMsg.textContent = '[END]';
                            console.log('[PROTOCOLO] END detectado, mensaje completo:', rxBuffer);
                            addToMessageLog(rxBuffer, 'received');
                            if (panelMsg) panelMsg.textContent = '[RECIBIDO] ' + rxBuffer;
                            rxState = 'IDLE';
                            rxBuffer = '';
                            lastChar = '';
                            lastSymbolTime = now;
                            return;
                        }
                        // Detectar SYNC final (opcional, solo loguear)
                        if (freqNear(PROTO.SYNC)) {
                            console.log('[PROTOCOLO] SYNC final detectado, esperando END...');
                            // No cambiar de estado, solo loguear
                            lastSymbolTime = now;
                            return;
                        }
                        // Detectar carácter
                        for (const [char, freq] of Object.entries(CHAR_FREQUENCIES)) {
                            if (Math.abs(protoDetectedFreq - freq) <= PROTO.TOLERANCE) {
                                // Evitar repeticiones por frames consecutivos
                                if (char !== lastChar || now - lastSymbolTime > 60) {
                                    rxBuffer += char;
                                    lastChar = char;
                                    lastSymbolTime = now;
                                    if (panelMsg) panelMsg.textContent = rxBuffer;
                                    // Log de carácter decodificado
                                    console.log('[DETECCIÓN] Carácter decodificado:', char, '| Buffer:', rxBuffer, '| Freq detectada:', protoDetectedFreq.toFixed(1), '| Mag:', protoMaxMag);
                                }
                                break;
                            }
                        }
                    } else if (rxState === 'END') {
                        if (freqNear(PROTO.END)) {
                            // Mensaje completo
                            addToMessageLog(rxBuffer, 'received');
                            if (panelMsg) panelMsg.textContent = '[RECIBIDO] ' + rxBuffer;
                            // Log de mensaje recibido
                            console.log('Mensaje recibido:', rxBuffer);
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
                console.error('Error al solicitar el micrófono:', err);
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
                const val = input.value.trim();
                if (val) {
                    status.textContent = 'enviando...';
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
                                addToMessageLog(val, 'sent'); // Agrega al historial como enviado
                            } else {
                                status.textContent = 'error: ' + (data.error || 'no se pudo enviar');
                            }
                        })
                        .catch(err => {
                            status.textContent = 'error de red';
                        });
                }
            }
        });
    }
});

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