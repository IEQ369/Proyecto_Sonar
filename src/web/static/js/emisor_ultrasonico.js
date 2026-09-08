// Emisor ultrasónico Web Audio API - Sincronizado con protocolo y mapeo del sistema
// Autor: IA (basado en tu emisor Python)

import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    charToFrequency,
    validarMensaje,
    SYMBOL_DURATION,
    MARKER_DURATION,
    CHARACTER_GAP
} from './protocolo_ultrasonico.js';
import { generarOnda } from './generador_onda.js';

/**
 * Obtiene la amplitud específica para un carácter
 * Aumenta el volumen para caracteres problemáticos (números y algunas letras)
 */
function getAmplitudPorCaracter(caracter, amplitudBase = 0.15) {
    const caracterUpper = caracter.toUpperCase();

    // Números: máxima amplitud (frecuencias muy altas)
    if ('0123456789'.includes(caracterUpper)) {
        // Números 6-9: amplitud extra alta (frecuencias ultra-altas)
        if ('6789'.includes(caracterUpper)) {
            return amplitudBase * 3.5; // 350% del volumen normal
        }
        // Números 0-5: amplitud alta
        return amplitudBase * 2.5; // 250% del volumen normal
    }

    // Letras problemáticas: amplitud aumentada
    if ('CDIÑYZOU'.includes(caracterUpper)) {
        return amplitudBase * 1.8; // 180% del volumen normal
    }

    // Letras en frecuencias altas: amplitud moderadamente aumentada
    if ('VWXYZ'.includes(caracterUpper)) {
        return amplitudBase * 1.4; // 140% del volumen normal
    }

    // Resto de letras: amplitud normal
    return amplitudBase;
}

/**
 * Emite un mensaje por ultrasonido usando el protocolo SONAR, generando la onda manualmente (senoidal pura).
 * @param {string} mensaje - Mensaje en mayúsculas (A-Z, 0-9)
 * @param {object} [opts] - Opciones avanzadas (duraciones, amplitud)
 */
export async function emitirUltrasonico(mensaje, opts = {}) {
    mensaje = validarMensaje(mensaje);

    const AMPLITUDE = opts.AMPLITUDE ?? 0.15;
    const FADE_TIME = opts.FADE_TIME ?? 0.025;
    const SAMPLE_RATE = opts.SAMPLE_RATE ?? 48000;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });

    const secuencia = [
        START_FREQUENCY,
        SYNC_FREQUENCY,
        ...mensaje.split('').map(c => charToFrequency(c)),
        SYNC_FREQUENCY,
        END_FREQUENCY
    ];

    const duraciones = secuencia.map(f =>
        (f === START_FREQUENCY || f === SYNC_FREQUENCY || f === END_FREQUENCY) ? MARKER_DURATION : SYMBOL_DURATION
    );

    console.log('=== EMISION ULTRASONICA ===');
    console.log('Mensaje:', mensaje);

    let now = audioCtx.currentTime;
    for (let i = 0; i < secuencia.length; i++) {
        const freq = secuencia[i];
        const dur = duraciones[i];
        const esControl = freq === START_FREQUENCY || freq === SYNC_FREQUENCY || freq === END_FREQUENCY;

        let amplitud;
        if (esControl) {
            amplitud = AMPLITUDE * 1.2; // Control: amplitud aumentada
        } else {
            // Para caracteres de datos, usar amplitud específica por carácter
            const caracter = mensaje[i - 2]; // -2 porque los primeros 2 son START y SYNC
            amplitud = getAmplitudPorCaracter(caracter, AMPLITUDE);
        }

        generarOnda({
            frecuencia: freq,
            duracion: dur,
            tipo: 'sine',
            amplitud: amplitud,
            sampleRate: SAMPLE_RATE,
            audioCtx: audioCtx,
            fadeTime: FADE_TIME
        });

        console.log(`Tono ${i}: ${freq}Hz (${dur}s)`);

        now += dur;
        if (i > 1 && i < secuencia.length - 2 && dur === SYMBOL_DURATION) {
            now += CHARACTER_GAP;
            await new Promise(res => setTimeout(res, CHARACTER_GAP * 1000));
        }
        await new Promise(res => setTimeout(res, dur * 1000));
    }

    console.log('=== EMISION COMPLETADA ===');
    setTimeout(() => audioCtx.close(), 200);
}

export function setupEmisorUI(visualizer, isTransmittingRef, dependencias = {}) {
    const documento = dependencias.documento ?? globalThis.document;
    const emitir = dependencias.emitir ?? emitirUltrasonico;
    const registrarMensaje = dependencias.registrarMensaje
        ?? ((mensaje, tipo) => globalThis.window?.addToMessageLog?.(mensaje, tipo));
    const input = documento.getElementById('messageInput');
    const status = documento.getElementById('emisor-status');
    const transmitBtn = documento.getElementById('transmit-btn');
    const transmissionStatus = documento.getElementById('transmission-status');
    let isSending = false;

    if (!input || !status || !transmitBtn) {
        throw new Error('No se encontraron los controles del emisor de mensajes');
    }

    async function enviarMensaje() {
        if (isSending) {
            return false;
        }

        let mensaje;
        try {
            mensaje = validarMensaje(input.value);
        } catch (error) {
            status.textContent = error.message;
            return false;
        }

        isSending = true;
        input.disabled = true;
        transmitBtn.disabled = true;
        status.textContent = 'enviando...';
        visualizer.setTransmitMode(true);
        isTransmittingRef.current = true;

        if (transmissionStatus) {
            transmissionStatus.style.display = 'block';
        }

        try {
            await emitir(mensaje, { AMPLITUDE: 0.08, FADE_TIME: 0.035 });
            status.textContent = 'mensaje enviado';
            input.value = '';
            registrarMensaje(mensaje, 'sent');
            return true;
        } catch (error) {
            console.error('Error al emitir:', error);
            status.textContent = 'error al emitir';
            return false;
        } finally {
            isSending = false;
            input.disabled = false;
            transmitBtn.disabled = false;
            visualizer.setTransmitMode(false);
            isTransmittingRef.current = false;

            if (transmissionStatus) {
                transmissionStatus.style.display = 'none';
            }
        }
    }

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            return enviarMensaje();
        }

        return undefined;
    });

    transmitBtn.addEventListener('click', enviarMensaje);

    input.addEventListener('input', function () {
        const inicio = input.selectionStart;
        const fin = input.selectionEnd;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(inicio, fin);
    });

    return {
        enviarMensaje,
        estaEnviando: () => isSending
    };
}
