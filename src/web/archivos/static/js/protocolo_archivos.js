// protocolo_archivos.js
// Protocolo robusto para transmisión de archivos por ultrasonido

import { SYMBOL_DURATION, MARKER_DURATION, CHARACTER_GAP } from '../../../static/js/protocolo_ultrasonico.js';

// ===================== PROTOCOLO ROBUSTO PARA ARCHIVOS =====================
// Este bloque NO afecta la mensajería, solo la transmisión de archivos

export const PROTOCOLO_ARCHIVOS = {
    // Frecuencias equidistantes dentro de 18890-19500 Hz
    START: 18700,
    SYNC: 19195,
    DATA_0: 18700,
    DATA_1: 19195,
    END: 19500,
    ACK: 19500,
    // Duraciones
    PREAMBULO_REPS: 5,
    SOI: [1, 0, 1, 0, 1, 0, 1, 0],
    SOI_REPS: 3,
    CABECERA_REPS: 3,
    CABECERA_BYTES: 22, // 4 tamaño + 16 nombre + 2 CRC16
    BLOQUE_DATOS: 8, // bytes por bloque
    CRC_BLOQUE: 1, // byte extra por bloque
    TIMEOUT_MS: 2000,
    SYMBOL_DURATION: 0.12
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

// Función para codificar la cabecera robusta
export function codificarCabeceraArchivo(tamano, nombre, crc) {
    const buffer = new Uint8Array(PROTOCOLO_ARCHIVOS.CABECERA_BYTES);
    // tamaño (4 bytes little endian)
    buffer[0] = tamano & 0xFF;
    buffer[1] = (tamano >> 8) & 0xFF;
    buffer[2] = (tamano >> 16) & 0xFF;
    buffer[3] = (tamano >> 24) & 0xFF;
    // nombre (16 bytes, ASCII, relleno con 0)
    for (let i = 0; i < 16; i++) {
        buffer[4 + i] = i < nombre.length ? nombre.charCodeAt(i) : 0;
    }
    // CRC16 (2 bytes, little endian)
    buffer[20] = crc & 0xFF;
    buffer[21] = (crc >> 8) & 0xFF;
    return buffer;
}

/**
 * Construye una cabecera autoconsistente calculando CRC16 sobre sus primeros
 * 20 bytes. Se utiliza como referencia verificable del protocolo.
 */
export function crearCabeceraArchivo(tamano, nombre) {
    if (!Number.isInteger(tamano) || tamano < 0 || tamano > 0xFFFFFFFF) {
        throw new RangeError('El tamaño debe ser un entero entre 0 y 2^32-1');
    }

    const cabecera = codificarCabeceraArchivo(tamano, String(nombre), 0);
    const crc = crc16ccitt(cabecera.slice(0, 20));
    cabecera[20] = crc & 0xFF;
    cabecera[21] = (crc >> 8) & 0xFF;
    return cabecera;
}

/**
 * Lee los campos de una cabecera y comprueba su CRC16.
 */
export function decodificarCabeceraArchivo(cabecera) {
    if (
        !(cabecera instanceof Uint8Array)
        || cabecera.length !== PROTOCOLO_ARCHIVOS.CABECERA_BYTES
    ) {
        throw new TypeError('La cabecera debe ser un Uint8Array de 22 bytes');
    }

    const vista = new DataView(
        cabecera.buffer,
        cabecera.byteOffset,
        cabecera.byteLength
    );
    const tamano = vista.getUint32(0, true);
    let nombre = '';

    for (let indice = 4; indice < 20 && cabecera[indice] !== 0; indice++) {
        nombre += String.fromCharCode(cabecera[indice]);
    }

    const crcRecibido = vista.getUint16(20, true);
    const crcCalculado = crc16ccitt(cabecera.slice(0, 20));

    return {
        valida: crcRecibido === crcCalculado,
        tamano,
        nombre,
        crcRecibido,
        crcCalculado
    };
}

// CRC16-CCITT simple para la cabecera
export function crc16ccitt(buf) {
    let crc = 0xFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i] << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
            else crc <<= 1;
            crc &= 0xFFFF;
        }
    }
    return crc;
}

// Codifica un bloque de datos con CRC8
export function codificarBloqueDatos(bytes) {
    const bloque = new Uint8Array(bytes.length + 1);
    bloque.set(bytes, 0);
    bloque[bytes.length] = crc8(bytes);
    return bloque;
}

/**
 * Separa payload y CRC8, y devuelve el resultado de validación.
 */
export function decodificarBloqueDatos(bloque) {
    if (!(bloque instanceof Uint8Array) || bloque.length < 1) {
        throw new TypeError('El bloque debe ser un Uint8Array con CRC8');
    }

    const datos = bloque.slice(0, -1);
    const crcRecibido = bloque[bloque.length - 1];
    const crcCalculado = crc8(datos);

    return {
        valido: crcRecibido === crcCalculado,
        datos,
        crcRecibido,
        crcCalculado
    };
}

// CRC8 simple para bloques
export function crc8(buf) {
    let crc = 0;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 0x80) crc = (crc << 1) ^ 0x07;
            else crc <<= 1;
            crc &= 0xFF;
        }
    }
    return crc;
}
