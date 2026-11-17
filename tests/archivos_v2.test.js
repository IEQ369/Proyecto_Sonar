import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_DATOS_PAQUETE,
    TIPO_PAQUETE,
    crc32,
    crearPaquete,
    leerPaquete
} from '../src/web/static/js/core/trama_archivos.js';
import {
    DemoduladorMfsk,
    FRECUENCIA_MAXIMA_MFSK_HZ,
    MFSK,
    SIMBOLO_PRE_A,
    SIMBOLO_PRE_B,
    SIMBOLO_REPETIR,
    codificarPaquete,
    decidirSimbolo,
    frecuenciaDeSimbolo
} from '../src/web/static/js/core/modem_mfsk.js';
import {
    ReensambladorArchivos,
    TAMANO_BLOQUE,
    crearPaquetesArchivo,
    formatearFaltantes,
    ordenDeEnvio,
    parsearFaltantes
} from '../src/web/static/js/core/transferencia_archivos.js';
import { transmitirPaquetes } from '../src/web/static/js/simulacion/simulador_archivos.js';

function bytesDePrueba(longitud, semilla = 7) {
    const bytes = new Uint8Array(longitud);
    let estado = semilla;

    for (let i = 0; i < longitud; i++) {
        estado = (1103515245 * estado + 12345) >>> 0;
        bytes[i] = (estado >>> 16) & 0xFF;
    }
    return bytes;
}

/** Entrega al demodulador cuadros ideales: tres por símbolo, sin ruido. */
function demodularIdeal(simbolos, demodulador = new DemoduladorMfsk()) {
    const eventos = [];
    let tMs = 0;

    for (const simbolo of simbolos) {
        for (let cuadro = 0; cuadro < 3; cuadro++) {
            tMs += 17;
            const evento = demodulador.procesarCuadro({
                tMs,
                frecuenciaHz: frecuenciaDeSimbolo(simbolo),
                magnitud: 200,
                pisoRuido: 10
            });
            if (evento) eventos.push(evento);
        }
    }
    return eventos;
}

// --- Trama -------------------------------------------------------------------

test('un paquete se lee igual que se creó', () => {
    const datos = bytesDePrueba(16);
    const leido = leerPaquete(crearPaquete({
        tipo: TIPO_PAQUETE.DATOS, id: 0xAB, secuencia: 513, datos
    }));

    assert.equal(leido.valido, true);
    assert.equal(leido.tipo, TIPO_PAQUETE.DATOS);
    assert.equal(leido.id, 0xAB);
    assert.equal(leido.secuencia, 513);
    assert.deepEqual(leido.datos, datos);
});

test('cambiar cualquier byte de un paquete lo invalida', () => {
    const paquete = crearPaquete({
        tipo: TIPO_PAQUETE.DATOS, id: 1, secuencia: 2, datos: bytesDePrueba(8)
    });

    for (let i = 0; i < paquete.length; i++) {
        const alterado = paquete.slice();
        alterado[i] ^= 0x01;
        assert.equal(leerPaquete(alterado).valido, false, `byte ${i}`);
    }
});

test('leerPaquete rechaza entradas truncadas o con longitud imposible', () => {
    const paquete = crearPaquete({ tipo: TIPO_PAQUETE.FIN, id: 0, secuencia: 9 });

    assert.equal(leerPaquete(paquete.slice(0, 5)).valido, false);
    assert.equal(leerPaquete(new Uint8Array(0)).valido, false);
    assert.equal(leerPaquete('no es un paquete').valido, false);
    assert.throws(
        () => crearPaquete({
            tipo: TIPO_PAQUETE.DATOS,
            id: 0,
            secuencia: 1,
            datos: new Uint8Array(MAX_DATOS_PAQUETE + 1)
        }),
        RangeError
    );
});

test('crc32 coincide con el vector estándar', () => {
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
    assert.equal(crc32(new Uint8Array(0)), 0);
});

// --- Módem -------------------------------------------------------------------

test('los tonos son únicos, separados 80 Hz y caben a 44,1 kHz', () => {
    const simbolos = [
        SIMBOLO_PRE_A, SIMBOLO_PRE_B, SIMBOLO_REPETIR,
        ...Array.from({ length: 16 }, (_, nibble) => nibble)
    ];
    const frecuencias = simbolos.map(frecuenciaDeSimbolo).sort((a, b) => a - b);

    assert.equal(new Set(frecuencias).size, 19);
    for (let i = 1; i < frecuencias.length; i++) {
        assert.ok(frecuencias[i] - frecuencias[i - 1] >= MFSK.pasoHz);
    }
    assert.ok(FRECUENCIA_MAXIMA_MFSK_HZ < 20000);
    for (const simbolo of simbolos) {
        const nominal = frecuenciaDeSimbolo(simbolo);

        assert.equal(decidirSimbolo(nominal), simbolo);
        assert.equal(decidirSimbolo(nominal + 39), simbolo);
        assert.equal(decidirSimbolo(nominal - 39), simbolo);
    }
    assert.equal(decidirSimbolo(17000), null);
    assert.equal(decidirSimbolo(frecuenciaDeSimbolo(SIMBOLO_REPETIR) + 80), null);
    assert.throws(() => frecuenciaDeSimbolo(16), RangeError);
});

test('dos símbolos consecutivos nunca usan el mismo tono', () => {
    const paquete = crearPaquete({
        tipo: TIPO_PAQUETE.DATOS,
        id: 0,
        secuencia: 0,
        datos: new Uint8Array(32)
    });
    const simbolos = codificarPaquete(paquete);

    for (let i = 1; i < simbolos.length; i++) {
        assert.notEqual(simbolos[i], simbolos[i - 1]);
    }
    assert.ok(simbolos.includes(SIMBOLO_REPETIR));
});

test('los 256 valores de byte sobreviven a la ida y vuelta del módem', () => {
    const todos = Uint8Array.from({ length: 256 }, (_, i) => i);
    const demodulador = new DemoduladorMfsk();

    for (let inicio = 0; inicio < 256; inicio += 32) {
        const datos = todos.slice(inicio, inicio + 32);
        const eventos = demodularIdeal(
            codificarPaquete(crearPaquete({
                tipo: TIPO_PAQUETE.DATOS, id: 5, secuencia: inicio, datos
            })),
            demodulador
        );

        assert.equal(eventos.length, 1);
        assert.equal(eventos[0].tipo, 'paquete');
        assert.deepEqual(eventos[0].paquete.datos, datos);
    }
});

test('el demodulador descarta un paquete interrumpido y recibe el siguiente', () => {
    const paquete = crearPaquete({
        tipo: TIPO_PAQUETE.DATOS, id: 1, secuencia: 3, datos: bytesDePrueba(16)
    });
    const simbolos = codificarPaquete(paquete);
    const eventos = demodularIdeal([...simbolos.slice(0, 20), ...simbolos]);

    assert.deepEqual(eventos.map((evento) => evento.tipo), ['descartado', 'paquete']);
    assert.equal(eventos[1].paquete.secuencia, 3);
});

test('el demodulador ignora cuadros que no superan el piso de ruido', () => {
    const demodulador = new DemoduladorMfsk();

    for (let i = 0; i < 50; i++) {
        assert.equal(demodulador.procesarCuadro({
            tMs: i * 17,
            frecuenciaHz: frecuenciaDeSimbolo(i % 16),
            magnitud: 35,
            pisoRuido: 20
        }), null);
    }
});

// --- Transferencia -----------------------------------------------------------

test('un archivo se reconstruye con los paquetes en cualquier orden', () => {
    const bytes = bytesDePrueba(100);
    const paquetes = crearPaquetesArchivo(bytes, 'nota.txt');
    const receptor = new ReensambladorArchivos();

    assert.equal(paquetes.totalBloques, Math.ceil(100 / TAMANO_BLOQUE));
    for (const paquete of [...ordenDeEnvio(paquetes)].reverse()) {
        receptor.recibir(leerPaquete(paquete));
    }

    const archivo = receptor.obtenerArchivo();

    assert.equal(archivo.nombre, 'nota.txt');
    assert.deepEqual(archivo.bytes, bytes);
    assert.equal(receptor.estado().finRecibido, true);
});

test('el receptor sabe qué bloques faltan y se completa con el reenvío', () => {
    const bytes = bytesDePrueba(150);
    const paquetes = crearPaquetesArchivo(bytes, 'a.bin');
    const receptor = new ReensambladorArchivos();

    ordenDeEnvio(paquetes)
        .map(leerPaquete)
        .filter((p) => ![3, 7, 8].includes(p.secuencia) || p.tipo !== TIPO_PAQUETE.DATOS)
        .forEach((p) => receptor.recibir(p));

    assert.deepEqual(receptor.estado().faltantes, [3, 7, 8]);
    assert.equal(receptor.obtenerArchivo(), null);
    assert.equal(formatearFaltantes(receptor.estado().faltantes), '3,7-8');

    const reenvio = ordenDeEnvio(paquetes, parsearFaltantes('3,7-8', paquetes.totalBloques));

    assert.equal(reenvio.length, 3 + 4);
    reenvio.map(leerPaquete).forEach((p) => receptor.recibir(p));
    assert.deepEqual(receptor.obtenerArchivo().bytes, bytes);
});

test('sin cabecera no se puede saber qué falta ni entregar el archivo', () => {
    const paquetes = crearPaquetesArchivo(bytesDePrueba(40), 'x');
    const receptor = new ReensambladorArchivos();

    paquetes.datos.map(leerPaquete).forEach((p) => receptor.recibir(p));

    assert.equal(receptor.estado().tieneCabecera, false);
    assert.equal(receptor.estado().completo, false);
    assert.equal(receptor.obtenerArchivo(), null);

    receptor.recibir(leerPaquete(paquetes.cabecera));
    assert.equal(receptor.estado().completo, true);
});

test('un bloque de otra transferencia no contamina el archivo', () => {
    const uno = crearPaquetesArchivo(bytesDePrueba(48, 1), 'uno');
    const dos = crearPaquetesArchivo(bytesDePrueba(48, 2), 'dos');
    const receptor = new ReensambladorArchivos();

    assert.notEqual(uno.id, dos.id);
    ordenDeEnvio(uno).map(leerPaquete).forEach((p) => receptor.recibir(p));
    receptor.recibir(leerPaquete(dos.datos[0]));

    assert.equal(receptor.estado().tieneCabecera, false);
    assert.equal(receptor.obtenerArchivo(), null);
});

test('archivo vacío y nombre largo con acentos', () => {
    const vacio = crearPaquetesArchivo(new Uint8Array(0), 'vacío');
    const receptor = new ReensambladorArchivos();

    ordenDeEnvio(vacio).map(leerPaquete).forEach((p) => receptor.recibir(p));
    assert.equal(receptor.obtenerArchivo().bytes.length, 0);

    const largo = crearPaquetesArchivo(
        bytesDePrueba(4),
        'canción_número_ñandú_muy_larga.txt'
    );
    const otro = new ReensambladorArchivos();

    ordenDeEnvio(largo).map(leerPaquete).forEach((p) => otro.recibir(p));

    const nombre = otro.obtenerArchivo().nombre;

    assert.ok(new TextEncoder().encode(nombre).length <= 20);
    assert.ok('canción_número_ñandú_muy_larga.txt'.startsWith(nombre));
    assert.ok(!nombre.includes('�'));
});

test('la lista de faltantes rechaza texto inválido o fuera de rango', () => {
    assert.deepEqual(parsearFaltantes(' 2, 5-7 ,2', 10), [2, 5, 6, 7]);
    assert.deepEqual(parsearFaltantes('', 10), []);
    assert.equal(formatearFaltantes([]), '');
    assert.throws(() => parsearFaltantes('0', 10), RangeError);
    assert.throws(() => parsearFaltantes('11', 10), RangeError);
    assert.throws(() => parsearFaltantes('5-3', 10), RangeError);
    assert.throws(() => parsearFaltantes('abc', 10), RangeError);
});

// --- Extremo a extremo en simulación ----------------------------------------

test('un archivo cruza el canal simulado y llega íntegro', () => {
    const bytes = bytesDePrueba(64);
    const paquetes = crearPaquetesArchivo(bytes, 'e2e.bin');

    for (const sampleRate of [48000, 44100]) {
        const resultado = transmitirPaquetes(ordenDeEnvio(paquetes), {
            sampleRate,
            ganancia: 0.3,
            amplitudRuido: 0.01
        });
        const receptor = new ReensambladorArchivos();

        resultado.recibidos.forEach((p) => receptor.recibir(p));
        assert.equal(resultado.recibidos.length, resultado.enviados);
        assert.deepEqual(receptor.obtenerArchivo().bytes, bytes);
    }
});

test('el ruido solo no produce ningún paquete válido', () => {
    const paquetes = crearPaquetesArchivo(bytesDePrueba(32), 'nada.bin');
    const resultado = transmitirPaquetes(ordenDeEnvio(paquetes), {
        ganancia: 0,
        amplitudRuido: 0.05
    });

    assert.equal(resultado.recibidos.length, 0);
});

test('con señal muy débil se pierden paquetes pero nunca se acepta uno dañado', () => {
    const bytes = bytesDePrueba(64);
    const paquetes = crearPaquetesArchivo(bytes, 'ruido.bin');
    const resultado = transmitirPaquetes(ordenDeEnvio(paquetes), {
        ganancia: 0.02,
        amplitudRuido: 0.05
    });

    assert.ok(resultado.recibidos.length < resultado.enviados);
    for (const recibido of resultado.recibidos) {
        if (recibido.tipo !== TIPO_PAQUETE.DATOS) continue;

        const inicio = (recibido.secuencia - 1) * TAMANO_BLOQUE;
        assert.deepEqual(recibido.datos, bytes.slice(inicio, inicio + TAMANO_BLOQUE));
    }
});
