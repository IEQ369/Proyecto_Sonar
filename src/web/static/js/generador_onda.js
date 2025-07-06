// generador_onda.js
// Módulo para generar ondas personalizadas con AudioBuffer (senoidal, cuadrada, sierra, triangular)

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
    const length = Math.floor(sampleRate * duracion);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
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