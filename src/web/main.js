// Constantes del protocolo
const START_FREQ = 19500;  // Hz, frecuencia de inicio (19.5 kHz - menos audible)
const END_FREQ = 19900;    // Hz, frecuencia de fin (19.9 kHz - inaudible y bien captado)
const SYNC_FREQ = 19200;   // Hz, frecuencia de sincronización (19.2 kHz)
const FREQ_TOLERANCE = 50;
const SYMBOL_DURATION = 100;  // ms
const SYNC_DURATION = 200;    // ms
const LOCKOUT_WINDOWS = 2;
const END_TIMEOUT_MS = 300;

// Base32 estándar (RFC 4648)
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Sistema de logs mejorado
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

let currentLogLevel = LOG_LEVELS.DEBUG;

function log(level, message, data = null) {
    if (level >= currentLogLevel) {
        const timestamp = new Date().toLocaleTimeString();
        const levelName = Object.keys(LOG_LEVELS)[level];
        const logMessage = `[${timestamp}] [${levelName}] ${message}`;

        console.log(logMessage, data || '');
    }
}

// Función para convertir texto a Base32
function textToBase32(text) {
    try {
        log(LOG_LEVELS.DEBUG, `Codificando texto a Base32: "${text}"`);

        // Convertir texto a bytes
        const bytes = new TextEncoder().encode(text);

        // Convertir bytes a Base32
        let result = '';
        let bits = 0;
        let buffer = 0;

        for (let i = 0; i < bytes.length; i++) {
            buffer = (buffer << 8) | bytes[i];
            bits += 8;

            while (bits >= 5) {
                bits -= 5;
                result += BASE32[(buffer >>> bits) & 31];
            }
        }

        // Manejar bits restantes
        if (bits > 0) {
            buffer = buffer << (5 - bits);
            result += BASE32[buffer & 31];
        }

        // Añadir padding si es necesario
        while (result.length % 8 !== 0) {
            result += '=';
        }

        log(LOG_LEVELS.DEBUG, `Texto codificado exitosamente: ${result}`);
        return result;
    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error codificando texto a Base32: ${error.message}`, { text, error });
        throw error;
    }
}

// Función para convertir Base32 a texto
function base32ToText(b32) {
    try {
        log(LOG_LEVELS.DEBUG, `Decodificando Base32 a texto: "${b32}"`);

        // Validar que la cadena Base32 sea válida
        if (!b32 || typeof b32 !== 'string') {
            throw new Error('Cadena Base32 inválida o vacía');
        }

        // Verificar que solo contenga caracteres Base32 válidos
        const validChars = /^[A-Z2-7]*=*$/;
        if (!validChars.test(b32)) {
            throw new Error('Cadena Base32 contiene caracteres inválidos');
        }

        // Remover padding
        b32 = b32.replace(/=/g, '');

        // Convertir Base32 a bytes
        let bits = 0;
        let buffer = 0;
        const bytes = [];

        for (let i = 0; i < b32.length; i++) {
            const char = b32[i];
            const value = BASE32.indexOf(char);
            if (value === -1) {
                throw new Error(`Carácter inválido en Base32: ${char}`);
            }

            buffer = (buffer << 5) | value;
            bits += 5;

            while (bits >= 8) {
                bits -= 8;
                bytes.push((buffer >>> bits) & 255);
            }
        }

        // Convertir bytes a texto
        const result = new TextDecoder().decode(new Uint8Array(bytes));

        log(LOG_LEVELS.DEBUG, `Base32 decodificado exitosamente: "${result}"`);
        return result;
    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error decodificando Base32: ${error.message}`, { b32, error });
        return null; // Retornar null en lugar de fallar
    }
}

function base32ToFreqs(b32, base, step) {
    try {
        log(LOG_LEVELS.DEBUG, `Convirtiendo Base32 a frecuencias: ${b32}`);
        const result = Array.from(b32).map(s => base + BASE32.indexOf(s) * step);
        log(LOG_LEVELS.DEBUG, `Frecuencias generadas: ${result.length} tonos`);
        return result;
    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error convirtiendo Base32 a frecuencias: ${error.message}`, { b32, base, step, error });
        return [];
    }
}

// Función para calcular checksum simple
function calculateChecksum(data) {
    try {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data.charCodeAt(i);
        }
        const checksum = sum % 64;
        log(LOG_LEVELS.DEBUG, `Checksum calculado: ${checksum} para "${data}"`);
        return checksum;
    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error calculando checksum: ${error.message}`, { data, error });
        return 0;
    }
}

// Función para verificar checksum
function verifyChecksum(data, checksum) {
    try {
        const calculatedChecksum = calculateChecksum(data);
        const isValid = calculatedChecksum === checksum;
        log(LOG_LEVELS.DEBUG, `Verificación de checksum: ${isValid} (esperado: ${checksum}, calculado: ${calculatedChecksum})`);
        return isValid;
    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error verificando checksum: ${error.message}`, { data, checksum, error });
        return false;
    }
}

document.getElementById('resetParams').onclick = function () {
    document.getElementById('base_freq').value = 18600;  // 18.6 kHz - inicio del rango de datos
    document.getElementById('step').value = 100;
    document.getElementById('dur').value = 100;
    document.getElementById('amp').value = 1.0;
    document.getElementById('umbral').value = 100;
    log(LOG_LEVELS.INFO, 'Parámetros restablecidos');
};

async function emitir() {
    try {
        const mensaje = document.getElementById('mensaje').value;
        const base = parseInt(document.getElementById('base_freq').value);
        const step = parseInt(document.getElementById('step').value);
        const dur = parseInt(document.getElementById('dur').value);
        const amp = parseFloat(document.getElementById('amp').value);

        if (!mensaje) {
            document.getElementById('estado').textContent = 'Escribe un mensaje';
            log(LOG_LEVELS.WARN, 'Intento de emisión sin mensaje');
            return;
        }

        log(LOG_LEVELS.INFO, `Iniciando emisión: "${mensaje}"`);

        // Codificar mensaje
        const b32 = textToBase32(mensaje);
        const checksum = calculateChecksum(mensaje);

        document.getElementById('estado').textContent = 'Transmitiendo base32: ' + b32;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Secuencia: START, SYNC, datos, checksum, SYNC, END
        const secuencia = [
            START_FREQ,
            SYNC_FREQ,
            ...base32ToFreqs(b32, base, step),
            base + checksum * step,
            SYNC_FREQ,
            END_FREQ
        ];

        log(LOG_LEVELS.DEBUG, `Secuencia de frecuencias: ${secuencia.length} tonos`);

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
        log(LOG_LEVELS.INFO, 'Emisión completada exitosamente');

    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error en emisión: ${error.message}`, error);
        document.getElementById('estado').textContent = 'Error en transmisión: ' + error.message;
    }
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

// Mostrar base32 en la barra horizontal
function updateBase32Bar(data) {
    const bar = document.getElementById('base32_rx');
    if (bar) {
        if (data && data.length > 0) {
            bar.textContent = `[Base32 recibido]: ${data}`;
        } else {
            bar.textContent = '';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    log(LOG_LEVELS.INFO, 'Aplicación iniciada');
    startFFT();
});

document.getElementById('toggleFFT').onclick = function () {
    fftActive = !fftActive;
    canvas.style.display = fftActive ? 'block' : 'none';
    log(LOG_LEVELS.INFO, `FFT ${fftActive ? 'activado' : 'desactivado'}`);
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
const SYMBOLS = BASE32.split('');

document.getElementById('toggleRX').onclick = function () {
    rxActive = !rxActive;
    document.getElementById('toggleRX').textContent = rxActive ? 'Pausar recepción' : 'Reanudar recepción';
    if (!rxActive) {
        document.getElementById('estado').textContent = 'Recepción pausada';
    } else {
        document.getElementById('estado').textContent = 'Recepción reanudada';
    }
    log(LOG_LEVELS.INFO, `Recepción ${rxActive ? 'reanudada' : 'pausada'}`);
};

async function startFFT() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia no soportado en este navegador');
        }

        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        source = audioContext.createMediaStreamSource(audioStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        // Actualizar variables después de crear el analizador
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        freqBinHz = audioContext.sampleRate / 2 / bufferLength;

        draw();

        log(LOG_LEVELS.INFO, 'FFT iniciado correctamente');

    } catch (error) {
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
                document.getElementById('estado').textContent = '[RX] START detectado - ESCUCHANDO...';
                log(LOG_LEVELS.INFO, 'START detectado, iniciando recepción');
            }
            // Detectar SYNC
            else if (rxStarted && picoSync > UMBRAL_PICO() && (now - lastSyncTime > SYNC_DURATION)) {
                lastSyncTime = now;
                document.getElementById('estado').textContent = '[RX] SYNC detectado - ESCUCHANDO...';
                log(LOG_LEVELS.DEBUG, 'SYNC detectado');
            }
            // Detectar END
            else if (rxStarted && picoEnd > UMBRAL_PICO()) {
                rxStarted = false;
                document.getElementById('estado').textContent = '[RX] END detectado - PROCESANDO...';
                log(LOG_LEVELS.INFO, 'END detectado, procesando mensaje');
                // Verificar checksum
                const checksum = BASE32.indexOf(rxBase64.slice(-1));
                const data = rxBase64.slice(0, -1);
                const terminalText = document.getElementById('terminalText');
                const decodedText = base32ToText(data);
                if (decodedText !== null) {
                    document.getElementById('base32_rx').textContent = '[Base32 recibido]: ' + data;
                    terminalText.textContent = decodedText;
                    if (verifyChecksum(decodedText, checksum)) {
                        log(LOG_LEVELS.INFO, `Mensaje recibido exitosamente: "${decodedText}"`);
                    } else {
                        log(LOG_LEVELS.WARN, `Mensaje recibido con error de checksum: "${decodedText}"`);
                    }
                } else {
                    document.getElementById('estado').textContent = '[RX] Error decodificando mensaje';
                    terminalText.textContent = '[Error de decodificación]';
                    log(LOG_LEVELS.ERROR, 'Error decodificando mensaje recibido');
                }
                rxBase64 = '';
                rxLastSymbol = null;
                rxLockout = 0;
                updateBase32Bar(data);
            }
            // Detectar símbolos
            else if (rxStarted && mejorSimbolo && mejorPico > UMBRAL_PICO()) {
                if (rxLockout > 0) {
                    rxLockout--;
                } else if (mejorSimbolo !== rxLastSymbol) {
                    rxBase64 += mejorSimbolo;
                    updateBase32Bar(rxBase64);
                    // No decodificar en tiempo real, solo limpiar la terminal
                    const terminalText = document.getElementById('terminalText');
                    terminalText.textContent = '';
                    rxLastSymbol = mejorSimbolo;
                    rxLockout = LOCKOUT_WINDOWS;
                    lastSymbolTime = now;
                    document.getElementById('estado').textContent = `[RX] ESCUCHANDO... Símbolo: ${mejorSimbolo} (${mejorFreq}Hz) | Base32: ${rxBase64}`;
                    log(LOG_LEVELS.DEBUG, `Símbolo recibido: ${mejorSimbolo} (${mejorFreq}Hz)`);
                }
            }

            // Timeout de END
            if (rxStarted && (now - lastSymbolTime > END_TIMEOUT_MS)) {
                rxStarted = false;
                document.getElementById('estado').textContent = '[RX] END (timeout) - PROCESANDO...';
                log(LOG_LEVELS.WARN, 'Timeout de END, procesando mensaje incompleto');
                // Verificar checksum
                const checksum = BASE32.indexOf(rxBase64.slice(-1));
                const data = rxBase64.slice(0, -1);
                const terminalText = document.getElementById('terminalText');
                const decodedText = base32ToText(data);
                if (decodedText !== null) {
                    document.getElementById('base32_rx').textContent = '[Base32 recibido]: ' + data;
                    terminalText.textContent = decodedText;
                    if (verifyChecksum(decodedText, checksum)) {
                        log(LOG_LEVELS.INFO, `Mensaje recibido (timeout): "${decodedText}"`);
                    } else {
                        log(LOG_LEVELS.WARN, `Mensaje recibido con error de checksum (timeout): "${decodedText}"`);
                    }
                } else {
                    document.getElementById('estado').textContent = '[RX] Error decodificando mensaje';
                    terminalText.textContent = '[Error de decodificación]';
                    log(LOG_LEVELS.ERROR, 'Error decodificando mensaje (timeout)');
                }
                rxBase64 = '';
                rxLastSymbol = null;
                rxLockout = 0;
                updateBase32Bar(data);
            }

            // Mostrar estado de escucha si no hay actividad
            if (!rxStarted) {
                document.getElementById('estado').textContent = '[RX] Esperando señal...';
            }
        }

        animationId = requestAnimationFrame(draw);

    } catch (error) {
        // Continuar el loop de animación incluso si hay error
        animationId = requestAnimationFrame(draw);
    }
}

document.getElementById('testFreqs').onclick = async function () {
    try {
        log(LOG_LEVELS.INFO, 'Iniciando test de frecuencias');

        const base = parseInt(document.getElementById('base_freq').value);
        const step = parseInt(document.getElementById('step').value);
        const dur = parseInt(document.getElementById('dur').value);
        const amp = parseFloat(document.getElementById('amp').value);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Test START
        document.getElementById('estado').textContent = '[Test] Emitiendo START';
        log(LOG_LEVELS.DEBUG, 'Test: Emitiendo START');
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
        log(LOG_LEVELS.DEBUG, 'Test: Emitiendo SYNC');
        const oscSync = ctx.createOscillator();
        const gainSync = ctx.createGain();
        oscSync.type = 'sine';
        oscSync.frequency.value = SYNC_FREQ;
        gainSync.gain.value = amp;
        oscSync.connect(gainSync).connect(ctx.destination);
        oscSync.start();
        oscSync.stop(ctx.currentTime + SYNC_DURATION / 1000);
        await new Promise(r => setTimeout(r, SYNC_DURATION + 80));

        // Test símbolos BASE32 (no BASE64)
        for (let i = 0; i < BASE32.length; i++) {
            const symbol = BASE32[i];
            const freq = base + i * step;
            document.getElementById('estado').textContent = `[Test] Emitiendo: ${symbol} (${freq} Hz)`;
            log(LOG_LEVELS.DEBUG, `Test: Emitiendo símbolo ${symbol} en ${freq}Hz`);

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

        // Emitir un símbolo de checksum (por ejemplo, 'A')
        const checksumSymbol = 'A';
        const checksumFreq = base + BASE32.indexOf(checksumSymbol) * step;
        document.getElementById('estado').textContent = `[Test] Emitiendo checksum: ${checksumSymbol} (${checksumFreq} Hz)`;
        log(LOG_LEVELS.DEBUG, `Test: Emitiendo checksum ${checksumSymbol} en ${checksumFreq}Hz`);
        const oscChecksum = ctx.createOscillator();
        const gainChecksum = ctx.createGain();
        oscChecksum.type = 'sine';
        oscChecksum.frequency.value = checksumFreq;
        gainChecksum.gain.value = amp;
        oscChecksum.connect(gainChecksum).connect(ctx.destination);
        oscChecksum.start();
        oscChecksum.stop(ctx.currentTime + dur / 1000);
        await new Promise(r => setTimeout(r, dur + 80));

        // Test END
        document.getElementById('estado').textContent = '[Test] Emitiendo END';
        log(LOG_LEVELS.DEBUG, 'Test: Emitiendo END');
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
        log(LOG_LEVELS.INFO, 'Test de frecuencias completado');

    } catch (error) {
        log(LOG_LEVELS.ERROR, `Error en test de frecuencias: ${error.message}`, error);
        document.getElementById('estado').textContent = 'Error en test: ' + error.message;
    }
}; 