import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    setupEmisorArchivoUI
} from '../src/web/archivos/static/js/emisor_archivos.js';

function crearElementoFalso() {
    const listeners = new Map();
    const clases = new Set();

    return {
        disabled: false,
        files: [],
        style: {},
        textContent: '',
        title: '',
        clicks: 0,
        listeners,
        classList: {
            add(clase) {
                clases.add(clase);
            },
            remove(clase) {
                clases.delete(clase);
            },
            contains(clase) {
                return clases.has(clase);
            }
        },
        addEventListener(tipo, listener) {
            const registrados = listeners.get(tipo) ?? [];
            registrados.push(listener);
            listeners.set(tipo, registrados);
        },
        click() {
            this.clicks++;
        }
    };
}

function crearEntornoUI() {
    const elementos = {
        'archivo-transmit-btn': crearElementoFalso(),
        'archivo-progress-container': crearElementoFalso(),
        'archivo-progress-bar': crearElementoFalso(),
        'archivo-progress-percent': crearElementoFalso(),
        'archivo-drop-area': crearElementoFalso(),
        'archivo-select-btn': crearElementoFalso(),
        'archivo-input': crearElementoFalso(),
        'archivo-nombre': crearElementoFalso()
    };
    const textoProgreso = crearElementoFalso();
    const documento = {
        getElementById(id) {
            return elementos[id] ?? null;
        },
        querySelector(selector) {
            return selector === '.archivo-progress-text'
                ? textoProgreso
                : null;
        }
    };

    return { elementos, textoProgreso, documento };
}

test('input y arrastre actualizan el mismo archivo usado por el emisor', async () => {
    const { elementos, documento } = crearEntornoUI();
    const archivoInput = { name: 'input.bin', size: 1024 };
    const archivoArrastrado = { name: 'drop.bin', size: 7 };
    const archivosEmitidos = [];
    const controlador = setupEmisorArchivoUI(
        null,
        {
            documento,
            emitir: async (archivo) => {
                archivosEmitidos.push(archivo);
            },
            programar: (callback) => callback()
        }
    );
    const cambio = elementos['archivo-input'].listeners.get('change')[0];
    const soltar = elementos['archivo-drop-area'].listeners.get('drop')[0];

    cambio({ target: { files: [archivoInput] } });
    assert.equal(controlador.obtenerArchivoSeleccionado(), archivoInput);
    assert.equal(elementos['archivo-nombre'].textContent, 'input.bin');

    soltar({
        preventDefault() {},
        dataTransfer: { files: [archivoArrastrado] }
    });
    assert.equal(controlador.obtenerArchivoSeleccionado(), archivoArrastrado);
    assert.equal(elementos['archivo-nombre'].textContent, 'drop.bin');

    assert.equal(await controlador.transmitirArchivo(), true);
    assert.deepEqual(archivosEmitidos, [archivoArrastrado]);
});

test('la plantilla no crea una segunda instancia de ReceptorArchivos', () => {
    const templateUrl = new URL(
        '../src/web/archivos/templates/index.html',
        import.meta.url
    );
    const appUrl = new URL(
        '../src/web/archivos/static/js/app_archivos.js',
        import.meta.url
    );
    const template = readFileSync(templateUrl, 'utf8');
    const app = readFileSync(appUrl, 'utf8');
    const instancias = `${template}\n${app}`.match(/new ReceptorArchivos\(/g) ?? [];

    assert.equal(instancias.length, 1);
    assert.doesNotMatch(template, /import \{ ReceptorArchivos \}/);
});
