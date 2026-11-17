// E005 — Comparación de V1 Clean contra el mapa candidato V2-A con las mismas
// mediciones. El candidato NO se adopta aquí: solo se mide.
import { guardarResultado, importarEnSilencio } from './experimento_util.js';

const c = await importarEnSilencio(
    '../src/web/static/js/simulacion/caracterizacion.js'
);
const v2 = await import(
    '../src/web/static/js/simulacion/mapa_candidato_v2.js'
);
const SISTEMAS = ['v1-clean', 'v2-candidato-a'];
const TASAS = [48000, 44100];
const DESVIOS = [-60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60];
const GANANCIAS = [1, 0.1, 0.06, 0.05, 0.04, 0.03, 0.02];
const AMPLITUD_TONO = 0.1;
const AMPLITUD_RUIDO = 0.05;

const decisores = {
    'v1-clean': c.POLITICAS_LOGICAS['v1-receptor'].decidir,
    'v2-candidato-a': (frecuenciaHz, mapa) => c.decidirMasCercano(
        frecuenciaHz, mapa, { distanciaMaximaHz: v2.V2_DISTANCIA_MAXIMA_HZ }
    )
};

const sistemas = {};

for (const nombre of SISTEMAS) {
    const { mapa } = c.SISTEMAS[nombre];
    const frecuencias = c.simbolosDeDatos(mapa)
        .map((s) => s.frecuenciaHz)
        .concat(mapa.control.START)
        .sort((a, b) => a - b);
    const separaciones = frecuencias.slice(1).map((f, i) => f - frecuencias[i]);
    const ventanas = c.medirVentanas(mapa, decisores[nombre]);
    const barrido = c.barrerBanda(mapa, decisores[nombre]);
    const resumen = c.resumirVentanas(ventanas);

    sistemas[nombre] = {
        banda: {
            tonos: frecuencias.length,
            minimaHz: frecuencias[0],
            maximaHz: frecuencias.at(-1),
            anchoHz: frecuencias.at(-1) - frecuencias[0],
            separacionMinimaHz: Math.min(...separaciones),
            tonosSobreNyquistDe44100: frecuencias.filter((f) => f > 22050).length
        },
        regiones: {
            ...resumen,
            velocidadDopplerDelMargenMs: c.velocidadDopplerEquivalente(
                resumen.margenMinimoHz, 20000
            ),
            porcentajeDeBandaConSimboloEquivocado: Number(
                (100 * barrido.simboloEquivocado / barrido.puntos).toFixed(1)
            )
        },
        desvioDeFrecuencia: {},
        atenuacion: {}
    };

    for (const sampleRate of TASAS) {
        sistemas[nombre].desvioDeFrecuencia[sampleRate] = DESVIOS.map(
            (desvioHz) => {
                const m = c.medirSistema(nombre, { sampleRate, desvioHz });
                return {
                    desvioHz,
                    correctos: m.correctos,
                    equivocados: m.equivocados,
                    perdidos: m.perdidos,
                    total: m.total
                };
            }
        );
        sistemas[nombre].atenuacion[sampleRate] = GANANCIAS.map((ganancia) => {
            const m = c.medirSistema(nombre, {
                sampleRate,
                ganancia,
                amplitud: AMPLITUD_TONO,
                amplitudRuido: AMPLITUD_RUIDO,
                repeticiones: 5
            });
            return {
                ganancia,
                snrDb: c.calcularSnrDb(AMPLITUD_TONO * ganancia, AMPLITUD_RUIDO),
                tasaErrorSimbolo: m.tasaErrorSimbolo,
                equivocados: m.equivocados,
                perdidos: m.perdidos,
                total: m.total
            };
        });
    }
}

const informe = {
    schemaVersion: 1,
    experimentId: 'E005',
    titulo: 'V1 Clean frente al mapa candidato V2-A',
    alcance: 'Simulación digital determinista. El candidato no está adoptado '
        + 'ni conectado a la interfaz.',
    candidato: {
        baseHz: v2.V2_FRECUENCIA_BASE_HZ,
        pasoHz: v2.V2_PASO_HZ,
        distanciaMaximaHz: v2.V2_DISTANCIA_MAXIMA_HZ,
        control: v2.V2_CONTROL,
        caracteres: v2.V2_CHAR_FREQUENCIES
    },
    configuracion: {
        duracionSimboloS: 0.06,
        amplitudTono: AMPLITUD_TONO,
        amplitudRuido: AMPLITUD_RUIDO,
        repeticionesPorCaracterEnAtenuacion: 5
    },
    sistemas
};
const ruta = guardarResultado(
    'docs/experiments/E005-mapa-candidato-v2/results/latest.json',
    informe
);

// --- Figura: regiones de decisión de ambos sistemas -------------------------
const DESDE = 18000;
const HASTA = 22500;
const ANCHO = 1100;
const X0 = 150;
const escala = (hz) => X0 + (hz - DESDE) * (ANCHO - X0 - 20) / (HASTA - DESDE);
const COLORES = { correcto: '#2e7d32', equivocado: '#c62828', nada: '#cfd8dc' };

function fila(nombre, y) {
    const { mapa } = c.SISTEMAS[nombre];
    const simbolos = c.simbolosDeDatos(mapa);
    const partes = [];
    let tramo = null;

    for (let hz = DESDE; hz <= HASTA; hz += 5) {
        const cercano = simbolos.reduce((a, b) => (
            Math.abs(b.frecuenciaHz - hz) < Math.abs(a.frecuenciaHz - hz) ? b : a
        ));
        const decidido = decisores[nombre](hz, mapa);
        const clase = decidido === null
            ? 'nada'
            : decidido === cercano.simbolo ? 'correcto' : 'equivocado';

        if (tramo && tramo.clase === clase) {
            tramo.hasta = hz + 5;
        } else {
            if (tramo) partes.push(tramo);
            tramo = { clase, desde: hz, hasta: hz + 5 };
        }
    }
    partes.push(tramo);

    const rects = partes.map((t) => (
        `<rect x="${escala(t.desde).toFixed(1)}" y="${y}" `
        + `width="${(escala(t.hasta) - escala(t.desde)).toFixed(1)}" `
        + `height="46" fill="${COLORES[t.clase]}"/>`
    )).join('');
    const marcas = simbolos.map((s) => (
        `<line x1="${escala(s.frecuenciaHz).toFixed(1)}" y1="${y}" `
        + `x2="${escala(s.frecuenciaHz).toFixed(1)}" y2="${y + 46}" `
        + 'stroke="#ffffff" stroke-width="1"/>'
    )).join('');

    return `<text x="10" y="${y + 28}" font-size="14">${nombre}</text>${rects}${marcas}`;
}

const ejes = [18000, 19000, 20000, 21000, 22000].map((hz) => (
    `<text x="${escala(hz).toFixed(1)}" y="170" font-size="12" `
    + `text-anchor="middle">${hz / 1000} kHz</text>`
)).join('');
const nyquist = escala(22050).toFixed(1);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} 215" font-family="sans-serif" fill="#111111">
<rect width="${ANCHO}" height="215" fill="#ffffff"/>
<text x="10" y="22" font-size="15" font-weight="bold">Regiones de decisión durante la fase de datos (simulación, paso 5 Hz)</text>
${fila('v1-clean', 40)}
${fila('v2-candidato-a', 100)}
<line x1="${nyquist}" y1="34" x2="${nyquist}" y2="152" stroke="#111111" stroke-dasharray="4 3"/>
<text x="${nyquist}" y="186" font-size="11" text-anchor="middle">Nyquist a 44,1 kHz</text>
${ejes}
<rect x="150" y="196" width="12" height="12" fill="${COLORES.correcto}"/><text x="168" y="207" font-size="12">decide el símbolo más cercano</text>
<rect x="400" y="196" width="12" height="12" fill="${COLORES.equivocado}"/><text x="418" y="207" font-size="12">decide otro símbolo</text>
<rect x="590" y="196" width="12" height="12" fill="${COLORES.nada}"/><text x="608" y="207" font-size="12">no decide (líneas blancas: frecuencias nominales)</text>
</svg>
`;
guardarResultado('docs/experiments/E005-mapa-candidato-v2/regiones.svg', svg);

console.log('E005 — V1 Clean frente a V2-A (candidato)');
for (const nombre of SISTEMAS) {
    const s = sistemas[nombre];
    console.log(`  ${nombre}: banda ${s.banda.minimaHz}–${s.banda.maximaHz} Hz, `
        + `margen mínimo ${s.regiones.margenMinimoHz} Hz, `
        + `${s.regiones.porcentajeDeBandaConSimboloEquivocado}% de banda equivocada`);
    for (const tasa of TASAS) {
        console.log(`    ${tasa} Hz desvío→correctos: ` + s.desvioDeFrecuencia[tasa]
            .map((d) => `${d.desvioHz}:${d.correctos}`).join(' '));
        console.log(`    ${tasa} Hz SNR→SER: ` + s.atenuacion[tasa]
            .map((d) => `${d.snrDb}dB:${d.tasaErrorSimbolo.toFixed(2)}`).join(' '));
    }
}
console.log(`Resultado: ${ruta}`);
