// E003 — Regiones de decisión de V1 Clean (roadmap: E3-001 y E3-002).
import { guardarResultado, importarEnSilencio } from './experimento_util.js';

const c = await importarEnSilencio(
    '../src/web/static/js/simulacion/caracterizacion.js'
);
const mapa = c.MAPA_V1;
const politicas = {};

for (const [nombre, politica] of Object.entries(c.POLITICAS_LOGICAS)) {
    const ventanas = c.medirVentanas(mapa, politica.decidir);
    const barrido = c.barrerBanda(mapa, politica.decidir);

    politicas[nombre] = {
        descripcion: politica.descripcion,
        resumen: c.resumirVentanas(ventanas),
        barrido: {
            puntos: barrido.puntos,
            coincideConMasCercano: barrido.correcto,
            sinDecision: barrido.sinDecision,
            simboloEquivocado: barrido.simboloEquivocado,
            porcentajeEquivocado: Number(
                (100 * barrido.simboloEquivocado / barrido.puntos).toFixed(1)
            )
        },
        confusiones: barrido.confusiones,
        ventanas
    };
}

const margenV1 = politicas['v1-receptor'].resumen.margenMinimoHz;
const nominalPorTasa = {};

for (const sampleRate of [48000, 44100]) {
    const medicion = c.medirSistema('v1-clean', { sampleRate });
    const errorCuantizacion = mapa.caracteres.map(({ frecuenciaHz }) => {
        const [, centro] = c.observarTono({ frecuenciaHz, sampleRate });
        return Math.abs(centro.frecuenciaHz - frecuenciaHz);
    });

    nominalPorTasa[sampleRate] = {
        binHz: Number((sampleRate / 2048).toFixed(2)),
        nyquistHz: sampleRate / 2,
        caracteresCorrectos: medicion.correctos,
        caracteresTotales: medicion.total,
        fallos: medicion.fallos,
        errorMaximoDeEstimacionHz: Number(
            Math.max(...errorCuantizacion).toFixed(1)
        )
    };
}

const informe = {
    schemaVersion: 1,
    experimentId: 'E003',
    titulo: 'Regiones de decisión de V1 Clean',
    alcance: 'Simulación digital determinista. No mide audio por aire.',
    mapa: mapa.nombre,
    barrido: { desdeHz: 18000, hastaHz: 22500, pasoHz: 5 },
    politicas,
    detectorDePicoEnFrecuenciaNominal: nominalPorTasa,
    equivalenciaDoppler: {
        nota: 'Cálculo, no medición: velocidad relativa que desplaza un tono '
            + 'de 20 kHz tanto como el margen mínimo medido (c = 343 m/s).',
        margenMinimoV1Hz: margenV1,
        velocidadRelativaMs: c.velocidadDopplerEquivalente(margenV1, 20000)
    }
};

const ruta = guardarResultado(
    'docs/experiments/E003-regiones-decision/results/latest.json',
    informe
);

console.log('E003 — margen mínimo y decisiones equivocadas por política');
for (const [nombre, p] of Object.entries(politicas)) {
    console.log(
        `  ${nombre.padEnd(22)} margen mín ${String(p.resumen.margenMinimoHz).padStart(3)} Hz`
        + ` | medio ${p.resumen.margenMedioHz} Hz`
        + ` | símbolo equivocado ${p.barrido.porcentajeEquivocado}% de la banda`
    );
}
for (const [tasa, r] of Object.entries(nominalPorTasa)) {
    console.log(
        `  ${tasa} Hz: ${r.caracteresCorrectos}/${r.caracteresTotales} caracteres`
        + ` correctos en frecuencia nominal; fallos: ${JSON.stringify(r.fallos)}`
    );
}
console.log(`Resultado: ${ruta}`);
