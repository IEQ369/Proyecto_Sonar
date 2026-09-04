import { ReceptorMensajesCore } from '../core/receptor_mensajes_core.js';
import { calcularMetricasMensaje } from '../core/metricas_mensajes.js';
import { aplicarCanalSimulado } from './canal_simulado.js';
import { detectarTonoReferencia } from './detector_tonos_referencia.js';
import { generarMensajeSintetico } from './emisor_mensajes_sintetico.js';

export function simularMensaje(mensaje, opciones = {}) {
    const transmision = generarMensajeSintetico(
        mensaje,
        opciones.emisor
    );
    const muestrasRecibidas = aplicarCanalSimulado(
        transmision.muestras,
        opciones.canal
    );
    const receptor = new ReceptorMensajesCore({
        magnitudMinima: opciones.magnitudMinima ?? 12
    });
    const detecciones = [];
    const eventos = [];

    for (const segmento of transmision.segmentos) {
        if (segmento.tipo !== 'tono') {
            continue;
        }

        const muestrasSegmento = muestrasRecibidas.slice(
            segmento.muestraInicial,
            segmento.muestraFinal
        );
        const deteccion = detectarTonoReferencia(muestrasSegmento, {
            sampleRate: transmision.sampleRate,
            rmsMinimo: opciones.rmsMinimo ?? 0.001
        });

        if (!deteccion) {
            continue;
        }

        detecciones.push({
            rol: segmento.rol,
            caracterEsperado: segmento.caracter ?? null,
            ...deteccion
        });

        const inicioMs = segmento.muestraInicial
            / transmision.sampleRate * 1000;
        const duracionMs = (segmento.muestraFinal - segmento.muestraInicial)
            / transmision.sampleRate * 1000;
        const magnitud = Math.min(255, deteccion.amplitud * 255);

        for (let indice = 1; indice <= 3; indice++) {
            const evento = receptor.procesarDeteccion({
                frecuenciaHz: deteccion.frecuenciaHz,
                magnitud,
                tiempoMs: inicioMs + duracionMs * indice / 4
            });

            if (evento) {
                eventos.push(evento);
            }
        }
    }

    const eventoMensaje = eventos.findLast(
        (evento) => evento.tipo === 'mensaje_completo'
    );
    const mensajeRecibido = eventoMensaje?.mensaje ?? '';

    return {
        mensajeEsperado: transmision.mensaje,
        mensajeRecibido,
        muestrasTransmitidas: transmision.muestras,
        muestrasRecibidas,
        segmentos: transmision.segmentos,
        detecciones,
        eventos,
        metricas: calcularMetricasMensaje(
            transmision.mensaje,
            mensajeRecibido
        )
    };
}
