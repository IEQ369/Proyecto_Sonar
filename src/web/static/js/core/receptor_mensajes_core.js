import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    SYMBOL_DURATION,
    CHARACTER_GAP,
    charToFrequency,
    frequencyToChar
} from '../protocolo_ultrasonico.js';

export const ESTADOS_RECEPTOR = Object.freeze({
    IDLE: 'IDLE',
    SYNC: 'SYNC',
    DATA: 'DATA'
});

/**
 * Máquina de estados del receptor de mensajes.
 *
 * No conoce el micrófono, Web Audio API ni la interfaz. Recibe detecciones ya
 * calculadas y devuelve eventos que otro módulo puede mostrar o medir.
 */
export class ReceptorMensajesCore {
    constructor(opciones = {}) {
        this.toleranciaHz = opciones.toleranciaHz ?? 60;
        this.magnitudMinima = opciones.magnitudMinima ?? 12;
        this.frecuenciaMinimaHz = opciones.frecuenciaMinimaHz ?? 18000;
        this.tamanoHistorial = opciones.tamanoHistorial ?? 5;
        this.deteccionesEstables = opciones.deteccionesEstables ?? 3;
        this.timeoutMs = opciones.timeoutMs ?? 2000;
        this.bloqueoSimboloMs = opciones.bloqueoSimboloMs
            ?? (SYMBOL_DURATION + CHARACTER_GAP) * 1000;
        this.historialFrecuencias = [];

        this.reiniciar();
    }

    reiniciar({ limpiarHistorial = false } = {}) {
        this.estado = ESTADOS_RECEPTOR.IDLE;
        this.buffer = '';
        this.ultimoCaracter = '';
        this.ultimoTiempoSimbolo = null;

        if (limpiarHistorial) {
            this.historialFrecuencias = [];
        }
    }

    registrarFrecuencia(frecuenciaHz) {
        this.historialFrecuencias.push(frecuenciaHz);

        if (this.historialFrecuencias.length > this.tamanoHistorial) {
            this.historialFrecuencias.shift();
        }
    }

    esFrecuenciaEstable(frecuenciaObjetivoHz) {
        const coincidencias = this.historialFrecuencias.filter(
            (frecuenciaHz) => (
                Math.abs(frecuenciaHz - frecuenciaObjetivoHz)
                < this.toleranciaHz
            )
        );

        return coincidencias.length >= this.deteccionesEstables;
    }

    estaCerca(frecuenciaHz, frecuenciaObjetivoHz) {
        return Math.abs(frecuenciaHz - frecuenciaObjetivoHz)
            <= this.toleranciaHz;
    }

    comprobarTimeout(tiempoMs) {
        const estaRecibiendo = this.estado !== ESTADOS_RECEPTOR.IDLE;
        const poseeReferenciaTemporal = this.ultimoTiempoSimbolo !== null;

        if (
            estaRecibiendo
            && poseeReferenciaTemporal
            && tiempoMs - this.ultimoTiempoSimbolo > this.timeoutMs
        ) {
            this.reiniciar({ limpiarHistorial: true });
            return {
                tipo: 'timeout',
                estado: this.estado
            };
        }

        return null;
    }

    procesarDeteccion({ frecuenciaHz, magnitud, tiempoMs }) {
        if (!Number.isFinite(tiempoMs)) {
            throw new TypeError('tiempoMs debe ser un número finito');
        }

        const eventoTimeout = this.comprobarTimeout(tiempoMs);
        if (eventoTimeout) {
            return eventoTimeout;
        }

        if (Number.isFinite(frecuenciaHz)) {
            this.registrarFrecuencia(frecuenciaHz);
        }

        if (
            !Number.isFinite(frecuenciaHz)
            || !Number.isFinite(magnitud)
            || magnitud < this.magnitudMinima
            || frecuenciaHz < this.frecuenciaMinimaHz
        ) {
            return null;
        }

        if (this.estado === ESTADOS_RECEPTOR.IDLE) {
            if (
                this.estaCerca(frecuenciaHz, START_FREQUENCY)
                && this.esFrecuenciaEstable(START_FREQUENCY)
            ) {
                this.estado = ESTADOS_RECEPTOR.SYNC;
                this.buffer = '';
                this.ultimoCaracter = '';
                this.ultimoTiempoSimbolo = tiempoMs;

                return {
                    tipo: 'inicio',
                    estado: this.estado,
                    frecuenciaHz
                };
            }

            return null;
        }

        if (this.estado === ESTADOS_RECEPTOR.SYNC) {
            if (
                this.estaCerca(frecuenciaHz, SYNC_FREQUENCY)
                && this.esFrecuenciaEstable(SYNC_FREQUENCY)
            ) {
                this.estado = ESTADOS_RECEPTOR.DATA;
                this.ultimoTiempoSimbolo = tiempoMs;

                return {
                    tipo: 'sincronizado',
                    estado: this.estado,
                    frecuenciaHz
                };
            }

            return null;
        }

        if (
            this.estaCerca(frecuenciaHz, END_FREQUENCY)
            && this.esFrecuenciaEstable(END_FREQUENCY)
        ) {
            const mensaje = this.buffer;
            this.reiniciar({ limpiarHistorial: true });

            return {
                tipo: 'mensaje_completo',
                estado: this.estado,
                mensaje,
                frecuenciaHz
            };
        }

        if (
            this.estaCerca(frecuenciaHz, SYNC_FREQUENCY)
            && this.esFrecuenciaEstable(SYNC_FREQUENCY)
        ) {
            this.ultimoTiempoSimbolo = tiempoMs;

            return {
                tipo: 'separador',
                estado: this.estado,
                frecuenciaHz
            };
        }

        const caracterDetectado = frequencyToChar(frecuenciaHz);
        const tiempoDesdeUltimo = this.ultimoTiempoSimbolo === null
            ? Number.POSITIVE_INFINITY
            : tiempoMs - this.ultimoTiempoSimbolo;

        if (
            caracterDetectado
            && this.esFrecuenciaEstable(charToFrequency(caracterDetectado))
            && (
                caracterDetectado !== this.ultimoCaracter
                || tiempoDesdeUltimo > this.bloqueoSimboloMs
            )
        ) {
            this.buffer += caracterDetectado;
            this.ultimoCaracter = caracterDetectado;
            this.ultimoTiempoSimbolo = tiempoMs;

            return {
                tipo: 'caracter',
                estado: this.estado,
                caracter: caracterDetectado,
                mensajeParcial: this.buffer,
                frecuenciaHz
            };
        }

        return null;
    }
}
