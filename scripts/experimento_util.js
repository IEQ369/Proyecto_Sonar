import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guarda un resultado determinista. A diferencia de E001/E002, estos informes
 * no llevan fecha ni versión de Node: dos ejecuciones con el mismo código
 * deben producir el mismo archivo, y CI lo comprueba.
 */
export function guardarResultado(rutaRelativa, contenido) {
    const ruta = fileURLToPath(new URL(`../${rutaRelativa}`, import.meta.url));

    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(
        ruta,
        typeof contenido === 'string'
            ? contenido
            : `${JSON.stringify(contenido, null, 2)}\n`,
        'utf8'
    );
    return ruta;
}

/** Silencia el aviso de conflictos que el protocolo imprime al cargarse. */
export async function importarEnSilencio(especificador) {
    const original = console.log;
    console.log = () => {};
    try {
        return await import(especificador);
    } finally {
        console.log = original;
    }
}
