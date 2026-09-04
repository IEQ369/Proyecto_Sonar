export function calcularDistanciaEdicion(esperado, recibido) {
    const esperadoTexto = String(esperado);
    const recibidoTexto = String(recibido);
    const anterior = Array.from(
        { length: recibidoTexto.length + 1 },
        (_, indice) => indice
    );

    for (let fila = 1; fila <= esperadoTexto.length; fila++) {
        const actual = [fila];

        for (let columna = 1; columna <= recibidoTexto.length; columna++) {
            const costoSustitucion = esperadoTexto[fila - 1]
                === recibidoTexto[columna - 1]
                ? 0
                : 1;

            actual[columna] = Math.min(
                actual[columna - 1] + 1,
                anterior[columna] + 1,
                anterior[columna - 1] + costoSustitucion
            );
        }

        for (let columna = 0; columna < actual.length; columna++) {
            anterior[columna] = actual[columna];
        }
    }

    return anterior[recibidoTexto.length];
}

/**
 * En el protocolo actual, cada carácter representa un símbolo de datos.
 */
export function calcularMetricasMensaje(esperado, recibido) {
    const mensajeEsperado = String(esperado);
    const mensajeRecibido = String(recibido);
    const erroresSimbolo = calcularDistanciaEdicion(
        mensajeEsperado,
        mensajeRecibido
    );
    const simbolosEsperados = mensajeEsperado.length;
    const ser = simbolosEsperados === 0
        ? (mensajeRecibido.length === 0 ? 0 : 1)
        : erroresSimbolo / simbolosEsperados;

    return {
        mensajeEsperado,
        mensajeRecibido,
        simbolosEsperados,
        simbolosRecibidos: mensajeRecibido.length,
        erroresSimbolo,
        ser,
        mensajeCorrecto: mensajeEsperado === mensajeRecibido
    };
}
