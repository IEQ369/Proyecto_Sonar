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
    NOMBRE_BYTES: 16,
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
    // nombre (16 bytes UTF-8, relleno con 0)
    const nombreCodificado = codificarNombreArchivo(nombre);
    buffer.set(nombreCodificado, 4);
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
    const nombre = decodificarNombreArchivo(cabecera.slice(4, 20));

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

export function codificarNombreArchivo(nombre) {
    const codificador = new TextEncoder();
    const bytes = [];

    for (const caracter of String(nombre)) {
        const caracterCodificado = codificador.encode(caracter);

        if (
            bytes.length + caracterCodificado.length
            > PROTOCOLO_ARCHIVOS.NOMBRE_BYTES
        ) {
            break;
        }

        bytes.push(...caracterCodificado);
    }

    return new Uint8Array(bytes);
}

export function decodificarNombreArchivo(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        throw new TypeError('El nombre codificado debe ser un Uint8Array');
    }

    const fin = bytes.indexOf(0);
    const contenido = fin === -1 ? bytes : bytes.slice(0, fin);
    return new TextDecoder().decode(contenido);
}

export function calcularTotalSimbolosArchivo(tamanoArchivo) {
    if (!Number.isInteger(tamanoArchivo) || tamanoArchivo < 0) {
        throw new RangeError('El tamaño del archivo debe ser un entero no negativo');
    }

    const bloques = Math.ceil(
        tamanoArchivo / PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
    );

    return PROTOCOLO_ARCHIVOS.PREAMBULO_REPS * 2
        + PROTOCOLO_ARCHIVOS.SOI_REPS * PROTOCOLO_ARCHIVOS.SOI.length
        + PROTOCOLO_ARCHIVOS.CABECERA_REPS
            * PROTOCOLO_ARCHIVOS.CABECERA_BYTES * 8
        + bloques
            * (PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
                + PROTOCOLO_ARCHIVOS.CRC_BLOQUE) * 8
        + 3;
}

export function calcularProgresoArchivo(simbolosTransmitidos, totalSimbolos) {
    if (
        !Number.isInteger(simbolosTransmitidos)
        || !Number.isInteger(totalSimbolos)
        || simbolosTransmitidos < 0
        || totalSimbolos <= 0
    ) {
        throw new RangeError('El progreso requiere cantidades enteras válidas');
    }

    return Math.min(
        100,
        Math.round(simbolosTransmitidos / totalSimbolos * 100)
    );
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
    if (!(bytes instanceof Uint8Array)) {
        throw new TypeError('Los datos del bloque deben ser un Uint8Array');
    }

    if (bytes.length < 1 || bytes.length > PROTOCOLO_ARCHIVOS.BLOQUE_DATOS) {
        throw new RangeError('Un bloque debe contener entre 1 y 8 bytes');
    }

    const datosRellenos = new Uint8Array(PROTOCOLO_ARCHIVOS.BLOQUE_DATOS);
    datosRellenos.set(bytes, 0);
    const bloque = new Uint8Array(
        PROTOCOLO_ARCHIVOS.BLOQUE_DATOS + PROTOCOLO_ARCHIVOS.CRC_BLOQUE
    );
    bloque.set(datosRellenos, 0);
    bloque[PROTOCOLO_ARCHIVOS.BLOQUE_DATOS] = crc8(datosRellenos);
    return bloque;
}

/**
 * Separa payload y CRC8, y devuelve el resultado de validación.
 */
export function decodificarBloqueDatos(bloque, opciones = {}) {
    const longitudEsperada = PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
        + PROTOCOLO_ARCHIVOS.CRC_BLOQUE;

    if (!(bloque instanceof Uint8Array) || bloque.length !== longitudEsperada) {
        throw new TypeError('El bloque debe ser un Uint8Array de 9 bytes');
    }

    const longitudDatos = opciones.longitudDatos
        ?? PROTOCOLO_ARCHIVOS.BLOQUE_DATOS;

    if (
        !Number.isInteger(longitudDatos)
        || longitudDatos < 0
        || longitudDatos > PROTOCOLO_ARCHIVOS.BLOQUE_DATOS
    ) {
        throw new RangeError('La longitud útil debe ser un entero entre 0 y 8');
    }

    const datosRellenos = bloque.slice(0, PROTOCOLO_ARCHIVOS.BLOQUE_DATOS);
    const crcRecibido = bloque[bloque.length - 1];
    const crcCalculado = crc8(datosRellenos);

    return {
        valido: crcRecibido === crcCalculado,
        datos: datosRellenos.slice(0, longitudDatos),
        datosRellenos,
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
