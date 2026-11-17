/**
 * Capa de transferencia del protocolo de archivos V2.
 *
 * Parte un archivo en paquetes numerados y lo reconstruye en el receptor,
 * que sabe en todo momento qué paquetes le faltan. Sigue la idea de XMODEM:
 * bloques pequeños, cada uno comprobado, y reenvío de los que fallan.
 */
import { TIPO_PAQUETE, crc32, crearPaquete } from './trama_archivos.js';

export const TAMANO_BLOQUE = 16;
export const MAX_BYTES_NOMBRE = 20;
export const MAX_BLOQUES = 0xFFFF;

const codificador = new TextEncoder();

function codificarNombre(nombre) {
    let texto = String(nombre ?? '');
    let bytes = codificador.encode(texto);

    // Recorta por caracteres completos, nunca a mitad de una secuencia UTF-8.
    while (bytes.length > MAX_BYTES_NOMBRE) {
        texto = [...texto].slice(0, -1).join('');
        bytes = codificador.encode(texto);
    }
    return bytes;
}

/**
 * Paquetes de una transferencia: la cabecera (secuencia 0), los bloques de
 * datos (secuencias 1…N) y el fin (secuencia N + 1).
 */
export function crearPaquetesArchivo(bytes, nombre) {
    if (!(bytes instanceof Uint8Array)) {
        throw new TypeError('El contenido debe ser un Uint8Array');
    }

    const totalBloques = Math.ceil(bytes.length / TAMANO_BLOQUE);

    if (totalBloques > MAX_BLOQUES - 1) {
        throw new RangeError('El archivo es demasiado grande para el protocolo');
    }

    const crcArchivo = crc32(bytes);
    const id = crcArchivo & 0xFF;
    const nombreBytes = codificarNombre(nombre);
    const cabecera = new Uint8Array(12 + nombreBytes.length);
    const vista = new DataView(cabecera.buffer);

    vista.setUint32(0, bytes.length);
    vista.setUint32(4, crcArchivo);
    vista.setUint16(8, totalBloques);
    cabecera[10] = TAMANO_BLOQUE;
    cabecera[11] = nombreBytes.length;
    cabecera.set(nombreBytes, 12);

    return {
        id,
        totalBloques,
        cabecera: crearPaquete({
            tipo: TIPO_PAQUETE.CABECERA, id, secuencia: 0, datos: cabecera
        }),
        datos: Array.from({ length: totalBloques }, (_, indice) => crearPaquete({
            tipo: TIPO_PAQUETE.DATOS,
            id,
            secuencia: indice + 1,
            datos: bytes.slice(indice * TAMANO_BLOQUE, (indice + 1) * TAMANO_BLOQUE)
        })),
        fin: crearPaquete({
            tipo: TIPO_PAQUETE.FIN, id, secuencia: totalBloques + 1
        })
    };
}

/**
 * Orden de emisión. La cabecera va dos veces al inicio y una al final, porque
 * sin ella el receptor no puede saber qué le falta. Con `faltantes` solo se
 * envían esos bloques (reenvío).
 */
export function ordenDeEnvio(paquetes, faltantes = null) {
    const secuencias = faltantes
        ?? paquetes.datos.map((_, indice) => indice + 1);
    const bloques = [...new Set(secuencias)]
        .filter((secuencia) => secuencia >= 1 && secuencia <= paquetes.totalBloques)
        .sort((a, b) => a - b)
        .map((secuencia) => paquetes.datos[secuencia - 1]);

    return [
        paquetes.cabecera, paquetes.cabecera,
        ...bloques,
        paquetes.cabecera, paquetes.fin
    ];
}

function leerCabecera(datos) {
    if (datos.length < 12 || datos.length !== 12 + datos[11]) {
        return null;
    }

    const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
    const cabecera = {
        tamano: vista.getUint32(0),
        crcArchivo: vista.getUint32(4),
        totalBloques: vista.getUint16(8),
        tamanoBloque: datos[10],
        nombre: new TextDecoder().decode(datos.subarray(12))
    };

    if (
        cabecera.tamanoBloque < 1
        || cabecera.totalBloques
            !== Math.ceil(cabecera.tamano / cabecera.tamanoBloque)
    ) {
        return null;
    }
    return cabecera;
}

/** Reconstruye el archivo a partir de paquetes válidos, en cualquier orden. */
export class ReensambladorArchivos {
    constructor() {
        this.reiniciar(null);
    }

    reiniciar(id) {
        this.id = id;
        this.cabecera = null;
        this.bloques = new Map();
        this.finRecibido = false;
    }

    /** Recibe un paquete ya validado por `leerPaquete`. */
    recibir(paquete) {
        if (!paquete?.valido) {
            return { tipo: 'ignorado', motivo: 'paquete no válido' };
        }
        if (paquete.id !== this.id) {
            // Otra transferencia: lo anterior ya no se puede completar.
            this.reiniciar(paquete.id);
        }

        if (paquete.tipo === TIPO_PAQUETE.CABECERA) {
            const cabecera = leerCabecera(paquete.datos);

            if (!cabecera) {
                return { tipo: 'ignorado', motivo: 'cabecera malformada' };
            }

            const nueva = this.cabecera === null;

            this.cabecera = cabecera;
            return { tipo: nueva ? 'cabecera' : 'cabecera_repetida' };
        }
        if (paquete.tipo === TIPO_PAQUETE.FIN) {
            this.finRecibido = true;
            return { tipo: 'fin' };
        }

        const repetido = this.bloques.has(paquete.secuencia);

        this.bloques.set(paquete.secuencia, paquete.datos);
        return { tipo: repetido ? 'bloque_repetido' : 'bloque' };
    }

    estado() {
        const total = this.cabecera?.totalBloques ?? null;
        const faltantes = [];

        if (total !== null) {
            for (let secuencia = 1; secuencia <= total; secuencia++) {
                if (!this.bloques.has(secuencia)) faltantes.push(secuencia);
            }
        }

        return {
            tieneCabecera: this.cabecera !== null,
            nombre: this.cabecera?.nombre ?? null,
            tamano: this.cabecera?.tamano ?? null,
            totalBloques: total,
            bloquesRecibidos: total === null
                ? this.bloques.size
                : total - faltantes.length,
            faltantes,
            finRecibido: this.finRecibido,
            completo: total !== null && faltantes.length === 0
        };
    }

    /**
     * Devuelve el archivo si está completo y su CRC32 coincide. Si no,
     * `null`: nunca entrega un archivo parcial o dañado.
     */
    obtenerArchivo() {
        if (!this.estado().completo) return null;

        const { tamano, tamanoBloque, totalBloques, crcArchivo, nombre }
            = this.cabecera;
        const bytes = new Uint8Array(tamano);

        for (let secuencia = 1; secuencia <= totalBloques; secuencia++) {
            const bloque = this.bloques.get(secuencia);
            const inicio = (secuencia - 1) * tamanoBloque;

            if (bloque.length !== Math.min(tamanoBloque, tamano - inicio)) {
                return null;
            }
            bytes.set(bloque, inicio);
        }

        return crc32(bytes) === crcArchivo ? { nombre, bytes } : null;
    }
}

/** Lista compacta de bloques faltantes, por ejemplo "3,7-9". */
export function formatearFaltantes(secuencias) {
    const orden = [...new Set(secuencias)].sort((a, b) => a - b);
    const tramos = [];

    for (let i = 0; i < orden.length; i++) {
        const inicio = orden[i];

        while (i + 1 < orden.length && orden[i + 1] === orden[i] + 1) i++;
        tramos.push(inicio === orden[i] ? `${inicio}` : `${inicio}-${orden[i]}`);
    }
    return tramos.join(',');
}

/** Inverso de `formatearFaltantes`. Lanza si el texto no es válido. */
export function parsearFaltantes(texto, totalBloques) {
    const secuencias = new Set();

    for (const tramo of String(texto).split(',')) {
        const limpio = tramo.trim();

        if (limpio === '') continue;

        const coincidencia = /^(\d+)(?:-(\d+))?$/.exec(limpio);

        if (!coincidencia) {
            throw new RangeError(`No se entiende «${limpio}»`);
        }

        const desde = Number(coincidencia[1]);
        const hasta = Number(coincidencia[2] ?? coincidencia[1]);

        if (desde < 1 || hasta < desde || hasta > totalBloques) {
            throw new RangeError(
                `«${limpio}» está fuera de 1–${totalBloques}`
            );
        }
        for (let secuencia = desde; secuencia <= hasta; secuencia++) {
            secuencias.add(secuencia);
        }
    }

    return [...secuencias].sort((a, b) => a - b);
}
