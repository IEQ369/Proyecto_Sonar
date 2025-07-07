// emisor_archivos.js
// Emisor robusto para archivos por ultrasonido
// Protocolo robusto: preámbulo, SOI, cabecera con CRC, datos, END

import { generarOnda } from '../../../static/js/generador_onda.js';
import { PROTOCOLO_ARCHIVOS, codificarCabeceraArchivo, crc16ccitt, codificarBloqueDatos, byteToBits } from './protocolo_archivos.js';

// Constantes para el protocolo robusto
const AMPLITUDE = 0.15;
const FADE_TIME = 0.025;
const SAMPLE_RATE = 48000;

/**
 * Emite un archivo por ultrasonido usando protocolo robusto
 * @param {File} archivo - Archivo a transmitir
 * @param {Object} opts - Opciones de transmisión
 * @param {Function} onProgreso - Callback para actualizar progreso
 */
export async function emitirArchivoRobusto(archivo, opts = {}, onProgreso = null) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const arrayBuffer = await archivo.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log('=== EMISION ARCHIVO ROBUSTO ===');
    console.log('Archivo:', archivo.name);
    console.log('Tamaño:', archivo.size, 'bytes');

    let now = audioCtx.currentTime;
    let simbolosTransmitidos = 0;
    const totalSimbolos = calcularTotalSimbolos(archivo.size);

    // 1. PREÁMBULO: START+SYNC repetido
    for (let rep = 0; rep < PROTOCOLO_ARCHIVOS.PREAMBULO_REPS; rep++) {
        console.log('Emitiendo START:', PROTOCOLO_ARCHIVOS.START);
        await emitirTono(audioCtx, PROTOCOLO_ARCHIVOS.START, 0.1, AMPLITUDE * 1.2, FADE_TIME);
        console.log('Emitiendo SYNC:', PROTOCOLO_ARCHIVOS.SYNC);
        await emitirTono(audioCtx, PROTOCOLO_ARCHIVOS.SYNC, 0.1, AMPLITUDE * 1.2, FADE_TIME);
        simbolosTransmitidos += 2;
        if (onProgreso) onProgreso({ progreso: Math.round((simbolosTransmitidos / totalSimbolos) * 100) });
    }

    // 2. SOI: secuencia binaria única repetida
    for (let rep = 0; rep < PROTOCOLO_ARCHIVOS.SOI_REPS; rep++) {
        for (let bit of PROTOCOLO_ARCHIVOS.SOI) {
            const freq = bit ? PROTOCOLO_ARCHIVOS.DATA_1 : PROTOCOLO_ARCHIVOS.DATA_0;
            await emitirTono(audioCtx, freq, PROTOCOLO_ARCHIVOS.SYMBOL_DURATION, AMPLITUDE, FADE_TIME);
        }
    }

    // 3. CABECERA: tamaño, nombre, CRC16 (repetida)
    const crc = crc16ccitt(new Uint8Array([...new Uint8Array(4), ...new TextEncoder().encode(archivo.name.slice(0, 16).padEnd(16, '\0'))]));
    const cabecera = codificarCabeceraArchivo(archivo.size, archivo.name, crc);

    for (let rep = 0; rep < PROTOCOLO_ARCHIVOS.CABECERA_REPS; rep++) {
        for (let byte of cabecera) {
            const bits = byteToBits(byte);
            for (let bit of bits) {
                const freq = bit ? PROTOCOLO_ARCHIVOS.DATA_1 : PROTOCOLO_ARCHIVOS.DATA_0;
                await emitirTono(audioCtx, freq, 0.05, AMPLITUDE, FADE_TIME);
                simbolosTransmitidos++;
                if (onProgreso) onProgreso({ progreso: Math.round((simbolosTransmitidos / totalSimbolos) * 100) });
            }
        }
    }

    // 4. DATOS: bloques de 8 bytes con CRC8
    for (let i = 0; i < bytes.length; i += 8) {
        const bloque = bytes.slice(i, Math.min(i + 8, bytes.length));
        const bloqueConCRC = codificarBloqueDatos(bloque);

        for (let byte of bloqueConCRC) {
            const bits = byteToBits(byte);
            for (let bit of bits) {
                const freq = bit ? PROTOCOLO_ARCHIVOS.DATA_1 : PROTOCOLO_ARCHIVOS.DATA_0;
                await emitirTono(audioCtx, freq, 0.05, AMPLITUDE, FADE_TIME);
                simbolosTransmitidos++;
                if (onProgreso) onProgreso({ progreso: Math.round((simbolosTransmitidos / totalSimbolos) * 100) });
            }
        }
    }

    // 5. FIN: END repetido
    for (let rep = 0; rep < 3; rep++) {
        await emitirTono(audioCtx, PROTOCOLO_ARCHIVOS.END, 0.1, AMPLITUDE * 1.2, FADE_TIME);
        simbolosTransmitidos++;
        if (onProgreso) onProgreso({ progreso: Math.round((simbolosTransmitidos / totalSimbolos) * 100) });
    }

    setTimeout(() => audioCtx.close(), 200);
    console.log('=== EMISION ARCHIVO ROBUSTO COMPLETADA ===');
}

function calcularTotalSimbolos(tamanoArchivo) {
    const bloques = Math.ceil(tamanoArchivo / 8);
    return PROTOCOLO_ARCHIVOS.PREAMBULO_REPS * 2 + // START+SYNC
        PROTOCOLO_ARCHIVOS.SOI_REPS * PROTOCOLO_ARCHIVOS.SOI.length + // SOI
        PROTOCOLO_ARCHIVOS.CABECERA_REPS * PROTOCOLO_ARCHIVOS.CABECERA_BYTES * 8 + // cabecera
        bloques * 9 * 8 + // datos + CRC8
        3; // END repetido
}

async function emitirTono(audioCtx, freq, duracion, amplitud, fadeTime) {
    generarOnda({
        frecuencia: freq,
        duracion: duracion,
        tipo: 'sine',
        amplitud: amplitud,
        sampleRate: SAMPLE_RATE,
        audioCtx: audioCtx,
        fadeTime: fadeTime
    });
    await new Promise(res => setTimeout(res, duracion * 1000));
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
        let cancelando = false;
        let transmisionActiva = false;
        let detenerTransmision = null;
        const archivoContainer = document.querySelector('.archivo-container');
        const archivoDropArea = document.getElementById('archivo-drop-area');
        const archivoSelectBtn = document.getElementById('archivo-select-btn');
        const archivoInput = document.getElementById('archivo-input');

        function ocultarSelector() {
            if (archivoDropArea) archivoDropArea.style.display = 'none';
            if (archivoSelectBtn) archivoSelectBtn.style.display = 'none';
            if (archivoInput) archivoInput.style.display = 'none';
        }
        function mostrarSelector() {
            if (archivoDropArea) archivoDropArea.style.display = '';
            if (archivoSelectBtn) archivoSelectBtn.style.display = '';
            if (archivoInput) archivoInput.style.display = '';
        }

        archivoTransmitBtn.addEventListener('click', async () => {
            if (transmisionActiva) {
                return;
            }
            if (!archivoSeleccionado) return;
            cancelando = false;
            transmisionActiva = true;
            archivoTransmitBtn.textContent = 'transmitir archivo';
            archivoTransmitBtn.disabled = true;
            archivoProgressContainer.style.display = 'block';
            archivoProgressText.textContent = 'transmitiendo archivo...';
            archivoProgressBar.style.background = '#0ff';
            ocultarSelector();

            try {
                await emitirArchivoRobusto(archivoSeleccionado, {
                    cancelar: () => cancelando
                }, (progreso) => {
                    if (archivoProgressBar) archivoProgressBar.style.width = progreso.progreso + '%';
                    if (archivoProgressPercent) archivoProgressPercent.textContent = progreso.progreso + '%';
                    if (onProgreso) onProgreso(progreso);
                });

                archivoProgressText.textContent = 'archivo transmitido';
                archivoProgressBar.style.background = '#00ff41';
                setTimeout(() => {
                    archivoProgressContainer.style.display = 'none';
                    mostrarSelector();
                    archivoTransmitBtn.disabled = false;
                    transmisionActiva = false;
                }, 2000);

            } catch (error) {
                console.error('Error al transmitir archivo:', error);
                archivoProgressText.textContent = 'error en transmisión';
                archivoProgressBar.style.background = '#ff184c';
                setTimeout(() => {
                    archivoProgressContainer.style.display = 'none';
                    mostrarSelector();
                    archivoTransmitBtn.disabled = false;
                    transmisionActiva = false;
                }, 2000);
            }
        });
    }
} 