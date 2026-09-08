// emisor_archivos.js
// Emisor robusto para archivos por ultrasonido
// Protocolo robusto: preámbulo, SOI, cabecera con CRC, datos, END

import { generarOnda } from '../../../static/js/generador_onda.js';
import {
    PROTOCOLO_ARCHIVOS,
    crearCabeceraArchivo,
    codificarBloqueDatos,
    byteToBits
} from './protocolo_archivos.js';

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
    const cabecera = crearCabeceraArchivo(archivo.size, archivo.name);

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
export function setupEmisorArchivoUI(onProgreso = null, dependencias = {}) {
    const documento = dependencias.documento ?? globalThis.document;
    const emitir = dependencias.emitir ?? emitirArchivoRobusto;
    const programar = dependencias.programar ?? globalThis.setTimeout;
    const archivoTransmitBtn = documento.getElementById('archivo-transmit-btn');
    const archivoProgressContainer = documento.getElementById('archivo-progress-container');
    const archivoProgressBar = documento.getElementById('archivo-progress-bar');
    const archivoProgressPercent = documento.getElementById('archivo-progress-percent');
    const archivoProgressText = documento.querySelector('.archivo-progress-text');
    const archivoDropArea = documento.getElementById('archivo-drop-area');
    const archivoSelectBtn = documento.getElementById('archivo-select-btn');
    const archivoInput = documento.getElementById('archivo-input');
    const archivoNombre = documento.getElementById('archivo-nombre');

    const controlesRequeridos = [
        archivoTransmitBtn,
        archivoProgressContainer,
        archivoProgressBar,
        archivoProgressPercent,
        archivoProgressText,
        archivoDropArea,
        archivoSelectBtn,
        archivoInput,
        archivoNombre
    ];

    if (controlesRequeridos.some((control) => !control)) {
        throw new Error('No se encontraron los controles del emisor de archivos');
    }

    let archivoSeleccionado = null;
    let transmisionActiva = false;

    function ocultarSelector() {
        archivoDropArea.style.display = 'none';
        archivoSelectBtn.style.display = 'none';
        archivoInput.style.display = 'none';
    }

    function mostrarSelector() {
        archivoDropArea.style.display = '';
        archivoSelectBtn.style.display = '';
        archivoInput.style.display = 'none';
    }

    function seleccionarArchivo(archivo) {
        if (!archivo) {
            return false;
        }

        archivoSeleccionado = archivo;
        archivoNombre.textContent = archivo.name;
        archivoNombre.title = `${archivo.name} ${(archivo.size / 1024).toFixed(1)} KB`;
        archivoTransmitBtn.disabled = false;
        archivoProgressContainer.style.display = 'none';
        return true;
    }

    archivoSelectBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        archivoInput.click();
    });

    archivoInput.addEventListener('change', (event) => {
        seleccionarArchivo(event.target.files[0]);
    });

    archivoDropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        archivoDropArea.classList.add('dragover');
    });

    archivoDropArea.addEventListener('dragleave', () => {
        archivoDropArea.classList.remove('dragover');
    });

    archivoDropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        archivoDropArea.classList.remove('dragover');
        seleccionarArchivo(event.dataTransfer.files[0]);
    });

    archivoDropArea.addEventListener('click', () => {
        archivoInput.click();
    });

    async function transmitirArchivo() {
        if (transmisionActiva || !archivoSeleccionado) {
            return false;
        }

        transmisionActiva = true;
        archivoTransmitBtn.textContent = 'transmitir archivo';
        archivoTransmitBtn.disabled = true;
        archivoProgressContainer.style.display = 'block';
        archivoProgressText.textContent = 'transmitiendo archivo...';
        archivoProgressBar.style.background = '#0ff';
        ocultarSelector();

        try {
            await emitir(archivoSeleccionado, {}, (progreso) => {
                archivoProgressBar.style.width = progreso.progreso + '%';
                archivoProgressPercent.textContent = progreso.progreso + '%';
                if (onProgreso) onProgreso(progreso);
            });

            archivoProgressText.textContent = 'archivo transmitido';
            archivoProgressBar.style.background = '#00ff41';
            return true;
        } catch (error) {
            console.error('Error al transmitir archivo:', error);
            archivoProgressText.textContent = 'error en transmisión';
            archivoProgressBar.style.background = '#ff184c';
            return false;
        } finally {
            programar(() => {
                archivoProgressContainer.style.display = 'none';
                mostrarSelector();
                archivoTransmitBtn.disabled = false;
                transmisionActiva = false;
            }, 2000);
        }
    }

    archivoTransmitBtn.addEventListener('click', transmitirArchivo);

    return {
        seleccionarArchivo,
        transmitirArchivo,
        obtenerArchivoSeleccionado: () => archivoSeleccionado,
        estaTransmitiendo: () => transmisionActiva
    };
}
