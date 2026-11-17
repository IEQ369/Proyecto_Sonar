/**
 * Herramientas de caracterización digital de SONAR (Milestone 3).
 *
 * Todo lo que hay aquí es simulación determinista: no usa micrófono, altavoz
 * ni Web Audio API. Sirve para medir el diseño actual antes de cambiarlo y
 * para comparar candidatos con las mismas entradas.
 */
import {
    START_FREQUENCY,
    SYNC_FREQUENCY,
    END_FREQUENCY,
    CHAR_FREQUENCIES
} from '../protocolo_ultrasonico.js';
import { ReceptorMensajesCore } from '../core/receptor_mensajes_core.js';
import { generarMuestrasOnda } from '../generador_onda.js';
import { aplicarCanalSimulado } from './canal_simulado.js';
import {
    V2_CONTROL,
    V2_CHAR_FREQUENCIES,
    V2_DISTANCIA_MAXIMA_HZ
} from './mapa_candidato_v2.js';

export const SIMBOLO_SYNC = '<SYNC>';
export const SIMBOLO_END = '<END>';
export const VELOCIDAD_SONIDO_M_S = 343;

/**
 * Un mapa describe los símbolos que el receptor puede decidir mientras recibe
 * datos. El orden de `caracteres` importa: V1 elige el primero que coincide.
 */
export function crearMapa(nombre, control, caracteres) {
    return Object.freeze({
        nombre,
        control: Object.freeze({ ...control }),
        caracteres: Object.freeze(
            Object.entries(caracteres).map(
                ([caracter, frecuenciaHz]) => Object.freeze(
                    { simbolo: caracter, frecuenciaHz }
                )
            )
        )
    });
}

export const MAPA_V1 = crearMapa(
    'v1-clean',
    { START: START_FREQUENCY, SYNC: SYNC_FREQUENCY, END: END_FREQUENCY },
    CHAR_FREQUENCIES
);

export const MAPA_V2_CANDIDATO = crearMapa(
    'v2-candidato-a',
    V2_CONTROL,
    V2_CHAR_FREQUENCIES
);

/** Símbolos que pueden aparecer durante la fase de datos. */
export function simbolosDeDatos(mapa) {
    return [
        ...mapa.caracteres,
        { simbolo: SIMBOLO_SYNC, frecuenciaHz: mapa.control.SYNC },
        { simbolo: SIMBOLO_END, frecuenciaHz: mapa.control.END }
    ];
}

// ---------------------------------------------------------------------------
// Políticas de decisión
// ---------------------------------------------------------------------------

/**
 * Decisión de V1 Clean ejecutando el receptor real, no un modelo.
 *
 * Lleva `ReceptorMensajesCore` al estado DATA y le entrega las detecciones.
 * Devuelve el símbolo emitido o `null` si el receptor no emite nada.
 */
export function decidirConReceptorV1(detecciones) {
    const receptor = new ReceptorMensajesCore();
    let tiempoMs = 0;
    const entregar = (frecuenciaHz, magnitud) => {
        tiempoMs += 17;
        return receptor.procesarDeteccion({ frecuenciaHz, magnitud, tiempoMs });
    };

    for (let i = 0; i < 3; i++) entregar(START_FREQUENCY, 200);
    for (let i = 0; i < 3; i++) entregar(SYNC_FREQUENCY, 200);

    for (const { frecuenciaHz, magnitud } of detecciones) {
        const evento = entregar(frecuenciaHz, magnitud);

        if (evento?.tipo === 'caracter') return evento.caracter;
        if (evento?.tipo === 'separador') return SIMBOLO_SYNC;
        if (evento?.tipo === 'mensaje_completo') return SIMBOLO_END;
    }

    return null;
}

/** Atajo: la misma frecuencia observada en tres cuadros consecutivos. */
export function decidirFrecuenciaConReceptorV1(frecuenciaHz) {
    const deteccion = { frecuenciaHz, magnitud: 200 };
    return decidirConReceptorV1([deteccion, deteccion, deteccion]);
}

/**
 * Regla "primer coincidente": control primero y después el primer carácter,
 * en el orden del mapa, dentro de la tolerancia. Con 80 Hz reproduce la lógica
 * aislada de `frequencyToChar()`, sin el filtro de estabilidad del receptor.
 */
export function decidirPrimerCoincidente(frecuenciaHz, mapa, opciones = {}) {
    const toleranciaCaracterHz = opciones.toleranciaCaracterHz ?? 80;
    const toleranciaControlHz = opciones.toleranciaControlHz ?? 60;

    if (Math.abs(frecuenciaHz - mapa.control.END) <= toleranciaControlHz) {
        return SIMBOLO_END;
    }
    if (Math.abs(frecuenciaHz - mapa.control.SYNC) <= toleranciaControlHz) {
        return SIMBOLO_SYNC;
    }

    for (const { simbolo, frecuenciaHz: nominalHz } of mapa.caracteres) {
        if (Math.abs(nominalHz - frecuenciaHz) <= toleranciaCaracterHz) {
            return simbolo;
        }
    }

    return null;
}

/**
 * Regla "más cercano": gana el símbolo cuya frecuencia nominal está más cerca,
 * siempre que no supere la distancia máxima. Los empates exactos no se deciden.
 */
export function decidirMasCercano(frecuenciaHz, mapa, opciones = {}) {
    const distanciaMaximaHz = opciones.distanciaMaximaHz ?? 50;
    let mejor = null;
    let mejorDistancia = Number.POSITIVE_INFINITY;
    let empate = false;

    for (const candidato of simbolosDeDatos(mapa)) {
        const distancia = Math.abs(candidato.frecuenciaHz - frecuenciaHz);

        if (distancia < mejorDistancia) {
            mejor = candidato.simbolo;
            mejorDistancia = distancia;
            empate = false;
        } else if (distancia === mejorDistancia) {
            empate = true;
        }
    }

    if (empate || mejorDistancia > distanciaMaximaHz) {
        return null;
    }

    return mejor;
}

/**
 * Decisión por acuerdo: todos los cuadros deben superar la magnitud mínima y
 * decidir el mismo símbolo por frecuencia más cercana.
 */
export function decidirPorAcuerdo(detecciones, mapa, opciones = {}) {
    const magnitudMinima = opciones.magnitudMinima ?? 12;
    let acordado = null;

    for (const { frecuenciaHz, magnitud } of detecciones) {
        if (!(magnitud >= magnitudMinima)) return null;

        const simbolo = decidirMasCercano(frecuenciaHz, mapa, opciones);
        if (simbolo === null) return null;
        if (acordado !== null && simbolo !== acordado) return null;
        acordado = simbolo;
    }

    return acordado;
}

export const POLITICAS_LOGICAS = Object.freeze({
    'v1-receptor': {
        descripcion: 'Receptor real de V1 Clean (frequencyToChar ±80 Hz, '
            + 'control ±60 Hz y filtro de estabilidad <60 Hz)',
        decidir: (frecuenciaHz) => decidirFrecuenciaConReceptorV1(frecuenciaHz)
    },
    'primer-coincidente-80': {
        descripcion: 'Primer coincidente ±80 Hz, sin filtro de estabilidad',
        decidir: (frecuenciaHz, mapa) => decidirPrimerCoincidente(
            frecuenciaHz, mapa, { toleranciaCaracterHz: 80 }
        )
    },
    'primer-coincidente-60': {
        descripcion: 'Primer coincidente ±60 Hz',
        decidir: (frecuenciaHz, mapa) => decidirPrimerCoincidente(
            frecuenciaHz, mapa, { toleranciaCaracterHz: 60 }
        )
    },
    'primer-coincidente-40': {
        descripcion: 'Primer coincidente ±40 Hz (control ±40 Hz)',
        decidir: (frecuenciaHz, mapa) => decidirPrimerCoincidente(
            frecuenciaHz, mapa,
            { toleranciaCaracterHz: 40, toleranciaControlHz: 40 }
        )
    },
    'mas-cercano-50': {
        descripcion: 'Frecuencia más cercana, distancia máxima 50 Hz',
        decidir: (frecuenciaHz, mapa) => decidirMasCercano(
            frecuenciaHz, mapa, { distanciaMaximaHz: 50 }
        )
    }
});

// ---------------------------------------------------------------------------
// Regiones de decisión
// ---------------------------------------------------------------------------

/**
 * Para cada símbolo mide cuánto puede desviarse la frecuencia observada, hacia
 * abajo y hacia arriba, sin que cambie la decisión.
 */
export function medirVentanas(mapa, decidir, opciones = {}) {
    const limiteHz = opciones.limiteHz ?? 150;

    return simbolosDeDatos(mapa).map(({ simbolo, frecuenciaHz }) => {
        const explorar = (signo) => {
            if (decidir(frecuenciaHz, mapa) !== simbolo) {
                return { ventanaHz: -1, resultadoAlSalir: decidir(frecuenciaHz, mapa) };
            }
            for (let desvio = 1; desvio <= limiteHz; desvio++) {
                const decidido = decidir(frecuenciaHz + signo * desvio, mapa);
                if (decidido !== simbolo) {
                    return { ventanaHz: desvio - 1, resultadoAlSalir: decidido };
                }
            }
            return { ventanaHz: limiteHz, resultadoAlSalir: simbolo };
        };
        const inferior = explorar(-1);
        const superior = explorar(1);

        return {
            simbolo,
            frecuenciaHz,
            ventanaInferiorHz: inferior.ventanaHz,
            ventanaSuperiorHz: superior.ventanaHz,
            margenHz: Math.min(inferior.ventanaHz, superior.ventanaHz),
            alSalirPorAbajo: inferior.resultadoAlSalir,
            alSalirPorArriba: superior.resultadoAlSalir
        };
    });
}

/**
 * Barre la banda completa y clasifica cada frecuencia según lo que decidiría
 * un receptor ideal de "símbolo más cercano".
 */
export function barrerBanda(mapa, decidir, opciones = {}) {
    const desdeHz = opciones.desdeHz ?? 18000;
    const hastaHz = opciones.hastaHz ?? 22500;
    const pasoHz = opciones.pasoHz ?? 5;
    const simbolos = simbolosDeDatos(mapa);
    const conteo = { puntos: 0, correcto: 0, sinDecision: 0, simboloEquivocado: 0 };
    const confusiones = new Map();

    for (let frecuenciaHz = desdeHz; frecuenciaHz <= hastaHz; frecuenciaHz += pasoHz) {
        let masCercano = simbolos[0];
        for (const candidato of simbolos) {
            if (
                Math.abs(candidato.frecuenciaHz - frecuenciaHz)
                < Math.abs(masCercano.frecuenciaHz - frecuenciaHz)
            ) {
                masCercano = candidato;
            }
        }

        const decidido = decidir(frecuenciaHz, mapa);
        conteo.puntos++;

        if (decidido === null) {
            conteo.sinDecision++;
        } else if (decidido === masCercano.simbolo) {
            conteo.correcto++;
        } else {
            conteo.simboloEquivocado++;
            const clave = `${masCercano.simbolo}→${decidido}`;
            const previo = confusiones.get(clave) ?? {
                masCercano: masCercano.simbolo,
                decidido,
                desdeHz: frecuenciaHz,
                hastaHz: frecuenciaHz
            };
            previo.hastaHz = frecuenciaHz;
            confusiones.set(clave, previo);
        }
    }

    return { ...conteo, confusiones: [...confusiones.values()] };
}

export function resumirVentanas(ventanas) {
    const margenes = ventanas.map((ventana) => ventana.margenHz);
    const minimo = Math.min(...margenes);

    return {
        simbolos: ventanas.length,
        margenMinimoHz: minimo,
        margenMedioHz: Number(
            (margenes.reduce((a, b) => a + b, 0) / margenes.length).toFixed(1)
        ),
        simbolosConMargenMinimo: ventanas
            .filter((ventana) => ventana.margenHz === minimo)
            .map((ventana) => ventana.simbolo),
        simbolosAsimetricos: ventanas.filter(
            (ventana) => ventana.ventanaInferiorHz !== ventana.ventanaSuperiorHz
        ).length
    };
}

/** Velocidad relativa cuyo efecto Doppler produce ese desvío de frecuencia. */
export function velocidadDopplerEquivalente(desvioHz, frecuenciaHz) {
    return Number(
        (Math.abs(desvioHz) * VELOCIDAD_SONIDO_M_S / frecuenciaHz).toFixed(2)
    );
}

// ---------------------------------------------------------------------------
// Detector de pico equivalente al AnalyserNode de la interfaz
// ---------------------------------------------------------------------------

function fftRadix2(real, imaginaria) {
    const n = real.length;

    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imaginaria[i], imaginaria[j]] = [imaginaria[j], imaginaria[i]];
        }
    }

    for (let tamano = 2; tamano <= n; tamano <<= 1) {
        const angulo = -2 * Math.PI / tamano;
        const pasoReal = Math.cos(angulo);
        const pasoImag = Math.sin(angulo);

        for (let inicio = 0; inicio < n; inicio += tamano) {
            let wReal = 1;
            let wImag = 0;

            for (let k = 0; k < tamano / 2; k++) {
                const a = inicio + k;
                const b = a + tamano / 2;
                const tReal = real[b] * wReal - imaginaria[b] * wImag;
                const tImag = real[b] * wImag + imaginaria[b] * wReal;

                real[b] = real[a] - tReal;
                imaginaria[b] = imaginaria[a] - tImag;
                real[a] += tReal;
                imaginaria[a] += tImag;

                const siguienteReal = wReal * pasoReal - wImag * pasoImag;
                wImag = wReal * pasoImag + wImag * pasoReal;
                wReal = siguienteReal;
            }
        }
    }
}

/**
 * Reproduce la estimación de `app.js`: ventana Blackman, FFT, conversión a
 * byte como `getByteFrequencyData` (-100 a -30 dB) y primer bin de magnitud
 * máxima entre 18 000 y 22 500 Hz. No aplica el suavizado temporal del
 * AnalyserNode (`smoothingTimeConstant`), que depende de cuadros anteriores.
 */
export function estimarPicoAnalizador(muestras, opciones = {}) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const fftSize = opciones.fftSize ?? 2048;
    const inicio = opciones.inicio ?? 0;
    const minHz = opciones.minHz ?? 18000;
    const maxHz = opciones.maxHz ?? 22500;
    const real = new Float64Array(fftSize);
    const imaginaria = new Float64Array(fftSize);

    for (let n = 0; n < fftSize; n++) {
        const muestra = muestras[inicio + n] ?? 0;
        const ventana = 0.42
            - 0.5 * Math.cos(2 * Math.PI * n / fftSize)
            + 0.08 * Math.cos(4 * Math.PI * n / fftSize);
        real[n] = muestra * ventana;
    }

    fftRadix2(real, imaginaria);

    const binHz = sampleRate / fftSize;
    const minBin = Math.floor(minHz / binHz);
    const maxBin = Math.min(Math.ceil(maxHz / binHz), fftSize / 2 - 1);
    let mejorBin = -1;
    let mejorByte = 0;

    for (let bin = minBin; bin <= maxBin; bin++) {
        const magnitud = Math.hypot(real[bin], imaginaria[bin]) / fftSize;
        const decibelios = 20 * Math.log10(magnitud);
        const byte = Math.max(
            0,
            Math.min(255, Math.floor(255 * (decibelios + 100) / 70))
        );

        if (byte > mejorByte) {
            mejorByte = byte;
            mejorBin = bin;
        }
    }

    return {
        frecuenciaHz: mejorBin * binHz,
        magnitud: mejorByte,
        binHz
    };
}

/**
 * Sintetiza un tono aislado, lo pasa por el canal simulado y devuelve las tres
 * detecciones que vería el receptor en cuadros consecutivos (~1/60 s).
 */
export function observarTono(opciones) {
    const sampleRate = opciones.sampleRate ?? 48000;
    const fftSize = opciones.fftSize ?? 2048;
    const duracion = opciones.duracion ?? 0.06;
    const tono = generarMuestrasOnda({
        frecuencia: opciones.frecuenciaHz,
        duracion,
        tipo: 'sine',
        amplitud: opciones.amplitud ?? 0.1,
        sampleRate,
        fadeTime: opciones.fadeTime ?? 0.004
    });
    const relleno = fftSize;
    const limpio = new Float32Array(tono.length + 2 * relleno);
    limpio.set(tono, relleno);

    const recibido = aplicarCanalSimulado(limpio, {
        ganancia: opciones.ganancia ?? 1,
        amplitudRuido: opciones.amplitudRuido ?? 0,
        semilla: opciones.semilla ?? 1
    });
    const centro = relleno + Math.floor(tono.length / 2);
    const salto = Math.round(sampleRate / 60);

    return [-1, 0, 1].map((cuadro) => {
        const { frecuenciaHz, magnitud } = estimarPicoAnalizador(recibido, {
            sampleRate,
            fftSize,
            inicio: centro - fftSize / 2 + cuadro * salto
        });
        return { frecuenciaHz, magnitud };
    });
}

/** Relación señal/ruido de banda ancha del canal simulado, en dB. */
export function calcularSnrDb(amplitudTono, amplitudRuido) {
    if (amplitudRuido === 0) return null;
    const potenciaTono = amplitudTono ** 2 / 2;
    const potenciaRuido = amplitudRuido ** 2 / 3;
    return Number((10 * Math.log10(potenciaTono / potenciaRuido)).toFixed(1));
}

export const SISTEMAS = Object.freeze({
    'v1-clean': {
        mapa: MAPA_V1,
        decidir: (detecciones) => decidirConReceptorV1(detecciones)
    },
    'v2-candidato-a': {
        mapa: MAPA_V2_CANDIDATO,
        decidir: (detecciones) => decidirPorAcuerdo(
            detecciones,
            MAPA_V2_CANDIDATO,
            { distanciaMaximaHz: V2_DISTANCIA_MAXIMA_HZ }
        )
    }
});

/**
 * Transmite cada carácter de un mapa por el canal simulado y cuenta aciertos,
 * símbolos equivocados y símbolos perdidos, con la regla de decisión dada.
 */
export function medirMapa(mapa, decidir, condiciones = {}) {
    const repeticiones = condiciones.repeticiones ?? 1;
    const resultado = { total: 0, correctos: 0, equivocados: 0, perdidos: 0 };
    const fallos = new Map();

    mapa.caracteres.forEach(({ simbolo, frecuenciaHz }, indice) => {
        for (let repeticion = 0; repeticion < repeticiones; repeticion++) {
            const detecciones = observarTono({
                ...condiciones,
                frecuenciaHz: frecuenciaHz + (condiciones.desvioHz ?? 0),
                semilla: (condiciones.semilla ?? 369)
                    + indice * 1000 + repeticion
            });
            const decidido = decidir(detecciones);

            resultado.total++;
            if (decidido === simbolo) {
                resultado.correctos++;
            } else {
                if (decidido === null) resultado.perdidos++;
                else resultado.equivocados++;
                fallos.set(simbolo, decidido);
            }
        }
    });

    return {
        ...resultado,
        tasaErrorSimbolo: Number(
            ((resultado.total - resultado.correctos) / resultado.total).toFixed(4)
        ),
        fallos: [...fallos.entries()].map(
            ([esperado, decidido]) => ({ esperado, decidido })
        )
    };
}

/** Atajo de `medirMapa` para los sistemas registrados en `SISTEMAS`. */
export function medirSistema(nombreSistema, condiciones = {}) {
    const { mapa, decidir } = SISTEMAS[nombreSistema];

    return medirMapa(mapa, decidir, condiciones);
}
