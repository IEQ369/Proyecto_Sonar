// generador_onda.js
// Módulo para generar ondas personalizadas con AudioBuffer (senoidal, cuadrada, sierra, triangular)

/**
 * Genera las muestras de una onda sin reproducir audio.
 *
 * Esta función contiene la misma matemática utilizada por `generarOnda`, pero
 * no depende de Web Audio API. Es la entrada determinista para los experimentos
 * que deben separar el software del altavoz, el aire y el micrófono.
 *
 * @param {Object} opts - Opciones de la onda
 * @param {number} opts.frecuencia - Frecuencia en Hz
 * @param {number} opts.duracion - Duración en segundos
 * @param {string} opts.tipo - Tipo de onda: 'sine', 'square', 'sawtooth', 'triangle'
 * @param {number} [opts.amplitud=1.0] - Amplitud (0.0 a 1.0)
 * @param {number} [opts.sampleRate=48000] - Frecuencia de muestreo
 * @param {number} [opts.fadeTime=0.004] - Duración del fade in/out en segundos
 * @returns {Float32Array} - Muestras de audio en el rango nominal [-1, 1]
 */
export function generarMuestrasOnda({ frecuencia, duracion, tipo, amplitud = 1.0, sampleRate = 48000, fadeTime = 0.004 }) {
    const length = Math.floor(sampleRate * duracion);
    const data = new Float32Array(length);
    const fadeSamples = Math.floor(fadeTime * sampleRate);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;
        switch (tipo) {
            case 'sine':
                sample = Math.sin(2 * Math.PI * frecuencia * t);
                break;
            case 'square':
                sample = Math.sign(Math.sin(2 * Math.PI * frecuencia * t));
                break;
            case 'sawtooth':
                sample = 2 * (t * frecuencia - Math.floor(0.5 + t * frecuencia));
                break;
            case 'triangle':
                sample = 2 * Math.abs(2 * (t * frecuencia - Math.floor(0.5 + t * frecuencia))) - 1;
                break;
            default:
                sample = Math.sin(2 * Math.PI * frecuencia * t);
        }

        let gain = 1.0;
        if (i < fadeSamples) {
            gain = Math.pow(i / fadeSamples, 2);
        } else if (i > length - fadeSamples) {
            gain = Math.pow((length - i) / fadeSamples, 2);
        }

        data[i] = amplitud * sample * gain;
    }

    return data;
}

/**
 * Genera silencio determinista con una duración conocida.
 * @param {Object} opts
 * @param {number} opts.duracion - Duración en segundos
 * @param {number} [opts.sampleRate=48000] - Frecuencia de muestreo
 * @returns {Float32Array}
 */
export function generarSilencio({ duracion, sampleRate = 48000 }) {
    return new Float32Array(Math.floor(sampleRate * duracion));
}

/**
 * Concatena segmentos sin modificar sus muestras.
 * @param {Float32Array[]} segmentos
 * @returns {Float32Array}
 */
export function concatenarMuestras(segmentos) {
    const total = segmentos.reduce((suma, segmento) => suma + segmento.length, 0);
    const resultado = new Float32Array(total);
    let offset = 0;

    for (const segmento of segmentos) {
        resultado.set(segmento, offset);
        offset += segmento.length;
    }

    return resultado;
}

/**
 * Genera y emite una onda personalizada usando AudioBuffer.
 * @param {Object} opts - Opciones de la onda
 * @param {number} opts.frecuencia - Frecuencia en Hz
 * @param {number} opts.duracion - Duración en segundos
 * @param {string} opts.tipo - Tipo de onda: 'sine', 'square', 'sawtooth', 'triangle'
 * @param {number} [opts.amplitud=1.0] - Amplitud (0.0 a 1.0)
 * @param {number} [opts.sampleRate=48000] - Frecuencia de muestreo
 * @param {AudioContext} [opts.audioCtx] - Contexto de audio (opcional)
 * @param {AudioNode} [opts.destino] - Nodo destino (opcional)
 * @param {number} [opts.fadeTime=0.004] - Duración del fade in/out en segundos
 * @returns {AudioBufferSourceNode} - El nodo fuente creado (para control avanzado)
 */
export function generarOnda({ frecuencia, duracion, tipo, amplitud = 1.0, sampleRate = 48000, audioCtx, destino, fadeTime = 0.004 }) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    }
    const muestras = generarMuestrasOnda({
        frecuencia,
        duracion,
        tipo,
        amplitud,
        sampleRate,
        fadeTime
    });
    const buffer = audioCtx.createBuffer(1, muestras.length, sampleRate);
    const data = buffer.getChannelData(0);
    data.set(muestras);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    if (destino) {
        source.connect(destino);
    } else {
        source.connect(audioCtx.destination);
    }
    source.start();
    return source;
}
