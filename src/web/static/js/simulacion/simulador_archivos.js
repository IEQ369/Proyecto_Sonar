/**
 * Simulación de extremo a extremo del protocolo de archivos V2.
 *
 * Sintetiza el audio de cada paquete, lo pasa por el canal simulado y lo
 * analiza cuadro a cuadro como lo haría el navegador, incluido el suavizado
 * temporal del AnalyserNode. No usa micrófono ni altavoz.
 */
import { analizarCuadro } from '../core/medicion_fisica.js';
import {
    DemoduladorMfsk,
    MFSK,
    codificarPaquete,
    sintetizarSimbolos
} from '../core/modem_mfsk.js';
import { aplicarCanalSimulado } from './canal_simulado.js';
import { calcularMagnitudes, magnitudesABytes } from './caracterizacion.js';

/** Analizador con estado: aplica el suavizado entre cuadros consecutivos. */
export function crearAnalizadorSimulado(opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const fftSize = opciones.fftSize ?? 2048;
    const suavizado = opciones.suavizado ?? 0.3;
    let previas = null;

    return function analizar(muestras, inicio) {
        const magnitudes = calcularMagnitudes(muestras, { fftSize, inicio });

        if (previas) {
            for (let bin = 0; bin < magnitudes.length; bin++) {
                magnitudes[bin] = suavizado * previas[bin]
                    + (1 - suavizado) * magnitudes[bin];
            }
        }
        previas = magnitudes;

        return analizarCuadro(magnitudesABytes(magnitudes), { sampleRate, fftSize });
    };
}

/**
 * Transmite una lista de paquetes por el canal simulado y devuelve los que el
 * demodulador entregó como válidos.
 */
export function transmitirPaquetes(paquetes, opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const fftSize = opciones.fftSize ?? 2048;
    const cuadrosPorSegundo = opciones.cuadrosPorSegundo ?? 60;
    const salto = Math.round(sampleRate / cuadrosPorSegundo);
    const pausa = Math.round((opciones.pausaS ?? 0.15) * sampleRate);
    const analizar = crearAnalizadorSimulado({
        sampleRate, fftSize, suavizado: opciones.suavizado
    });
    const demodulador = new DemoduladorMfsk(opciones.demodulador);
    const recibidos = [];
    const descartados = [];
    let muestrasPrevias = 0;
    let duracionS = 0;

    paquetes.forEach((paquete, indice) => {
        const tonos = sintetizarSimbolos(codificarPaquete(paquete), {
            sampleRate,
            duracionSimboloS: opciones.duracionSimboloS,
            amplitud: opciones.amplitud,
            desvioHz: opciones.desvioHz
        });
        const limpio = new Float32Array(tonos.length + 2 * pausa);

        limpio.set(tonos, pausa);

        const recibido = aplicarCanalSimulado(limpio, {
            ganancia: opciones.ganancia ?? 1,
            amplitudRuido: opciones.amplitudRuido ?? 0,
            semilla: (opciones.semilla ?? 369) + indice
        });

        for (let inicio = 0; inicio + fftSize <= recibido.length; inicio += salto) {
            const cuadro = analizar(recibido, inicio);
            const evento = demodulador.procesarCuadro({
                tMs: (muestrasPrevias + inicio + fftSize) / sampleRate * 1000,
                frecuenciaHz: cuadro.picoInterpoladoHz,
                magnitud: cuadro.magnitud,
                pisoRuido: cuadro.pisoRuido
            });

            if (evento?.tipo === 'paquete') recibidos.push(evento.paquete);
            if (evento?.tipo === 'descartado') descartados.push(evento.motivo);
        }

        muestrasPrevias += recibido.length;
        duracionS += (tonos.length + pausa) / sampleRate;
    });

    return {
        enviados: paquetes.length,
        recibidos,
        descartados,
        duracionS: Number(duracionS.toFixed(2)),
        duracionSimboloS: opciones.duracionSimboloS ?? MFSK.duracionSimboloS
    };
}
