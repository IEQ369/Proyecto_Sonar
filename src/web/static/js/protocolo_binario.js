// protocolo_binario.js
// Protocolo binario para transmisión de archivos por ultrasonido
// Reutiliza las frecuencias y lógica del protocolo ultrasónico existente

import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, SYMBOL_DURATION, MARKER_DURATION, CHARACTER_GAP } from './protocolo_ultrasonico.js';

// Frecuencias para bits (rango completamente separado del protocolo de texto)
export const BIT_FREQUENCIES = {
    BIT_0: 17100,  // Frecuencia para bit 0 (rango 17000-18000 Hz)
    BIT_1: 17600   // Frecuencia para bit 1 (rango 17000-18000 Hz)
};

// Configuración del protocolo binario (frecuencias separadas)
export const BINARY_PROTOCOL = {
    START: 17000,  // Frecuencia separada para archivos
    SYNC: 17500,   // Frecuencia separada para archivos
    END: 18000,    // Frecuencia separada para archivos
    ACK: 17200,    // Frecuencia para confirmación
    NACK: 17700,   // Frecuencia para rechazo
    BIT_0: BIT_FREQUENCIES.BIT_0,
    BIT_1: BIT_FREQUENCIES.BIT_1,
    SYMBOL_DURATION: SYMBOL_DURATION,
    MARKER_DURATION: MARKER_DURATION,
    CHARACTER_GAP: CHARACTER_GAP,
    TOLERANCE: 60,
    TIMEOUT_ACK: 5000,  // 5 segundos para esperar ACK
    MAX_RETRIES: 3      // Máximo 3 reintentos
};

// Conversión de byte a array de bits
export function byteToBits(byte) {
    const bits = [];
    for (let i = 7; i >= 0; i--) {
        bits.push((byte >> i) & 1);
    }
    return bits;
}

// Conversión de array de bits a byte
export function bitsToByte(bits) {
    let byte = 0;
    for (let i = 0; i < 8; i++) {
        byte = (byte << 1) | (bits[i] || 0);
    }
    return byte;
}

// Conversión de archivo a secuencia de frecuencias
export function archivoToSecuencia(archivo) {
    const bytes = new Uint8Array(archivo);
    const secuencia = [];

    // Header: START + SYNC
    secuencia.push({ freq: BINARY_PROTOCOL.START, duracion: BINARY_PROTOCOL.MARKER_DURATION, tipo: 'control' });
    secuencia.push({ freq: BINARY_PROTOCOL.SYNC, duracion: BINARY_PROTOCOL.MARKER_DURATION, tipo: 'control' });

    // Datos: cada byte como 8 bits
    for (let i = 0; i < bytes.length; i++) {
        const bits = byteToBits(bytes[i]);
        for (let j = 0; j < 8; j++) {
            const freq = bits[j] === 0 ? BINARY_PROTOCOL.BIT_0 : BINARY_PROTOCOL.BIT_1;
            secuencia.push({ freq: freq, duracion: BINARY_PROTOCOL.SYMBOL_DURATION, tipo: 'bit', bit: bits[j], byteIndex: i, bitIndex: j });
        }
    }

    // Footer: SYNC + END
    secuencia.push({ freq: BINARY_PROTOCOL.SYNC, duracion: BINARY_PROTOCOL.MARKER_DURATION, tipo: 'control' });
    secuencia.push({ freq: BINARY_PROTOCOL.END, duracion: BINARY_PROTOCOL.MARKER_DURATION, tipo: 'control' });

    return secuencia;
}

// Detección de bit desde frecuencia
export function frecuenciaToBit(frecuencia) {
    if (Math.abs(frecuencia - BINARY_PROTOCOL.BIT_0) <= BINARY_PROTOCOL.TOLERANCE) {
        return 0;
    } else if (Math.abs(frecuencia - BINARY_PROTOCOL.BIT_1) <= BINARY_PROTOCOL.TOLERANCE) {
        return 1;
    }
    return null;
}

// Verificación de frecuencia de control
export function esFrecuenciaControl(frecuencia) {
    return [BINARY_PROTOCOL.START, BINARY_PROTOCOL.SYNC, BINARY_PROTOCOL.END].some(freq =>
        Math.abs(frecuencia - freq) <= BINARY_PROTOCOL.TOLERANCE
    );
}

// Verificación de frecuencia de bit
export function esFrecuenciaBit(frecuencia) {
    return frecuenciaToBit(frecuencia) !== null;
}

// Verificación de frecuencias de confirmación
export function esFrecuenciaConfirmacion(frecuencia) {
    return [BINARY_PROTOCOL.ACK, BINARY_PROTOCOL.NACK].some(freq =>
        Math.abs(frecuencia - freq) <= BINARY_PROTOCOL.TOLERANCE
    );
}

// Detectar tipo de confirmación
export function frecuenciaToConfirmacion(frecuencia) {
    if (Math.abs(frecuencia - BINARY_PROTOCOL.ACK) <= BINARY_PROTOCOL.TOLERANCE) {
        return 'ACK';
    } else if (Math.abs(frecuencia - BINARY_PROTOCOL.NACK) <= BINARY_PROTOCOL.TOLERANCE) {
        return 'NACK';
    }
    return null;
}

// Cálculo de progreso de transmisión
export function calcularProgreso(secuencia, indiceActual) {
    const totalSimbolos = secuencia.length;
    const simbolosTransmitidos = indiceActual + 1;
    return Math.round((simbolosTransmitidos / totalSimbolos) * 100);
}

// Información de transmisión
export function obtenerInfoTransmision(archivo) {
    const bytes = new Uint8Array(archivo);
    const secuencia = archivoToSecuencia(archivo);

    return {
        nombre: archivo.name,
        tamaño: archivo.size,
        bytes: bytes.length,
        bits: bytes.length * 8,
        simbolos: secuencia.length,
        duracionEstimada: secuencia.reduce((total, simbolo) => total + simbolo.duracion, 0)
    };
} 