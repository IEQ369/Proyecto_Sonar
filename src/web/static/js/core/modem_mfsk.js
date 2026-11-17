/**
 * Capa física del protocolo de archivos V2: módem MFSK de 16 tonos.
 *
 * - Cada símbolo de datos transporta 4 bits (un nibble) como un tono entre 16.
 * - Los tonos de control son propios; ninguno comparte frecuencia con datos.
 * - Dos símbolos consecutivos nunca usan el mismo tono: si un nibble se
 *   repite, se emite el tono REPETIR. El receptor no necesita reloj: cada
 *   cambio de tono estable es un símbolo nuevo.
 * - Todos los tonos quedan por debajo de 19,8 kHz, representables también a
 *   44,1 kHz (E003).
 */
import { generarMuestrasOnda } from '../generador_onda.js';
import {
    BYTES_ANTES_DE_DATOS,
    MAX_DATOS_PAQUETE,
    leerPaquete,
    longitudTotalPaquete
} from './trama_archivos.js';

export const MFSK = Object.freeze({
    baseHz: 18200,
    pasoHz: 80,
    // La decisión llega hasta medio paso: el CRC de cada paquete descarta los
    // símbolos equivocados, así que no hace falta zona muerta (E006).
    distanciaMaximaHz: 40,
    duracionSimboloS: 0.08,
    amplitud: 0.15,
    fadeS: 0.004,
    paresDePreambulo: 2
});

export const SIMBOLO_PRE_A = 'A';
export const SIMBOLO_PRE_B = 'B';
export const SIMBOLO_REPETIR = 'R';

// Posiciones: 0 = A, 1 = B, 2 = REPETIR, 3 = guarda, 4…19 = nibbles 0…15.
const POSICION = { [SIMBOLO_PRE_A]: 0, [SIMBOLO_PRE_B]: 1, [SIMBOLO_REPETIR]: 2 };
const PRIMERA_POSICION_DATOS = 4;
const SIMBOLO_POR_POSICION = [
    SIMBOLO_PRE_A, SIMBOLO_PRE_B, SIMBOLO_REPETIR, null,
    ...Array.from({ length: 16 }, (_, nibble) => nibble)
];

export function frecuenciaDeSimbolo(simbolo) {
    const posicion = typeof simbolo === 'number'
        ? PRIMERA_POSICION_DATOS + simbolo
        : POSICION[simbolo];

    if (
        posicion === undefined
        || (typeof simbolo === 'number'
            && (!Number.isInteger(simbolo) || simbolo < 0 || simbolo > 15))
    ) {
        throw new RangeError(`Símbolo desconocido: ${simbolo}`);
    }

    return MFSK.baseHz + posicion * MFSK.pasoHz;
}

export const FRECUENCIA_MAXIMA_MFSK_HZ = frecuenciaDeSimbolo(15);

/** Símbolo cuya frecuencia nominal está más cerca, o `null` si está lejos. */
export function decidirSimbolo(frecuenciaHz) {
    if (!Number.isFinite(frecuenciaHz)) return null;

    const posicion = Math.round((frecuenciaHz - MFSK.baseHz) / MFSK.pasoHz);
    const distancia = Math.abs(
        frecuenciaHz - (MFSK.baseHz + posicion * MFSK.pasoHz)
    );

    if (
        posicion < 0
        || posicion >= SIMBOLO_POR_POSICION.length
        || distancia >= MFSK.distanciaMaximaHz
    ) {
        return null;
    }

    return SIMBOLO_POR_POSICION[posicion];
}

/** Convierte los bytes de un paquete en la secuencia de símbolos a emitir. */
export function codificarPaquete(bytes) {
    const simbolos = [];
    let previo = null;

    for (let par = 0; par < MFSK.paresDePreambulo; par++) {
        simbolos.push(SIMBOLO_PRE_A, SIMBOLO_PRE_B);
    }
    for (const byte of bytes) {
        for (const nibble of [byte >> 4, byte & 0x0F]) {
            if (nibble === previo) {
                simbolos.push(SIMBOLO_REPETIR);
                previo = null;
            } else {
                simbolos.push(nibble);
                previo = nibble;
            }
        }
    }

    return simbolos;
}

/** Audio de una secuencia de símbolos, sin pausas entre ellos. */
export function sintetizarSimbolos(simbolos, opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const bloques = simbolos.map((simbolo) => generarMuestrasOnda({
        frecuencia: frecuenciaDeSimbolo(simbolo) + (opciones.desvioHz ?? 0),
        duracion: opciones.duracionSimboloS ?? MFSK.duracionSimboloS,
        tipo: 'sine',
        amplitud: opciones.amplitud ?? MFSK.amplitud,
        sampleRate,
        fadeTime: opciones.fadeS ?? MFSK.fadeS
    }));
    const total = bloques.reduce((suma, bloque) => suma + bloque.length, 0);
    const muestras = new Float32Array(total);
    let inicio = 0;

    for (const bloque of bloques) {
        muestras.set(bloque, inicio);
        inicio += bloque.length;
    }

    return muestras;
}

/** Duración en el aire de un paquete de `longitudDatos` bytes útiles. */
export function duracionPaqueteS(longitudDatos, opciones = {}) {
    const simbolos = 2 * MFSK.paresDePreambulo
        + 2 * longitudTotalPaquete(longitudDatos);

    return simbolos * (opciones.duracionSimboloS ?? MFSK.duracionSimboloS);
}

/**
 * Demodulador sin reloj. Recibe un cuadro del analizador por llamada y
 * devuelve un evento cuando termina un paquete:
 *   { tipo: 'paquete', paquete }      paquete válido, ya leído
 *   { tipo: 'descartado', motivo }    paquete incompleto o con CRC incorrecto
 */
export class DemoduladorMfsk {
    constructor(opciones = {}) {
        this.cuadrosEstables = opciones.cuadrosEstables ?? 2;
        this.margenSobrePiso = opciones.margenSobrePiso ?? 55;
        this.timeoutMs = opciones.timeoutMs ?? 1500;
        this.candidato = null;
        this.cuadrosDelCandidato = 0;
        this.ultimoEmitido = null;
        this.estado = 'ESPERA_A';
        this.nibbles = [];
        this.previo = null;
        this.tiempoUltimoSimbolo = null;
    }

    procesarCuadro({ tMs, frecuenciaHz, magnitud, pisoRuido }) {
        const evento = this.comprobarTimeout(tMs);
        const hayTono = Number.isFinite(magnitud)
            && magnitud - (pisoRuido ?? 0) >= this.margenSobrePiso;
        const simbolo = hayTono ? decidirSimbolo(frecuenciaHz) : null;

        if (simbolo === this.candidato) {
            this.cuadrosDelCandidato++;
        } else {
            this.candidato = simbolo;
            this.cuadrosDelCandidato = 1;
        }

        if (
            this.cuadrosDelCandidato < this.cuadrosEstables
            || simbolo === this.ultimoEmitido
        ) {
            return evento;
        }

        this.ultimoEmitido = simbolo;
        if (simbolo === null) {
            return evento;
        }

        this.tiempoUltimoSimbolo = tMs;
        return this.recibirSimbolo(simbolo) ?? evento;
    }

    comprobarTimeout(tMs) {
        if (
            this.estado === 'DATOS'
            && this.tiempoUltimoSimbolo !== null
            && tMs - this.tiempoUltimoSimbolo > this.timeoutMs
        ) {
            return this.descartar('se interrumpió la señal');
        }
        return null;
    }

    descartar(motivo) {
        const habiaDatos = this.nibbles.length > 0;

        this.estado = 'ESPERA_A';
        this.nibbles = [];
        this.previo = null;
        return habiaDatos ? { tipo: 'descartado', motivo } : null;
    }

    recibirSimbolo(simbolo) {
        if (simbolo === SIMBOLO_PRE_A) {
            const evento = this.estado === 'DATOS'
                ? this.descartar('llegó un preámbulo antes de terminar')
                : null;

            this.estado = 'ESPERA_B';
            return evento;
        }
        if (simbolo === SIMBOLO_PRE_B) {
            if (this.estado === 'ESPERA_B') {
                this.estado = 'DATOS';
                this.nibbles = [];
                this.previo = null;
                return null;
            }
            return this.descartar('preámbulo fuera de lugar');
        }
        if (this.estado !== 'DATOS') {
            return null;
        }

        if (simbolo === SIMBOLO_REPETIR) {
            if (this.previo === null) {
                return this.descartar('repetición sin símbolo previo');
            }
            this.nibbles.push(this.previo);
            this.previo = null;
        } else {
            this.nibbles.push(simbolo);
            this.previo = simbolo;
        }

        const nibblesDeLongitud = 2 * BYTES_ANTES_DE_DATOS;

        if (this.nibbles.length < nibblesDeLongitud) {
            return null;
        }

        const longitudDatos = (this.nibbles[nibblesDeLongitud - 2] << 4)
            | this.nibbles[nibblesDeLongitud - 1];

        if (longitudDatos > MAX_DATOS_PAQUETE) {
            return this.descartar('longitud fuera de rango');
        }
        if (this.nibbles.length < 2 * longitudTotalPaquete(longitudDatos)) {
            return null;
        }

        const bytes = new Uint8Array(this.nibbles.length / 2);

        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = (this.nibbles[2 * i] << 4) | this.nibbles[2 * i + 1];
        }

        const paquete = leerPaquete(bytes);

        this.estado = 'ESPERA_A';
        this.nibbles = [];
        this.previo = null;

        return paquete.valido
            ? { tipo: 'paquete', paquete }
            : { tipo: 'descartado', motivo: paquete.motivo };
    }
}
