/**
 * Mapa de frecuencias CANDIDATO para una futura V2 de mensajes.
 *
 * Estado: experimento (E005). No lo usa la interfaz ni reemplaza a
 * `protocolo_ultrasonico.js`. Solo existe para compararlo contra V1 Clean con
 * las mismas mediciones.
 *
 * Criterios, derivados de E003 y E004:
 * - todas las frecuencias quedan por debajo de 21,7 kHz, de modo que también
 *   son representables con audio a 44,1 kHz (Nyquist = 22 050 Hz);
 * - el paso es uniforme y las frecuencias están en orden ascendente;
 * - los tonos de control ocupan las tres primeras posiciones y una posición
 *   vacía los separa de los datos;
 * - la decisión prevista es por frecuencia más cercana, con una distancia
 *   máxima de medio paso, para que la región de cada símbolo sea simétrica.
 */
export const V2_FRECUENCIA_BASE_HZ = 18200;
export const V2_PASO_HZ = 80;
export const V2_DISTANCIA_MAXIMA_HZ = V2_PASO_HZ / 2;
export const V2_ALFABETO = ' ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';

const frecuenciaDePosicion = (posicion) => (
    V2_FRECUENCIA_BASE_HZ + posicion * V2_PASO_HZ
);

export const V2_CONTROL = Object.freeze({
    START: frecuenciaDePosicion(0),
    SYNC: frecuenciaDePosicion(1),
    END: frecuenciaDePosicion(2)
});

// La posición 3 queda vacía como banda de guarda entre control y datos.
export const V2_PRIMERA_POSICION_DATOS = 4;

export const V2_CHAR_FREQUENCIES = Object.freeze(Object.fromEntries(
    [...V2_ALFABETO].map((caracter, indice) => [
        caracter,
        frecuenciaDePosicion(V2_PRIMERA_POSICION_DATOS + indice)
    ])
));

export const V2_FRECUENCIA_MAXIMA_HZ = Math.max(
    ...Object.values(V2_CHAR_FREQUENCIES)
);
