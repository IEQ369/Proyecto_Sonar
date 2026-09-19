import test from 'node:test';
import assert from 'node:assert/strict';

import {
    crearEnlaceDescarga,
    crearEntradaHistorialArchivo
} from '../src/web/archivos/static/js/ui_recepcion_archivos.js';

function crearDocumentoFalso() {
    return {
        createElement(etiqueta) {
            return {
                etiqueta,
                style: {},
                hijos: [],
                append(...hijos) {
                    this.hijos.push(...hijos);
                },
                set innerHTML(_) {
                    throw new Error('No debe interpretarse HTML externo');
                }
            };
        }
    };
}

test('el nombre recibido se conserva como texto y atributo de descarga', () => {
    const documento = crearDocumentoFalso();
    const nombre = '<img src=x onerror=alert(1)>.txt';
    const enlace = crearEnlaceDescarga(documento, { nombre }, 'blob:prueba');

    assert.equal(enlace.etiqueta, 'a');
    assert.equal(enlace.href, 'blob:prueba');
    assert.equal(enlace.download, nombre);
    assert.equal(enlace.textContent, `descargar archivo recibido (${nombre})`);
});

test('el historial muestra el nombre recibido sin convertirlo en elementos HTML', () => {
    const documento = crearDocumentoFalso();
    const mensaje = 'Archivo recibido: <svg onload=alert(1)> (12 bytes)';
    const entrada = crearEntradaHistorialArchivo(documento, mensaje, 'received', '[12:00:00]');

    assert.equal(entrada.etiqueta, 'div');
    assert.equal(entrada.hijos[0].textContent, '[12:00:00]');
    assert.equal(entrada.hijos[2].textContent, '[ARCHIVO]');
    assert.equal(entrada.hijos[4].textContent, mensaje);
    assert.equal(entrada.hijos[4].etiqueta, 'span');
});
