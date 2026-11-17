/**
 * Lógica de la primera medición física de SONAR (E007).
 *
 * No depende del navegador: recibe los bytes que entrega el AnalyserNode y
 * devuelve números. Así la misma lógica se prueba en Node y se usa en la
 * página de laboratorio.
 */

/** `getByteFrequencyData` reparte 70 dB (de -100 a -30) en 255 pasos. */
export const BYTES_POR_DB = 255 / 70;

const mediana = (valores) => {
    if (valores.length === 0) return null;
    const orden = [...valores].sort((a, b) => a - b);
    const mitad = Math.floor(orden.length / 2);

    return orden.length % 2 === 1
        ? orden[mitad]
        : (orden[mitad - 1] + orden[mitad]) / 2;
};
const redondear = (valor, decimales = 1) => (
    valor === null ? null : Number(valor.toFixed(decimales))
);

/**
 * Plan de tonos aislados. Las frecuencias van separadas para que el análisis
 * pueda asignar cada cuadro a su tono sin sincronizar relojes entre equipos.
 */
export function crearPlanMedicion(opciones = {}) {
    const plan = {
        schemaVersion: 1,
        frecuenciasHz: opciones.frecuenciasHz ?? [
            18000, 18500, 19000, 19500, 20000, 20500, 21000, 21500, 22000
        ],
        duracionTonoS: opciones.duracionTonoS ?? 1,
        pausaS: opciones.pausaS ?? 0.5,
        amplitud: opciones.amplitud ?? 0.15,
        fadeS: opciones.fadeS ?? 0.025,
        sampleRateHz: opciones.sampleRateHz ?? 48000
    };

    if (plan.frecuenciasHz.length === 0) {
        throw new RangeError('El plan necesita al menos una frecuencia');
    }
    for (let i = 0; i < plan.frecuenciasHz.length; i++) {
        const frecuenciaHz = plan.frecuenciasHz[i];

        if (!(frecuenciaHz > 0 && frecuenciaHz < plan.sampleRateHz / 2)) {
            throw new RangeError(
                `${frecuenciaHz} Hz no es representable a ${plan.sampleRateHz} Hz`
            );
        }
        if (i > 0 && frecuenciaHz - plan.frecuenciasHz[i - 1] < 300) {
            throw new RangeError(
                'Las frecuencias deben ir en orden y separadas al menos 300 Hz'
            );
        }
    }
    if (!(plan.duracionTonoS > 0) || !(plan.pausaS >= 0)) {
        throw new RangeError('Duración o pausa inválidas');
    }

    plan.duracionTotalS = Number((
        plan.frecuenciasHz.length * (plan.duracionTonoS + plan.pausaS)
    ).toFixed(3));

    return plan;
}

/**
 * Resume un cuadro del analizador igual que `app.js` (primer bin de magnitud
 * máxima en la banda) y añade dos datos que el receptor no usa: el pico
 * interpolado, más fino que un bin, y el piso de ruido de la banda.
 */
export function analizarCuadro(bytes, opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const fftSize = opciones.fftSize ?? 2048;
    const binHz = sampleRate / fftSize;
    const minBin = Math.floor((opciones.minHz ?? 18000) / binHz);
    const maxBin = Math.min(
        Math.ceil((opciones.maxHz ?? 22500) / binHz),
        bytes.length - 1
    );
    const banda = [];
    let mejorBin = -1;
    let magnitud = 0;

    for (let bin = minBin; bin <= maxBin; bin++) {
        banda.push(bytes[bin]);
        if (bytes[bin] > magnitud) {
            magnitud = bytes[bin];
            mejorBin = bin;
        }
    }

    if (mejorBin < 0) {
        return {
            picoHz: null,
            picoInterpoladoHz: null,
            magnitud: 0,
            pisoRuido: mediana(banda) ?? 0
        };
    }

    let ajuste = 0;
    const anterior = bytes[mejorBin - 1];
    const siguiente = bytes[mejorBin + 1];

    // Con el pico saturado (255) la forma del lóbulo se pierde: no interpolar.
    if (magnitud < 255 && anterior !== undefined && siguiente !== undefined) {
        const curvatura = anterior - 2 * magnitud + siguiente;

        if (curvatura < 0) {
            ajuste = Math.max(
                -0.5,
                Math.min(0.5, 0.5 * (anterior - siguiente) / curvatura)
            );
        }
    }

    return {
        picoHz: redondear(mejorBin * binHz, 2),
        picoInterpoladoHz: redondear((mejorBin + ajuste) * binHz, 2),
        magnitud,
        pisoRuido: mediana(banda)
    };
}

/**
 * Agrupa los cuadros capturados por tono del plan y resume qué se observó.
 *
 * Un cuadro cuenta como "con tono" si su pico supera el piso de ruido en
 * `margenSobrePiso` bytes (55 bytes ≈ 15 dB) y se asigna a la frecuencia del
 * plan que esté a menos de `ventanaHz`. El margen es alto a propósito: en ruido
 * puro, el bin más fuerte de la banda ya supera a la mediana en unos 9 dB.
 */
export function analizarCaptura(cuadros, plan, opciones = {}) {
    const margenSobrePiso = opciones.margenSobrePiso ?? 55;
    const ventanaHz = opciones.ventanaHz ?? 150;
    const intervalos = [];

    for (let i = 1; i < cuadros.length; i++) {
        intervalos.push(cuadros[i].tMs - cuadros[i - 1].tMs);
    }

    const intervaloMedianoMs = mediana(intervalos);
    const conTono = cuadros.filter((cuadro) => (
        cuadro.picoInterpoladoHz !== null
        && cuadro.magnitud - cuadro.pisoRuido >= margenSobrePiso
    ));
    let asignados = 0;

    const tonos = plan.frecuenciasHz.map((frecuenciaHz) => {
        const propios = conTono.filter((cuadro) => (
            Math.abs(cuadro.picoInterpoladoHz - frecuenciaHz) <= ventanaHz
        ));
        const desvios = propios.map(
            (cuadro) => cuadro.picoInterpoladoHz - frecuenciaHz
        );
        const desviosBin = propios.map((cuadro) => cuadro.picoHz - frecuenciaHz);
        const sobrePiso = propios.map(
            (cuadro) => cuadro.magnitud - cuadro.pisoRuido
        );

        asignados += propios.length;

        return {
            frecuenciaHz,
            detectado: propios.length >= 3,
            cuadros: propios.length,
            duracionObservadaS: intervaloMedianoMs === null
                ? null
                : redondear(propios.length * intervaloMedianoMs / 1000, 2),
            desvioMedianoHz: redondear(mediana(desvios)),
            desvioMinimoHz: propios.length ? redondear(Math.min(...desvios)) : null,
            desvioMaximoHz: propios.length ? redondear(Math.max(...desvios)) : null,
            desvioMedianoDelBinHz: redondear(mediana(desviosBin)),
            magnitudMediana: mediana(propios.map((cuadro) => cuadro.magnitud)),
            sobrePisoDb: propios.length
                ? redondear(mediana(sobrePiso) / BYTES_POR_DB)
                : null
        };
    });
    const detectados = tonos.filter((tono) => tono.detectado);
    const desviosAbsolutos = detectados.map(
        (tono) => Math.max(
            Math.abs(tono.desvioMinimoHz),
            Math.abs(tono.desvioMaximoHz)
        )
    );

    return {
        cuadros: cuadros.length,
        duracionCapturaS: cuadros.length > 1
            ? redondear((cuadros.at(-1).tMs - cuadros[0].tMs) / 1000, 2)
            : 0,
        intervaloMedianoMs: redondear(intervaloMedianoMs),
        pisoRuidoMediano: mediana(cuadros.map((cuadro) => cuadro.pisoRuido)),
        cuadrosConTono: conTono.length,
        cuadrosConTonoFueraDelPlan: conTono.length - asignados,
        tonosDetectados: detectados.length,
        tonosDelPlan: tonos.length,
        desvioAbsolutoMaximoHz: desviosAbsolutos.length
            ? Math.max(...desviosAbsolutos)
            : null,
        criterios: { margenSobrePiso, ventanaHz },
        tonos
    };
}

/** Tabla de texto para la consola o para pegar en un informe. */
export function formatearAnalisis(analisis) {
    const filas = analisis.tonos.map((tono) => [
        `${tono.frecuenciaHz}`,
        tono.detectado ? 'sí' : 'no',
        `${tono.cuadros}`,
        tono.desvioMedianoHz === null ? '—' : `${tono.desvioMedianoHz}`,
        tono.desvioMinimoHz === null
            ? '—'
            : `${tono.desvioMinimoHz} a ${tono.desvioMaximoHz}`,
        tono.sobrePisoDb === null ? '—' : `${tono.sobrePisoDb}`
    ]);
    const cabecera = [
        'Tono (Hz)', 'Detectado', 'Cuadros', 'Desvío mediano (Hz)',
        'Desvío mín–máx (Hz)', 'Sobre el piso (dB)'
    ];
    const anchos = cabecera.map((titulo, columna) => Math.max(
        titulo.length,
        ...filas.map((fila) => fila[columna].length)
    ));
    const linea = (fila) => fila
        .map((celda, columna) => celda.padEnd(anchos[columna]))
        .join('  ');

    return [
        linea(cabecera),
        ...filas.map(linea),
        '',
        `Tonos detectados: ${analisis.tonosDetectados} de ${analisis.tonosDelPlan}`,
        `Desvío absoluto máximo: ${analisis.desvioAbsolutoMaximoHz ?? '—'} Hz`,
        `Cuadros: ${analisis.cuadros} (uno cada ${analisis.intervaloMedianoMs ?? '—'} ms), `
            + `${analisis.cuadrosConTonoFueraDelPlan} con tono fuera del plan`,
        `Piso de ruido mediano: ${analisis.pisoRuidoMediano ?? '—'} (0–255)`
    ].join('\n');
}
