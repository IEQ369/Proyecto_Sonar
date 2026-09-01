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
