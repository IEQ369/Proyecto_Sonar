// E004 — Robustez de V1 Clean frente a atenuación, duración de símbolo y
// frecuencia de muestreo (roadmap: E3-003, E3-005 y E3-006, parte digital).
import { guardarResultado, importarEnSilencio } from './experimento_util.js';

const c = await importarEnSilencio(
    '../src/web/static/js/simulacion/caracterizacion.js'
);
const AMPLITUD_TONO = 0.1;
const AMPLITUD_RUIDO = 0.05;
const GANANCIAS = [1, 0.3, 0.1, 0.06, 0.05, 0.04, 0.03, 0.02];
const DURACIONES = [0.03, 0.06, 0.12];
const TASAS = [48000, 44100];
const REPETICIONES = 5;
const casos = [];

for (const sampleRate of TASAS) {
    for (const duracion of DURACIONES) {
        for (const ganancia of GANANCIAS) {
            const medicion = c.medirSistema('v1-clean', {
                sampleRate,
                duracion,
                ganancia,
                amplitud: AMPLITUD_TONO,
                amplitudRuido: AMPLITUD_RUIDO,
                repeticiones: REPETICIONES
            });

            casos.push({
                sampleRateHz: sampleRate,
                duracionSimboloS: duracion,
                ganancia,
                snrDb: c.calcularSnrDb(AMPLITUD_TONO * ganancia, AMPLITUD_RUIDO),
                total: medicion.total,
                correctos: medicion.correctos,
                equivocados: medicion.equivocados,
                perdidos: medicion.perdidos,
                tasaErrorSimbolo: medicion.tasaErrorSimbolo
            });
        }
    }
}

// Umbral fijo: ¿qué magnitud ve el receptor cuando solo hay ruido?
const soloRuido = [0.001, 0.005, 0.02, 0.05].map((amplitudRuido) => {
    const [, centro] = c.observarTono({
        frecuenciaHz: 19000,
        ganancia: 0,
        amplitudRuido,
        semilla: 369
    });
    return {
        amplitudRuido,
        magnitudPicoByte: centro.magnitud,
        superaUmbralFijo12: centro.magnitud >= 12
    };
});

const informe = {
    schemaVersion: 1,
    experimentId: 'E004',
    titulo: 'Robustez de V1 Clean: atenuación, duración y muestreo',
    alcance: 'Simulación digital determinista con ruido uniforme. '
        + 'No mide audio por aire.',
    configuracion: {
        amplitudTono: AMPLITUD_TONO,
        amplitudRuido: AMPLITUD_RUIDO,
        fftSize: 2048,
        cuadrosPorSimbolo: 3,
        repeticionesPorCaracter: REPETICIONES,
        semillaBase: 369
    },
    casos,
    umbralFijoFrenteARuido: soloRuido
};
const ruta = guardarResultado(
    'docs/experiments/E004-robustez-canal/results/latest.json',
    informe
);

console.log('E004 — tasa de error de símbolo (SER) de V1 Clean');
for (const sampleRate of TASAS) {
    for (const duracion of DURACIONES) {
        const fila = casos
            .filter((k) => k.sampleRateHz === sampleRate
                && k.duracionSimboloS === duracion)
            .map((k) => `${k.snrDb}dB:${k.tasaErrorSimbolo.toFixed(2)}`)
            .join('  ');
        console.log(`  ${sampleRate} Hz, ${duracion * 1000} ms → ${fila}`);
    }
}
console.log(`  solo ruido: ${JSON.stringify(soloRuido)}`);
console.log(`Resultado: ${ruta}`);
