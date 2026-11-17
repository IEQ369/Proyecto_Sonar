// E006 — Dos preguntas abiertas tras E004 y E005:
//   A) ¿un tamaño de FFT mayor da más alcance? (roadmap: E3-004)
//   B) ¿una zona muerta evita que el candidato V2-A decida el vecino?
import { guardarResultado, importarEnSilencio } from './experimento_util.js';

const c = await importarEnSilencio(
    '../src/web/static/js/simulacion/caracterizacion.js'
);
const AMPLITUD_TONO = 0.1;
const AMPLITUD_RUIDO = 0.05;

// --- A) Tamaño de FFT -------------------------------------------------------
const TAMANOS = [1024, 2048, 4096, 8192];
const DURACIONES = [0.06, 0.12, 0.24];
const GANANCIAS = [0.1, 0.05, 0.03, 0.02, 0.014, 0.01];
const tamanoFft = [];

for (const fftSize of TAMANOS) {
    for (const duracion of DURACIONES) {
        tamanoFft.push({
            fftSize,
            cuadroMs: Number((fftSize / 48000 * 1000).toFixed(1)),
            binHz: Number((48000 / fftSize).toFixed(2)),
            duracionSimboloMs: duracion * 1000,
            curva: GANANCIAS.map((ganancia) => {
                const m = c.medirSistema('v1-clean', {
                    sampleRate: 48000,
                    fftSize,
                    duracion,
                    ganancia,
                    amplitud: AMPLITUD_TONO,
                    amplitudRuido: AMPLITUD_RUIDO,
                    repeticiones: 5
                });
                return {
                    snrDb: c.calcularSnrDb(AMPLITUD_TONO * ganancia, AMPLITUD_RUIDO),
                    tasaErrorSimbolo: m.tasaErrorSimbolo,
                    equivocados: m.equivocados,
                    perdidos: m.perdidos
                };
            })
        });
    }
}

// --- B) Zona muerta en el candidato V2-A ------------------------------------
const DISTANCIAS = [40, 30, 20];
const DESVIOS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const zonaMuerta = DISTANCIAS.map((distanciaMaximaHz) => {
    const decidir = (detecciones) => c.decidirPorAcuerdo(
        detecciones, c.MAPA_V2_CANDIDATO, { distanciaMaximaHz }
    );
    const medir = (condiciones) => {
        const m = c.medirMapa(c.MAPA_V2_CANDIDATO, decidir, condiciones);
        return {
            correctos: m.correctos,
            equivocados: m.equivocados,
            perdidos: m.perdidos,
            total: m.total
        };
    };

    return {
        distanciaMaximaHz,
        zonaMuertaEntreSimbolosHz: 80 - 2 * distanciaMaximaHz,
        porDesvio: DESVIOS.map((desvioHz) => ({
            desvioHz,
            ...medir({ sampleRate: 48000, desvioHz })
        })),
        porAtenuacion: [0.1, 0.05, 0.04, 0.03].map((ganancia) => ({
            snrDb: c.calcularSnrDb(AMPLITUD_TONO * ganancia, AMPLITUD_RUIDO),
            ...medir({
                sampleRate: 48000,
                ganancia,
                amplitud: AMPLITUD_TONO,
                amplitudRuido: AMPLITUD_RUIDO,
                repeticiones: 5
            })
        }))
    };
});

const informe = {
    schemaVersion: 1,
    experimentId: 'E006',
    titulo: 'Tamaño de FFT y zona muerta',
    alcance: 'Simulación digital determinista con ruido uniforme. '
        + 'No mide audio por aire.',
    configuracion: {
        sampleRateHz: 48000,
        amplitudTono: AMPLITUD_TONO,
        amplitudRuido: AMPLITUD_RUIDO,
        cuadrosPorSimbolo: 3,
        repeticionesPorCaracter: 5
    },
    tamanoFft,
    zonaMuerta
};
const ruta = guardarResultado(
    'docs/experiments/E006-fft-y-zona-muerta/results/latest.json',
    informe
);

console.log('E006-A — SER de V1 Clean según tamaño de FFT (48 kHz)');
for (const fila of tamanoFft) {
    console.log(`  FFT ${String(fila.fftSize).padStart(4)} (${fila.cuadroMs} ms), `
        + `símbolo ${String(fila.duracionSimboloMs).padStart(3)} ms → `
        + fila.curva.map((p) => `${p.snrDb}dB:${p.tasaErrorSimbolo.toFixed(2)}`).join(' '));
}
console.log('E006-B — V2-A según distancia máxima: correctos/equivocados/perdidos');
for (const fila of zonaMuerta) {
    console.log(`  máx ${fila.distanciaMaximaHz} Hz desvío: ` + fila.porDesvio
        .map((p) => `${p.desvioHz}:${p.correctos}/${p.equivocados}/${p.perdidos}`).join(' '));
    console.log(`  máx ${fila.distanciaMaximaHz} Hz ruido:  ` + fila.porAtenuacion
        .map((p) => `${p.snrDb}dB:${p.correctos}/${p.equivocados}/${p.perdidos}`).join(' '));
}
console.log(`Resultado: ${ruta}`);
