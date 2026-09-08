import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    SYMBOL_DURATION,
    MARKER_DURATION,
    CHARACTER_GAP,
    charToFrequency,
    normalizarMensaje,
    validarMensaje
} from '../protocolo_ultrasonico.js';
import {
    generarMuestrasOnda,
    generarSilencio,
    concatenarMuestras
} from '../generador_onda.js';

export { normalizarMensaje };

export function crearPlanMensajeSintetico(mensaje, opciones = {}) {
    const mensajeNormalizado = validarMensaje(mensaje);
    const amplitud = opciones.amplitud ?? 0.1;
    const fadeTime = opciones.fadeTime ?? 0.004;
    const segmentos = [
        {
            tipo: 'tono',
            rol: 'START',
            frecuenciaHz: START_FREQUENCY,
            duracion: MARKER_DURATION,
            amplitud,
            fadeTime
        },
        {
            tipo: 'tono',
            rol: 'SYNC_INICIAL',
            frecuenciaHz: SYNC_FREQUENCY,
            duracion: MARKER_DURATION,
            amplitud,
            fadeTime
        }
    ];

    for (const caracter of mensajeNormalizado) {
        segmentos.push({
            tipo: 'tono',
            rol: 'DATA',
            caracter,
            frecuenciaHz: charToFrequency(caracter),
            duracion: SYMBOL_DURATION,
            amplitud,
            fadeTime
        });
        segmentos.push({
            tipo: 'silencio',
            rol: 'GAP',
            duracion: CHARACTER_GAP
        });
    }

    segmentos.push(
        {
            tipo: 'tono',
            rol: 'SYNC_FINAL',
            frecuenciaHz: SYNC_FREQUENCY,
            duracion: MARKER_DURATION,
            amplitud,
            fadeTime
        },
        {
            tipo: 'tono',
            rol: 'END',
            frecuenciaHz: END_FREQUENCY,
            duracion: MARKER_DURATION,
            amplitud,
            fadeTime
        }
    );

    return {
        mensaje: mensajeNormalizado,
        segmentos
    };
}

export function generarMensajeSintetico(mensaje, opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const plan = crearPlanMensajeSintetico(mensaje, opciones);
    const bloques = [];
    const segmentos = [];
    let muestraInicial = 0;

    for (const segmento of plan.segmentos) {
        const muestras = segmento.tipo === 'tono'
            ? generarMuestrasOnda({
                frecuencia: segmento.frecuenciaHz,
                duracion: segmento.duracion,
                tipo: 'sine',
                amplitud: segmento.amplitud,
                sampleRate,
                fadeTime: segmento.fadeTime
            })
            : generarSilencio({
                duracion: segmento.duracion,
                sampleRate
            });
        const muestraFinal = muestraInicial + muestras.length;

        bloques.push(muestras);
        segmentos.push({
            ...segmento,
            muestraInicial,
            muestraFinal
        });
        muestraInicial = muestraFinal;
    }

    return {
        mensaje: plan.mensaje,
        sampleRate,
        muestras: concatenarMuestras(bloques),
        segmentos
    };
}
