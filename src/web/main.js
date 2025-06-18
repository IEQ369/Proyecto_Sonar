// Constantes del protocolo
const START_FREQ = 17500;
const END_FREQ = 20500;
const SYNC_FREQ = 19000;  // Frecuencia de sincronización
const FREQ_TOLERANCE = 50;
const SYMBOL_DURATION = 100;  // ms
const SYNC_DURATION = 200;    // ms
const LOCKOUT_WINDOWS = 2;
const END_TIMEOUT_MS = 300;

// Base64 estándar
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function textToBase64(text) {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

function base64ToText(b64) {
    return decodeURIComponent(atob(b64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function base64ToFreqs(b64, base, step) {
    return Array.from(b64).map(s => base + BASE64.indexOf(s) * step);
}

// Función para calcular checksum simple
function calculateChecksum(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data.charCodeAt(i);
    }
    return sum % 64;  // Usamos módulo 64 para que quepa en un símbolo
}

// Función para verificar checksum
function verifyChecksum(data, checksum) {
    return calculateChecksum(data) === checksum;
}

document.getElementById('resetParams').onclick = function () {
    document.getElementById('base_freq').value = 18000;
    document.getElementById('step').value = 100;
    document.getElementById('dur').value = 100;
    document.getElementById('amp').value = 1.0;
    document.getElementById('umbral').value = 100;
};

async function emitir() {
    const mensaje = document.getElementById('mensaje').value;
    const base = parseInt(document.getElementById('base_freq').value);
    const step = parseInt(document.getElementById('step').value);
    const dur = parseInt(document.getElementById('dur').value);
    const amp = parseFloat(document.getElementById('amp').value);

    if (!mensaje) {
        document.getElementById('estado').textContent = 'Escribe un mensaje';
        return;
    }

    // Codificar mensaje
    const b64 = textToBase64(mensaje);
    const checksum = calculateChecksum(mensaje);

    document.getElementById('estado').textContent = 'Transmitiendo base64: ' + b64;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Secuencia: START, SYNC, datos, checksum, SYNC, END
    const secuencia = [
        START_FREQ,
        SYNC_FREQ,
        ...base64ToFreqs(b64, base, step),
        base + checksum * step,
        SYNC_FREQ,
        END_FREQ
    ];

    for (let i = 0; i < secuencia.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = secuencia[i];
        gain.gain.value = amp;
        osc.connect(gain).connect(ctx.destination);
        osc.start();

        // Duración más larga para SYNC
        const duration = (secuencia[i] === SYNC_FREQ) ? SYNC_DURATION : dur;
        osc.stop(ctx.currentTime + duration / 1000);
        await new Promise(r => setTimeout(r, duration));
    }

    document.getElementById('estado').textContent = 'Transmisión completada';
}

document.getElementById('emitir').onclick = emitir;

let fftActive = true;
let audioStream = null;
let animationId = null;
let audioContext = null;
let analyser = null;
let source = null;
let bufferLength = 1024;
let dataArray = new Uint8Array(bufferLength);
let freqBinHz = 21.5;
const canvas = document.getElementById('espectro');
const ctx2d = canvas.getContext('2d');

// Función para mostrar estado de debug
function updateDebugStatus(message) {
    console.log('[DEBUG]', message);
    const debugElement = document.getElementById('debug');
    if (debugElement) {
        debugElement.textContent = '[DEBUG] ' + message;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    updateDebugStatus('DOM cargado, iniciando FFT...');
    startFFT();
});

document.getElementById('toggleFFT').onclick = function () {
    fftActive = !fftActive;
    canvas.style.display = fftActive ? 'block' : 'none';
    updateDebugStatus('FFT ' + (fftActive ? 'activado' : 'desactivado'));
};

let rxActive = true;
let rxStarted = false;
let rxBase64 = '';
let rxLastSymbol = null;
let rxLockout = 0;
let lastSymbolTime = 0;
let lastSyncTime = 0;

const BASE_FREQ = () => parseInt(document.getElementById('base_freq').value);
const STEP = () => parseInt(document.getElementById('step').value);
const UMBRAL_PICO = () => parseInt(document.getElementById('umbral').value);
const SYMBOLS = BASE64.split('');

document.getElementById('toggleRX').onclick = function () {
    rxActive = !rxActive;
    document.getElementById('toggleRX').textContent = rxActive ? 'Pausar recepción' : 'Reanudar recepción';
    if (!rxActive) {
        document.getElementById('estado').textContent = 'Recepción pausada';
    } else {
        document.getElementById('estado').textContent = 'Recepción reanudada';
    }
};

async function startFFT() {
    try {
        updateDebugStatus('Verificando soporte de getUserMedia...');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia no soportado en este navegador');
        }

        updateDebugStatus('Solicitando permisos de micrófono...');

        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        updateDebugStatus('Creando AudioContext...');

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        updateDebugStatus('Configurando analizador FFT...');

        source = audioContext.createMediaStreamSource(audioStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        // Actualizar variables después de crear el analizador
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        freqBinHz = audioContext.sampleRate / 2 / bufferLength;

        updateDebugStatus('Iniciando visualización FFT...');

        draw();

        updateDebugStatus('FFT iniciado correctamente');

    } catch (error) {
        updateDebugStatus('Error en startFFT: ' + error.message);
        console.error('Error completo:', error);

        // Mostrar error en el canvas
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = '#ff0000';
        ctx2d.font = '16px monospace';
        ctx2d.fillText('Error FFT: ' + error.message, 10, 50);
        ctx2d.fillText('Verifica permisos de micrófono', 10, 80);
        ctx2d.fillText('y conexión HTTPS', 10, 110);
    }
}

function draw() {
    if (!analyser) {
        updateDebugStatus('Analizador no disponible');
        return;
    }

    try {
        analyser.getByteFrequencyData(dataArray);
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        // Escala vertical
        ctx2d.strokeStyle = '#333';
        for (let y = 0; y <= canvas.height; y += canvas.height / 4) {
            ctx2d.beginPath();
            ctx2d.moveTo(0, y);
            ctx2d.lineTo(canvas.width, y);
            ctx2d.stroke();
            ctx2d.fillStyle = '#444';
            ctx2d.font = '10px monospace';
            ctx2d.fillText((255 - Math.round(y * 255 / canvas.height)), 2, y - 2);
        }

        // Escala horizontal
        const nyquist = audioContext.sampleRate / 2;
        for (let hz = 0; hz <= nyquist; hz += 2000) {
            const x = hz * canvas.width / nyquist;
            ctx2d.strokeStyle = '#333';
            ctx2d.beginPath();
            ctx2d.moveTo(x, 0);
            ctx2d.lineTo(x, canvas.height);
            ctx2d.stroke();
            ctx2d.fillStyle = '#8be9fd';
            ctx2d.font = '12px monospace';
            ctx2d.fillText(hz + 'Hz', x + 2, canvas.height - 5);
        }

        // Espectro FFT
        for (let i = 0; i < bufferLength; i++) {
            const x = i * canvas.width / bufferLength;
            const y = canvas.height - (dataArray[i] / 255) * canvas.height;
            ctx2d.strokeStyle = '#00ffff';
            ctx2d.beginPath();
            ctx2d.moveTo(x, canvas.height);
            ctx2d.lineTo(x, y);
            ctx2d.stroke();
        }

        let debugMsg = '';
        if (rxActive) {
            let mejorSimbolo = null;
            let mejorPico = 0;
            let mejorFreq = 0;

            // Detectar símbolos
            for (let s = 0; s < SYMBOLS.length; s++) {
                const f_central = BASE_FREQ() + s * STEP();
                const binIni = Math.floor((f_central - FREQ_TOLERANCE) / freqBinHz);
                const binFin = Math.ceil((f_central + FREQ_TOLERANCE) / freqBinHz);
                let pico = 0;
                for (let j = binIni; j <= binFin; j++) {
                    if (j >= 0 && j < bufferLength) pico = Math.max(pico, dataArray[j]);
                }
                if (pico > mejorPico) {
                    mejorPico = pico;
                    mejorSimbolo = SYMBOLS[s];
                    mejorFreq = f_central;
                }
            }

            // Detectar START, SYNC y END
            const detectFreq = (freq) => {
                const binIni = Math.floor((freq - FREQ_TOLERANCE) / freqBinHz);
                const binFin = Math.ceil((freq + FREQ_TOLERANCE) / freqBinHz);
                let pico = 0;
                for (let j = binIni; j <= binFin; j++) {
                    if (j >= 0 && j < bufferLength) pico = Math.max(pico, dataArray[j]);
                }
                return pico;
            };

            const picoStart = detectFreq(START_FREQ);
            const picoSync = detectFreq(SYNC_FREQ);
            const picoEnd = detectFreq(END_FREQ);

            debugMsg = `[DEBUG] START: ${picoStart.toFixed(1)} | SYNC: ${picoSync.toFixed(1)} | END: ${picoEnd.toFixed(1)} | Símbolo: ${mejorSimbolo} (${mejorFreq}Hz, ${mejorPico.toFixed(1)})`;

            const now = performance.now();

            // Detectar START
            if (!rxStarted && picoStart > UMBRAL_PICO()) {
                rxStarted = true;
                rxBase64 = '';
                rxLastSymbol = null;
                rxLockout = 0;
                lastSymbolTime = now;
                lastSyncTime = now;
                document.getElementById('estado').textContent = '[RX] START detectado';
            }
            // Detectar SYNC
            else if (rxStarted && picoSync > UMBRAL_PICO() && (now - lastSyncTime > SYNC_DURATION)) {
                lastSyncTime = now;
                document.getElementById('estado').textContent = '[RX] SYNC detectado';
            }
            // Detectar END
            else if (rxStarted && picoEnd > UMBRAL_PICO()) {
                rxStarted = false;
                document.getElementById('estado').textContent = '[RX] END detectado';

                // Verificar checksum
                const checksum = parseInt(rxBase64.slice(-1));
                const data = rxBase64.slice(0, -1);

                if (verifyChecksum(base64ToText(data), checksum)) {
                    document.getElementById('base32_rx').textContent = '[Base64 recibido]: ' + data;
                    document.getElementById('mensaje_rx').textContent = '[Texto decodificado]: ' + base64ToText(data);
                } else {
                    document.getElementById('estado').textContent = '[RX] Error de checksum';
                }

                rxBase64 = '';
                rxLastSymbol = null;
                rxLockout = 0;
            }
            // Detectar símbolos
            else if (rxStarted && mejorSimbolo && mejorPico > UMBRAL_PICO()) {
                if (rxLockout > 0) {
                    rxLockout--;
                } else if (mejorSimbolo !== rxLastSymbol) {
                    rxBase64 += mejorSimbolo;
                    document.getElementById('base32_rx').textContent = '[Base64 en curso]: ' + rxBase64;
                    document.getElementById('mensaje_rx').textContent = '[Texto en curso]: ' + base64ToText(rxBase64);
                    rxLastSymbol = mejorSimbolo;
                    rxLockout = LOCKOUT_WINDOWS;
                    lastSymbolTime = now;
                }
            }

            // Timeout de END
            if (rxStarted && (now - lastSymbolTime > END_TIMEOUT_MS)) {
                rxStarted = false;
                document.getElementById('estado').textContent = '[RX] END (timeout)';

                // Verificar checksum
                const checksum = parseInt(rxBase64.slice(-1));
                const data = rxBase64.slice(0, -1);

                if (verifyChecksum(base64ToText(data), checksum)) {
                    document.getElementById('base32_rx').textContent = '[Base64 recibido]: ' + data;
                    document.getElementById('mensaje_rx').textContent = '[Texto decodificado]: ' + base64ToText(data);
                } else {
                    document.getElementById('estado').textContent = '[RX] Error de checksum';
                }

                rxBase64 = '';
                rxLastSymbol = null;
                rxLockout = 0;
            }
        }

        document.getElementById('debug').textContent = debugMsg;
        animationId = requestAnimationFrame(draw);

    } catch (error) {
        updateDebugStatus('Error en draw(): ' + error.message);
        console.error('Error en draw:', error);
    }
}

document.getElementById('testFreqs').onclick = async function () {
    const base = parseInt(document.getElementById('base_freq').value);
    const step = parseInt(document.getElementById('step').value);
    const dur = parseInt(document.getElementById('dur').value);
    const amp = parseFloat(document.getElementById('amp').value);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Test START
    document.getElementById('estado').textContent = '[Test] Emitiendo START';
    const oscStart = ctx.createOscillator();
    const gainStart = ctx.createGain();
    oscStart.type = 'sine';
    oscStart.frequency.value = START_FREQ;
    gainStart.gain.value = amp;
    oscStart.connect(gainStart).connect(ctx.destination);
    oscStart.start();
    oscStart.stop(ctx.currentTime + SYNC_DURATION / 1000);
    await new Promise(r => setTimeout(r, SYNC_DURATION + 80));

    // Test SYNC
    document.getElementById('estado').textContent = '[Test] Emitiendo SYNC';
    const oscSync = ctx.createOscillator();
    const gainSync = ctx.createGain();
    oscSync.type = 'sine';
    oscSync.frequency.value = SYNC_FREQ;
    gainSync.gain.value = amp;
    oscSync.connect(gainSync).connect(ctx.destination);
    oscSync.start();
    oscSync.stop(ctx.currentTime + SYNC_DURATION / 1000);
    await new Promise(r => setTimeout(r, SYNC_DURATION + 80));

    // Test símbolos
    for (let i = 0; i < BASE64.length; i++) {
        const symbol = BASE64[i];
        const freq = base + i * step;
        document.getElementById('estado').textContent = `[Test] Emitiendo: ${symbol} (${freq} Hz)`;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = amp;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur / 1000);
        await new Promise(r => setTimeout(r, dur + 80));
    }

    // Test END
    document.getElementById('estado').textContent = '[Test] Emitiendo END';
    const oscEnd = ctx.createOscillator();
    const gainEnd = ctx.createGain();
    oscEnd.type = 'sine';
    oscEnd.frequency.value = END_FREQ;
    gainEnd.gain.value = amp;
    oscEnd.connect(gainEnd).connect(ctx.destination);
    oscEnd.start();
    oscEnd.stop(ctx.currentTime + SYNC_DURATION / 1000);
    await new Promise(r => setTimeout(r, SYNC_DURATION + 80));

    document.getElementById('estado').textContent = '[Test] Finalizado. Revisa el receptor para ver qué frecuencias se detectaron.';
}; 