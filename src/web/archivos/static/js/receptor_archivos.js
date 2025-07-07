// receptor_archivos.js
// Receptor robusto para archivos por ultrasonido
// Protocolo robusto: preámbulo, SOI, cabecera con CRC, datos, END

import { PROTOCOLO_ARCHIVOS, crc16ccitt, bitsToByte } from './protocolo_archivos.js';

const TOLERANCIA = 300;

// ===================== RECEPTOR ROBUSTO SOLO PARA ARCHIVOS =====================
// Máquina de estados y feedback visual para archivos (NO afecta mensajes)
export class ReceptorArchivos {
    constructor() {
        this.estado = 'IDLE';
        this.bufferBits = [];
        this.bufferBytes = [];
        this.cabeceraBits = [];
        this.cabeceraValida = false;
        this.infoCabecera = null;
        this.archivoRecibido = null;
        this.progreso = 0;
        this.totalBloques = 0;
        this.bloquesRecibidos = 0;
        this.freqHistory = [];
        this.HISTORY_SIZE = 5;
        this.timeout = null;
        // Callbacks
        this.onProgreso = null;
        this.onArchivoCompleto = null;
        this.onEstado = null;
    }
    updateFreqHistory(frecuencia) {
        this.freqHistory.push(frecuencia);
        if (this.freqHistory.length > this.HISTORY_SIZE) this.freqHistory.shift();
    }
    isStableFrequency(targetFreq) {
        return this.freqHistory.filter(f => Math.abs(f - targetFreq) < 60).length >= 3;
    }
    resetTimeout(ms) {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.estado = 'IDLE';
            this.bufferBits = [];
            this.bufferBytes = [];
            this.cabeceraBits = [];
            this.cabeceraValida = false;
            this.infoCabecera = null;
            this.archivoRecibido = null;
            this.progreso = 0;
            this.totalBloques = 0;
            this.bloquesRecibidos = 0;
            this.actualizarEstado('timeout, esperando archivo...');
        }, ms || PROTOCOLO_ARCHIVOS.TIMEOUT_MS);
    }
    procesarFrecuencia(frecuencia, magnitud) {
        console.log('[Receptor] Estado:', this.estado, 'Frecuencia:', frecuencia, 'Magnitud:', magnitud);
        if (magnitud < 20 || frecuencia < 18500 || frecuencia > 19600) return;
        this.updateFreqHistory(frecuencia);
        // Máquina de estados
        switch (this.estado) {
            case 'IDLE':
                if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.START) < TOLERANCIA && this.isStableFrequency(PROTOCOLO_ARCHIVOS.START)) {
                    console.log('[Receptor] Detectado START, cambiando a DETECTING_PREAMBLE');
                    this.estado = 'DETECTING_PREAMBLE';
                    this.preambuloCount = 1;
                    this.actualizarEstado('detectando preámbulo...');
                    this.resetTimeout();
                }
                break;
            case 'DETECTING_PREAMBLE':
                if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.SYNC) < TOLERANCIA && this.isStableFrequency(PROTOCOLO_ARCHIVOS.SYNC)) {
                    this.preambuloCount++;
                    console.log('[Receptor] Detectado SYNC, preámbuloCount:', this.preambuloCount);
                    if (this.preambuloCount >= PROTOCOLO_ARCHIVOS.PREAMBULO_REPS) {
                        this.estado = 'DETECTING_SOI';
                        this.soiBits = [];
                        this.soiCount = 0;
                        this.actualizarEstado('detectando SOI...');
                        this.resetTimeout();
                    }
                }
                break;
            case 'DETECTING_SOI':
                if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_0) < TOLERANCIA || Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA) {
                    const bit = Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA ? 1 : 0;
                    this.soiBits.push(bit);
                    console.log('[Receptor] SOI bit:', bit, 'soiBits:', this.soiBits.length);
                    if (this.soiBits.length === PROTOCOLO_ARCHIVOS.SOI.length) {
                        // Comparar SOI
                        let coincidencias = 0;
                        for (let i = 0; i < PROTOCOLO_ARCHIVOS.SOI.length; i++) {
                            if (this.soiBits[i] === PROTOCOLO_ARCHIVOS.SOI[i]) coincidencias++;
                        }
                        let igual = false;
                        if (coincidencias >= 6) igual = true;
                        if (igual) {
                            this.soiCount++;
                            console.log('[Receptor] SOI detectado, soiCount:', this.soiCount);
                            if (this.soiCount >= PROTOCOLO_ARCHIVOS.SOI_REPS) {
                                this.estado = 'RECEIVING_HEADER';
                                this.cabeceraBits = [];
                                this.cabeceraValida = false;
                                this.actualizarEstado('recibiendo cabecera...');
                                this.resetTimeout();
                            } else {
                                this.soiBits = [];
                            }
                        } else {
                            this.soiBits = [];
                            console.log('[Receptor] SOI incorrecto, reiniciando SOI');
                        }
                    }
                }
                break;
            case 'RECEIVING_HEADER':
                if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_0) < TOLERANCIA || Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA) {
                    const bit = Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA ? 1 : 0;
                    this.cabeceraBits.push(bit);
                    if (this.cabeceraBits.length % 8 === 0) {
                        console.log('[Receptor] Recibiendo cabecera, bits:', this.cabeceraBits.length);
                    }
                    if (this.cabeceraBits.length === PROTOCOLO_ARCHIVOS.CABECERA_BYTES * 8 * PROTOCOLO_ARCHIVOS.CABECERA_REPS) {
                        // Decodificar cabecera (mayoría)
                        let cabeceras = [];
                        for (let rep = 0; rep < PROTOCOLO_ARCHIVOS.CABECERA_REPS; rep++) {
                            let bits = this.cabeceraBits.slice(rep * PROTOCOLO_ARCHIVOS.CABECERA_BYTES * 8, (rep + 1) * PROTOCOLO_ARCHIVOS.CABECERA_BYTES * 8);
                            let bytes = [];
                            for (let i = 0; i < bits.length; i += 8) {
                                bytes.push(bitsToByte(bits.slice(i, i + 8)));
                            }
                            cabeceras.push(bytes);
                        }
                        // Mayoría
                        let cabeceraFinal = [];
                        for (let i = 0; i < PROTOCOLO_ARCHIVOS.CABECERA_BYTES; i++) {
                            let vals = cabeceras.map(c => c[i]);
                            cabeceraFinal[i] = vals.sort((a, b) => vals.filter(v => v === a).length - vals.filter(v => v === b).length).pop();
                        }
                        // Validar CRC
                        const crc = (cabeceraFinal[21] << 8) | cabeceraFinal[20];
                        const crcCalc = crc16ccitt(new Uint8Array(cabeceraFinal.slice(0, 20)));
                        if (crc === crcCalc) {
                            this.cabeceraValida = true;
                            // Extraer info
                            const tamano = cabeceraFinal[0] | (cabeceraFinal[1] << 8) | (cabeceraFinal[2] << 16) | (cabeceraFinal[3] << 24);
                            let nombre = '';
                            for (let i = 4; i < 20; i++) if (cabeceraFinal[i]) nombre += String.fromCharCode(cabeceraFinal[i]);
                            this.infoCabecera = { tamano, nombre };
                            this.bufferBytes = [];
                            this.estado = 'RECEIVING_DATA';
                            this.totalBloques = Math.ceil(tamano / 8);
                            this.bloquesRecibidos = 0;
                            this.actualizarEstado(`recibiendo archivo: ${nombre} (${tamano} bytes)`);
                            this.resetTimeout();
                        } else {
                            this.estado = 'ERROR';
                            this.actualizarEstado('error de cabecera (CRC)');
                            this.resetTimeout(2500);
                        }
                    }
                }
                break;
            case 'RECEIVING_DATA':
                if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_0) < TOLERANCIA || Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA) {
                    const bit = Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.DATA_1) < TOLERANCIA ? 1 : 0;
                    this.bufferBits.push(bit);
                    if (this.bufferBits.length % 8 === 0) {
                        console.log('[Receptor] Recibiendo datos, bits:', this.bufferBits.length);
                    }
                    if (this.bufferBits.length === (8 + 1) * 8) { // 8 bytes + CRC8
                        let bytes = [];
                        for (let i = 0; i < 8; i++) {
                            bytes.push(bitsToByte(this.bufferBits.slice(i * 8, (i + 1) * 8)));
                        }
                        const crc = bitsToByte(this.bufferBits.slice(8 * 8, 9 * 8));
                        // Validar CRC8
                        let crcCalc = 0;
                        for (let b of bytes) crcCalc ^= b;
                        if (crc === crcCalc) {
                            for (let b of bytes) this.bufferBytes.push(b);
                            this.bloquesRecibidos++;
                            if (this.onProgreso) {
                                this.onProgreso({
                                    progreso: Math.round((this.bloquesRecibidos / this.totalBloques) * 100),
                                    bloquesRecibidos: this.bloquesRecibidos,
                                    totalBloques: this.totalBloques,
                                    bytesRecibidos: this.bufferBytes.length,
                                    totalBytes: this.infoCabecera.tamano
                                });
                            }
                            this.actualizarEstado(`recibiendo archivo: ${this.infoCabecera.nombre} (${this.bufferBytes.length}/${this.infoCabecera.tamano} bytes)`);
                        } else {
                            this.estado = 'ERROR';
                            this.actualizarEstado('error de bloque (CRC8)');
                            this.resetTimeout(2500);
                        }
                        this.bufferBits = [];
                        this.resetTimeout();
                        // Si ya recibimos todos los bytes
                        if (this.bufferBytes.length >= this.infoCabecera.tamano) {
                            this.estado = 'COMPLETE';
                            this.finalizarArchivo();
                        }
                    }
                } else if (Math.abs(frecuencia - PROTOCOLO_ARCHIVOS.END) < TOLERANCIA && this.isStableFrequency(PROTOCOLO_ARCHIVOS.END)) {
                    console.log('[Receptor] Detectado END, finalizando archivo');
                    this.estado = 'COMPLETE';
                    this.finalizarArchivo();
                }
                break;
            case 'COMPLETE':
                console.log('[Receptor] Estado COMPLETE, esperando reset');
                break;
            case 'ERROR':
                console.log('[Receptor] Estado ERROR, esperando reset');
                break;
        }
    }
    finalizarArchivo() {
        if (this.infoCabecera && this.bufferBytes.length >= this.infoCabecera.tamano) {
            const arrayBuffer = new Uint8Array(this.bufferBytes.slice(0, this.infoCabecera.tamano)).buffer;
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            this.archivoRecibido = {
                nombre: this.infoCabecera.nombre,
                datos: blob,
                tamaño: this.infoCabecera.tamano
            };
            if (this.onArchivoCompleto) this.onArchivoCompleto(this.archivoRecibido);
            this.actualizarEstado(`archivo recibido: ${this.infoCabecera.nombre}`);
            this.resetTimeout(4000);
        } else {
            this.estado = 'ERROR';
            this.actualizarEstado('error de tamaño final');
            this.resetTimeout(2500);
        }
    }
    actualizarEstado(mensaje) {
        if (this.onEstado) this.onEstado(mensaje);
    }
    setCallbacks(onProgreso, onArchivoCompleto, onEstado) {
        this.onProgreso = onProgreso;
        this.onArchivoCompleto = onArchivoCompleto;
        this.onEstado = onEstado;
    }
} 