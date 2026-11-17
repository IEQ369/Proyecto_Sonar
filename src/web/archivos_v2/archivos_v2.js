// Pantalla del protocolo de archivos V2.
// Toda la lógica vive en `static/js/core/`; aquí solo se conecta con el audio
// del navegador y con la página.
import { analizarCuadro } from '/static/js/core/medicion_fisica.js';
import {
    DemoduladorMfsk,
    MFSK,
    codificarPaquete,
    duracionPaqueteS,
    sintetizarSimbolos
} from '/static/js/core/modem_mfsk.js';
import {
    ReensambladorArchivos,
    TAMANO_BLOQUE,
    crearPaquetesArchivo,
    formatearFaltantes,
    ordenDeEnvio,
    parsearFaltantes
} from '/static/js/core/transferencia_archivos.js';
import { crearEnlaceDescarga } from '/archivos/static/js/ui_recepcion_archivos.js';

// Límite deliberado: a unos 4 bytes útiles por segundo, 4 KB ya son ~17 min.
const LIMITE_BYTES = 4096;
const PAUSA_ENTRE_PAQUETES_S = 0.15;
const FFT_SIZE = 2048;
const SUAVIZADO = 0.3;
const SAMPLE_RATE_EMISION = 48000;

const el = (id) => document.getElementById(id);
const esperar = (segundos) => new Promise(
    (resolver) => setTimeout(resolver, segundos * 1000)
);
const formatearDuracion = (segundos) => (
    segundos < 90
        ? `${Math.round(segundos)} s`
        : `${(segundos / 60).toFixed(1)} min`
);

function duracionDeEnvioS(lista) {
    return lista.reduce(
        (suma, paquete) => suma
            + duracionPaqueteS(paquete.length - 7) + PAUSA_ENTRE_PAQUETES_S,
        0
    );
}

// --- Emisor -----------------------------------------------------------------
let paquetes = null;
let emision = null;

el('v2-archivo').addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    const info = el('v2-info');

    paquetes = null;
    el('v2-transmitir').disabled = true;
    el('v2-reenviar').disabled = true;
    if (!archivo) {
        info.textContent = 'ningún archivo seleccionado';
        return;
    }
    if (archivo.size > LIMITE_BYTES) {
        info.textContent = `${archivo.size} bytes: supera el límite de `
            + `${LIMITE_BYTES} bytes de este modo`;
        return;
    }

    paquetes = crearPaquetesArchivo(
        new Uint8Array(await archivo.arrayBuffer()),
        archivo.name
    );
    info.textContent = `${archivo.name}: ${archivo.size} bytes en `
        + `${paquetes.totalBloques} bloques de ${TAMANO_BLOQUE}; unos `
        + `${formatearDuracion(duracionDeEnvioS(ordenDeEnvio(paquetes)))} en el aire`;
    el('v2-transmitir').disabled = false;
    el('v2-reenviar').disabled = false;
});

async function emitir(lista, descripcion) {
    const estado = el('v2-estado-emisor');
    const barra = el('v2-barra-emisor');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)(
        { sampleRate: SAMPLE_RATE_EMISION }
    );

    emision = { cancelada: false, fuente: null };
    for (const id of ['v2-transmitir', 'v2-reenviar']) el(id).disabled = true;
    el('v2-cancelar').disabled = false;

    try {
        for (const [indice, paquete] of lista.entries()) {
            if (emision.cancelada) break;

            // Un solo búfer por paquete: los símbolos quedan contiguos y con
            // duración exacta, sin depender de temporizadores entre tonos.
            const muestras = sintetizarSimbolos(codificarPaquete(paquete), {
                sampleRate: SAMPLE_RATE_EMISION
            });
            const buffer = audioCtx.createBuffer(
                1, muestras.length, SAMPLE_RATE_EMISION
            );
            const fuente = audioCtx.createBufferSource();

            buffer.getChannelData(0).set(muestras);
            fuente.buffer = buffer;
            fuente.connect(audioCtx.destination);
            fuente.start();
            emision.fuente = fuente;

            estado.textContent = `${descripcion}: paquete ${indice + 1} de ${lista.length}`;
            barra.style.width = `${Math.round(100 * (indice + 1) / lista.length)}%`;
            await esperar(buffer.duration + PAUSA_ENTRE_PAQUETES_S);
        }
        estado.textContent = emision.cancelada
            ? 'transmisión cancelada'
            : `${descripcion}: terminado`;
    } catch (error) {
        estado.textContent = `error al transmitir: ${error.message}`;
    } finally {
        emision = null;
        el('v2-cancelar').disabled = true;
        el('v2-transmitir').disabled = paquetes === null;
        el('v2-reenviar').disabled = paquetes === null;
        setTimeout(() => audioCtx.close(), 200);
    }
}

el('v2-transmitir').addEventListener('click', () => {
    if (paquetes) emitir(ordenDeEnvio(paquetes), 'enviando archivo');
});

el('v2-reenviar').addEventListener('click', () => {
    if (!paquetes) return;

    try {
        const faltantes = parsearFaltantes(
            el('v2-reenviar-lista').value,
            paquetes.totalBloques
        );

        if (faltantes.length === 0) {
            el('v2-estado-emisor').textContent
                = 'escribe los bloques que faltan, por ejemplo 3,7-9';
            return;
        }
        emitir(
            ordenDeEnvio(paquetes, faltantes),
            `reenviando ${faltantes.length} bloques`
        );
    } catch (error) {
        el('v2-estado-emisor').textContent = `lista no válida: ${error.message}`;
    }
});

el('v2-cancelar').addEventListener('click', () => {
    if (!emision) return;
    emision.cancelada = true;
    try { emision.fuente?.stop(); } catch { /* ya había terminado */ }
});

// --- Receptor ---------------------------------------------------------------
let escucha = null;

function mostrarEstadoReceptor(reensamblador, descartados) {
    const estado = reensamblador.estado();
    const texto = el('v2-estado-receptor');
    const sufijo = descartados > 0 ? ` (${descartados} paquetes descartados)` : '';

    el('v2-faltantes').value = formatearFaltantes(estado.faltantes);

    if (!estado.tieneCabecera) {
        texto.textContent = estado.bloquesRecibidos > 0
            ? `${estado.bloquesRecibidos} bloques recibidos; falta la cabecera${sufijo}`
            : `escuchando…${sufijo}`;
        return;
    }

    el('v2-barra-receptor').style.width = estado.totalBloques === 0
        ? '100%'
        : `${Math.round(100 * estado.bloquesRecibidos / estado.totalBloques)}%`;

    if (!estado.completo) {
        texto.textContent = `${estado.nombre}: ${estado.bloquesRecibidos} de `
            + `${estado.totalBloques} bloques`
            + (estado.finRecibido ? '. Terminó el envío: pide reenviar los que faltan' : '')
            + sufijo;
        return;
    }

    const archivo = reensamblador.obtenerArchivo();

    if (!archivo) {
        texto.textContent = `${estado.nombre}: completo pero no pasó la `
            + 'verificación. Pide que lo envíen de nuevo';
        return;
    }
    texto.textContent = `${archivo.nombre}: recibido y verificado `
        + `(${archivo.bytes.length} bytes)${sufijo}`;

    if (!escucha || escucha.entregado === reensamblador.id) return;
    escucha.entregado = reensamblador.id;

    const url = URL.createObjectURL(new Blob([archivo.bytes]));

    el('v2-descarga').replaceChildren(
        crearEnlaceDescarga(document, { nombre: archivo.nombre }, url)
    );
}

el('v2-escuchar').addEventListener('click', async () => {
    const texto = el('v2-estado-receptor');

    try {
        // Sin procesamiento de voz: en E007 ese procesamiento dejó la banda
        // en cero en Chromium.
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const bytes = new Uint8Array(FFT_SIZE / 2);
        const demodulador = new DemoduladorMfsk();
        const reensamblador = new ReensambladorArchivos();
        let descartados = 0;

        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SUAVIZADO;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        escucha = { stream, audioCtx, activa: true, entregado: null };

        const leer = () => {
            if (!escucha?.activa) return;
            requestAnimationFrame(leer);
            analyser.getByteFrequencyData(bytes);

            const cuadro = analizarCuadro(bytes, {
                sampleRate: audioCtx.sampleRate,
                fftSize: FFT_SIZE,
                minHz: MFSK.bandaMinHz,
                maxHz: MFSK.bandaMaxHz
            });
            const evento = demodulador.procesarCuadro({
                tMs: performance.now(),
                frecuenciaHz: cuadro.picoInterpoladoHz,
                magnitud: cuadro.magnitud,
                pisoRuido: cuadro.pisoRuido
            });

            if (!evento) return;
            if (evento.tipo === 'paquete') reensamblador.recibir(evento.paquete);
            else descartados++;
            mostrarEstadoReceptor(reensamblador, descartados);
        };

        leer();
        el('v2-escuchar').disabled = true;
        el('v2-detener').disabled = false;
        el('v2-descarga').replaceChildren();
        el('v2-barra-receptor').style.width = '0%';
        texto.textContent = `escuchando a ${audioCtx.sampleRate} Hz…`;
    } catch (error) {
        texto.textContent = `no se pudo abrir el micrófono: ${error.message}`;
    }
});

el('v2-detener').addEventListener('click', () => {
    if (!escucha) return;
    escucha.activa = false;
    escucha.stream.getTracks().forEach((pista) => pista.stop());
    escucha.audioCtx.close();
    escucha = null;
    el('v2-escuchar').disabled = false;
    el('v2-detener').disabled = true;
});
