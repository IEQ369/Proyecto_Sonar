// E008 — Protocolo de archivos V2 de extremo a extremo sobre el canal simulado:
// velocidad, pérdida de paquetes, tolerancia al desvío y rondas de reenvío.
import { guardarResultado, importarEnSilencio } from './experimento_util.js';

const t = await importarEnSilencio(
    '../src/web/static/js/core/transferencia_archivos.js'
);
const m = await import('../src/web/static/js/core/modem_mfsk.js');
const s = await import('../src/web/static/js/simulacion/simulador_archivos.js');
const c = await import('../src/web/static/js/simulacion/caracterizacion.js');
const { TIPO_PAQUETE } = await import('../src/web/static/js/core/trama_archivos.js');

const AMPLITUD_RUIDO = 0.05;
const PAUSA_S = 0.15;
const MAX_RONDAS = 6;

function bytesDePrueba(longitud) {
    const bytes = new Uint8Array(longitud);
    let estado = 369;

    for (let i = 0; i < longitud; i++) {
        estado = (1103515245 * estado + 12345) >>> 0;
        bytes[i] = (estado >>> 16) & 0xFF;
    }
    return bytes;
}

const original = bytesDePrueba(128);
const paquetes = t.crearPaquetesArchivo(original, 'e008.bin');

/** Envía, y reenvía lo que falte, hasta completar o agotar las rondas. */
function transferir(condiciones) {
    const receptor = new t.ReensambladorArchivos();
    let faltantes = null;
    let enviados = 0;
    let validos = 0;
    let descartados = 0;
    let datosDanadosAceptados = 0;
    let duracionS = 0;
    let rondas = 0;

    while (rondas < MAX_RONDAS) {
        const resultado = s.transmitirPaquetes(
            t.ordenDeEnvio(paquetes, faltantes),
            { ...condiciones, pausaS: PAUSA_S, semilla: 369 + rondas * 1000 }
        );

        rondas++;
        enviados += resultado.enviados;
        validos += resultado.recibidos.length;
        descartados += resultado.descartados.length;
        duracionS += resultado.duracionS;

        for (const paquete of resultado.recibidos) {
            if (paquete.tipo === TIPO_PAQUETE.DATOS) {
                const inicio = (paquete.secuencia - 1) * t.TAMANO_BLOQUE;
                const esperado = original.slice(inicio, inicio + t.TAMANO_BLOQUE);

                if (
                    paquete.datos.length !== esperado.length
                    || paquete.datos.some((byte, i) => byte !== esperado[i])
                ) {
                    datosDanadosAceptados++;
                }
            }
            receptor.recibir(paquete);
        }

        const estado = receptor.estado();

        if (estado.completo) break;
        // Sin cabecera el receptor no sabe qué pedir: se reenvía todo.
        faltantes = estado.tieneCabecera ? estado.faltantes : null;
    }

    const archivo = receptor.obtenerArchivo();

    return {
        rondas,
        paquetesEnviados: enviados,
        paquetesValidos: validos,
        paquetesDescartados: descartados,
        tasaDePerdida: Number((1 - validos / enviados).toFixed(3)),
        datosDanadosAceptados,
        archivoIntegro: archivo !== null
            && archivo.bytes.every((byte, i) => byte === original[i]),
        tiempoEnElAireS: Number(duracionS.toFixed(1)),
        bytesUtilesPorSegundo: archivo
            ? Number((original.length / duracionS).toFixed(2))
            : 0
    };
}

// --- Velocidad nominal (cálculo a partir de la estructura del paquete) -------
const velocidadNominal = [0.04, 0.06, 0.08].map((duracionSimboloS) => {
    const kb = t.crearPaquetesArchivo(new Uint8Array(1024), 'kb');
    const segundos = t.ordenDeEnvio(kb).reduce(
        (suma, paquete) => suma
            + m.duracionPaqueteS(paquete.length - 7, { duracionSimboloS }) + PAUSA_S,
        0
    );
    return {
        duracionSimboloMs: duracionSimboloS * 1000,
        segundosPorKilobyte: Number(segundos.toFixed(1)),
        bytesUtilesPorSegundo: Number((1024 / segundos).toFixed(2))
    };
});

const informe = {
    schemaVersion: 1,
    experimentId: 'E008',
    titulo: 'Protocolo de archivos V2 de extremo a extremo',
    alcance: 'Simulación digital determinista con ruido uniforme y el '
        + 'suavizado del AnalyserNode. No mide audio por aire.',
    configuracion: {
        archivoBytes: original.length,
        bloques: paquetes.totalBloques,
        tamanoBloque: t.TAMANO_BLOQUE,
        tonos: 19,
        frecuenciaMinimaHz: m.MFSK.baseHz,
        frecuenciaMaximaHz: m.FRECUENCIA_MAXIMA_MFSK_HZ,
        duracionSimboloPorDefectoMs: m.MFSK.duracionSimboloS * 1000,
        amplitudTono: m.MFSK.amplitud,
        amplitudRuido: AMPLITUD_RUIDO,
        pausaEntrePaquetesS: PAUSA_S,
        maximoDeRondas: MAX_RONDAS
    },
    velocidadNominal,
    protocoloActual: {
        nota: 'Cálculo a partir de las constantes de emisor_archivos.js: un '
            + 'bit cada 0,05 s y un byte de CRC por cada 8 de datos. No incluye '
            + 'preámbulo ni cabecera.',
        bytesUtilesPorSegundo: Number((1 / (0.05 * 8 * 9 / 8)).toFixed(2))
    },
    canalLimpio: {
        '48000': transferir({ sampleRate: 48000 }),
        '44100': transferir({ sampleRate: 44100 }),
        '48000 a 30 cuadros por segundo': transferir({
            sampleRate: 48000, cuadrosPorSegundo: 30
        })
    },
    atenuacion: [0.1, 0.05, 0.04, 0.035, 0.03, 0.025].map((ganancia) => ({
        ganancia,
        snrDb: c.calcularSnrDb(m.MFSK.amplitud * ganancia, AMPLITUD_RUIDO),
        ...transferir({ ganancia, amplitudRuido: AMPLITUD_RUIDO })
    })),
    duracionDeSimbolo: [0.04, 0.06, 0.08, 0.12].map((duracionSimboloS) => ({
        duracionSimboloMs: duracionSimboloS * 1000,
        snrDb: c.calcularSnrDb(m.MFSK.amplitud * 0.035, AMPLITUD_RUIDO),
        ...transferir({
            duracionSimboloS, ganancia: 0.035, amplitudRuido: AMPLITUD_RUIDO
        })
    })),
    margenSobreElPiso: [55, 40, 30, 20, 10].map((margenSobrePiso) => {
        const resultado = s.transmitirPaquetes(t.ordenDeEnvio(paquetes), {
            ganancia: 0.05,
            amplitudRuido: AMPLITUD_RUIDO,
            pausaS: PAUSA_S,
            demodulador: { margenSobrePiso }
        });
        const soloRuido = s.transmitirPaquetes(t.ordenDeEnvio(paquetes), {
            ganancia: 0,
            amplitudRuido: AMPLITUD_RUIDO,
            pausaS: PAUSA_S,
            demodulador: { margenSobrePiso }
        });
        return {
            margenSobrePisoBytes: margenSobrePiso,
            snrDb: c.calcularSnrDb(m.MFSK.amplitud * 0.05, AMPLITUD_RUIDO),
            paquetesValidos: resultado.recibidos.length,
            paquetesEnviados: resultado.enviados,
            paquetesValidosConSoloRuido: soloRuido.recibidos.length
        };
    }),
    desvioDeFrecuencia: [-35, -30, -20, 0, 20, 30, 35].map((desvioHz) => ({
        desvioHz,
        ...transferir({ desvioHz })
    }))
};
const ruta = guardarResultado(
    'docs/experiments/E008-archivos-v2/results/latest.json',
    informe
);
const linea = (r) => `rondas ${r.rondas}, pérdida ${(r.tasaDePerdida * 100).toFixed(1)}%, `
    + `dañados aceptados ${r.datosDanadosAceptados}, íntegro ${r.archivoIntegro ? 'sí' : 'no'}, `
    + `${r.tiempoEnElAireS} s, ${r.bytesUtilesPorSegundo} B/s`;

console.log('E008 — archivos V2 (archivo de 128 bytes)');
console.log('  nominal:', velocidadNominal.map((v) => `${v.duracionSimboloMs} ms→${v.bytesUtilesPorSegundo} B/s`).join('  '),
    `| actual ${informe.protocoloActual.bytesUtilesPorSegundo} B/s`);
for (const [nombre, r] of Object.entries(informe.canalLimpio)) console.log(`  limpio ${nombre}: ${linea(r)}`);
for (const r of informe.atenuacion) console.log(`  SNR ${r.snrDb} dB: ${linea(r)}`);
for (const r of informe.duracionDeSimbolo) console.log(`  símbolo ${r.duracionSimboloMs} ms a ${r.snrDb} dB: ${linea(r)}`);
for (const r of informe.margenSobreElPiso) console.log(`  margen ${r.margenSobrePisoBytes} a ${r.snrDb} dB: ${r.paquetesValidos}/${r.paquetesEnviados} válidos; con solo ruido ${r.paquetesValidosConSoloRuido}`);
for (const r of informe.desvioDeFrecuencia) console.log(`  desvío ${r.desvioHz} Hz: ${linea(r)}`);
console.log(`Resultado: ${ruta}`);
