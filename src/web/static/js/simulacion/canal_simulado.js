/**
 * Canal ideal: la salida contiene exactamente las mismas muestras de entrada.
 * Se devuelve una copia para impedir que el receptor modifique accidentalmente
 * la señal producida por el emisor.
 *
 * @param {Float32Array} muestrasEntrada
 * @returns {Float32Array}
 */
export function aplicarCanalIdentidad(muestrasEntrada) {
    if (!(muestrasEntrada instanceof Float32Array)) {
        throw new TypeError('El canal simulado requiere un Float32Array');
    }

    return new Float32Array(muestrasEntrada);
}

function crearGeneradorPseudoaleatorio(semillaInicial) {
    let estado = semillaInicial >>> 0;

    return function siguiente() {
        estado = (1664525 * estado + 1013904223) >>> 0;
        return estado / 4294967296;
    };
}

/**
 * Canal mínimo reproducible con ganancia y ruido uniforme.
 *
 * La semilla garantiza que dos ejecuciones con la misma configuración
 * produzcan exactamente las mismas muestras de ruido.
 */
export function aplicarCanalSimulado(muestrasEntrada, opciones = {}) {
    if (!(muestrasEntrada instanceof Float32Array)) {
        throw new TypeError('El canal simulado requiere un Float32Array');
    }

    const ganancia = opciones.ganancia ?? 1;
    const amplitudRuido = opciones.amplitudRuido ?? 0;
    const semilla = opciones.semilla ?? 1;
    const aleatorio = crearGeneradorPseudoaleatorio(semilla);
    const salida = new Float32Array(muestrasEntrada.length);

    for (let indice = 0; indice < muestrasEntrada.length; indice++) {
        const ruido = (aleatorio() * 2 - 1) * amplitudRuido;
        const muestra = muestrasEntrada[indice] * ganancia + ruido;
        salida[indice] = Math.max(-1, Math.min(1, muestra));
    }

    return salida;
}
