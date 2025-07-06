// Receptor binario por ultrasonido
// Protocolo: START, bits (F0/F1), END

import { BINARY_PROTOCOL, frecuenciaToBit, esFrecuenciaControl, bitsToByte, esFrecuenciaConfirmacion, frecuenciaToConfirmacion } from './protocolo_binario.js';
import { generarOnda } from './generador_onda.js';

// Usar las constantes del protocolo binario
const TOLERANCE = BINARY_PROTOCOL.TOLERANCE;

export function bitsToArrayBuffer(bits) {
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8);
        bytes.push(parseInt(byte, 2));
    }
    return new Uint8Array(bytes).buffer;
}

export function detectarBitsDeFrecuencias(frecuencias) {
    // frecuencias: array de frecuencias detectadas (sin START ni END)
    let bits = '';
    for (let f of frecuencias) {
        if (Math.abs(f - BINARY_PROTOCOL.BIT_0) < TOLERANCE) bits += '0';
        else if (Math.abs(f - BINARY_PROTOCOL.BIT_1) < TOLERANCE) bits += '1';
    }
    return bits;
}

// Ejemplo de uso:
// const bits = detectarBitsDeFrecuencias([19000, 19500, 19000, ...]);
// const buffer = bitsToArrayBuffer(bits);
// Luego puedes crear un Blob y descargarlo como archivo 

export class ReceptorBinario {
    constructor() {
        this.estado = 'IDLE';
        this.bufferBits = [];
        this.bufferBytes = [];
        this.archivoRecibido = null;
        this.progreso = 0;
        this.totalBits = 0;
        this.bitsRecibidos = 0;

        // Callbacks
        this.onProgreso = null;
        this.onArchivoCompleto = null;
        this.onEstado = null;
    }

    /**
     * Procesa una frecuencia detectada
     * @param {number} frecuencia - Frecuencia detectada en Hz
     * @param {number} magnitud - Magnitud de la frecuencia
     */
    procesarFrecuencia(frecuencia, magnitud) {
        if (magnitud < 12 || frecuencia < 17000) return;

        // Detectar frecuencias de control
        if (esFrecuenciaControl(frecuencia)) {
            this.procesarControl(frecuencia);
            return;
        }

        // Detectar frecuencias de confirmación
        if (esFrecuenciaConfirmacion(frecuencia)) {
            this.procesarConfirmacion(frecuencia);
            return;
        }

        // Detectar bits de datos
        const bit = frecuenciaToBit(frecuencia);
        if (bit !== null) {
            this.procesarBit(bit);
        }
    }

    /**
 * Detecta automáticamente si es transmisión de archivo o texto
 * @param {number} frecuencia - Frecuencia detectada
 * @returns {string} - 'archivo', 'texto', o null
 */
    detectarTipoTransmision(frecuencia) {
        // Frecuencias de archivo (rango 17000-18000 Hz)
        if (frecuencia >= 17000 && frecuencia <= 18000) {
            return 'archivo';
        }

        // Frecuencias de caracteres (texto) - rango 18600-22300
        if (frecuencia >= 18600 && frecuencia <= 22300) {
            return 'texto';
        }

        return null;
    }

    /**
     * Procesa frecuencias de control (START, SYNC, END)
     */
    procesarControl(frecuencia) {
        if (Math.abs(frecuencia - BINARY_PROTOCOL.START) <= BINARY_PROTOCOL.TOLERANCE) {
            // START detectado
            this.estado = 'SYNC';
            this.bufferBits = [];
            this.bufferBytes = [];
            this.bitsRecibidos = 0;
            this.totalBits = 0;
            this.actualizarEstado('START detectado');
            console.log('START detectado:', frecuencia.toFixed(1), 'Hz');

        } else if (Math.abs(frecuencia - BINARY_PROTOCOL.SYNC) <= BINARY_PROTOCOL.TOLERANCE) {
            if (this.estado === 'SYNC') {
                // SYNC después de START - comenzar datos
                this.estado = 'DATOS';
                this.actualizarEstado('Recibiendo datos...');
                console.log('SYNC detectado, comenzando recepción de datos');
            } else if (this.estado === 'DATOS') {
                // SYNC antes de END - finalizar datos
                this.estado = 'FINALIZANDO';
                this.actualizarEstado('Finalizando archivo...');
                console.log('SYNC final detectado, finalizando archivo');
            }

        } else if (Math.abs(frecuencia - BINARY_PROTOCOL.END) <= BINARY_PROTOCOL.TOLERANCE) {
            // END detectado
            this.finalizarArchivo();
        }
    }

    /**
     * Procesa un bit de datos
     */
    procesarBit(bit) {
        if (this.estado !== 'DATOS') return;

        this.bufferBits.push(bit);
        this.bitsRecibidos++;

        // Cuando tenemos 8 bits, formar un byte
        if (this.bufferBits.length === 8) {
            const byte = bitsToByte(this.bufferBits);
            this.bufferBytes.push(byte);
            this.bufferBits = [];

            // Actualizar progreso
            this.actualizarProgreso();

            console.log(`Byte recibido: ${byte} (${String.fromCharCode(byte)})`);
        }
    }

    /**
     * Finaliza la recepción del archivo
     */
    finalizarArchivo() {
        if (this.estado === 'FINALIZANDO' && this.bufferBytes.length > 0) {
            // Crear archivo desde los bytes recibidos
            const arrayBuffer = new Uint8Array(this.bufferBytes).buffer;
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });

            this.archivoRecibido = {
                nombre: `archivo_recibido_${Date.now()}.bin`,
                datos: blob,
                tamaño: this.bufferBytes.length
            };

            this.actualizarEstado('Archivo recibido completo');
            console.log('Archivo recibido:', this.archivoRecibido.nombre, this.archivoRecibido.tamaño, 'bytes');

            // Descargar archivo automáticamente
            this.descargarArchivo();

            // Resetear estado
            this.resetear();

            // Notificar callback
            if (this.onArchivoCompleto) {
                this.onArchivoCompleto(this.archivoRecibido);
            }

            // Enviar confirmación al emisor
            this.enviarConfirmacion('ACK');
        } else {
            this.actualizarEstado('Error: archivo incompleto');
            console.log('Error: archivo incompleto o sin datos');

            // Enviar rechazo al emisor
            this.enviarConfirmacion('NACK');
            this.resetear();
        }
    }

    /**
     * Envía confirmación al emisor
     */
    enviarConfirmacion(tipo) {
        const freq = tipo === 'ACK' ? BINARY_PROTOCOL.ACK : BINARY_PROTOCOL.NACK;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            generarOnda({
                frecuencia: freq,
                duracion: 0.1,
                tipo: 'sine',
                amplitud: 0.1,
                audioCtx: audioCtx
            });

            console.log(`Confirmación enviada: ${tipo} (${freq} Hz)`);
            setTimeout(() => audioCtx.close(), 200);
        } catch (error) {
            console.error('Error al enviar confirmación:', error);
        }
    }

    /**
     * Procesa confirmación recibida
     */
    procesarConfirmacion(frecuencia) {
        const tipo = frecuenciaToConfirmacion(frecuencia);
        console.log(`Confirmación recibida: ${tipo} (${frecuencia.toFixed(1)} Hz)`);
    }

    /**
     * Descarga el archivo recibido
     */
    descargarArchivo() {
        if (!this.archivoRecibido) return;

        const url = URL.createObjectURL(this.archivoRecibido.datos);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.archivoRecibido.nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Archivo descargado:', this.archivoRecibido.nombre);
    }

    /**
     * Actualiza el progreso de recepción
     */
    actualizarProgreso() {
        if (this.totalBits === 0) {
            // Estimar total basado en bytes recibidos
            this.totalBits = this.bufferBytes.length * 8;
        }

        this.progreso = Math.round((this.bitsRecibidos / (this.totalBits + 16)) * 100); // +16 para START/SYNC/END

        if (this.onProgreso) {
            this.onProgreso({
                progreso: this.progreso,
                bytesRecibidos: this.bufferBytes.length,
                bitsRecibidos: this.bitsRecibidos,
                estado: this.estado
            });
        }
    }

    /**
     * Actualiza el estado del receptor
     */
    actualizarEstado(mensaje) {
        if (this.onEstado) {
            this.onEstado(mensaje);
        }
    }

    /**
     * Resetea el estado del receptor
     */
    resetear() {
        this.estado = 'IDLE';
        this.bufferBits = [];
        this.bufferBytes = [];
        this.archivoRecibido = null;
        this.progreso = 0;
        this.totalBits = 0;
        this.bitsRecibidos = 0;
    }

    /**
     * Configura callbacks
     */
    setCallbacks(onProgreso, onArchivoCompleto, onEstado) {
        this.onProgreso = onProgreso;
        this.onArchivoCompleto = onArchivoCompleto;
        this.onEstado = onEstado;
    }
}