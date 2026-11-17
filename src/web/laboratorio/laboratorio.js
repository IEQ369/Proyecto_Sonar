// Página de laboratorio para la medición física E007.
// Usa el mismo camino de audio que la aplicación: `generarOnda` para emitir y
// un AnalyserNode (FFT 2048, suavizado 0,3) para recibir.
import { generarOnda } from '/static/js/generador_onda.js';
import {
    analizarCaptura,
    analizarCuadro,
    crearPlanMedicion
} from '/static/js/core/medicion_fisica.js';

const FFT_SIZE = 2048;
const SUAVIZADO = 0.3;
const plan = crearPlanMedicion();
const el = (id) => document.getElementById(id);
const esperar = (segundos) => new Promise(
    (resolver) => setTimeout(resolver, segundos * 1000)
);

el('lab-plan').textContent = `${plan.frecuenciasHz.length} tonos de `
    + `${plan.frecuenciasHz[0]} a ${plan.frecuenciasHz.at(-1)} Hz, `
    + `${plan.duracionTonoS} s cada uno, pausa ${plan.pausaS} s, `
    + `amplitud ${plan.amplitud}. Total ${plan.duracionTotalS} s.`;

// --- Emisor -----------------------------------------------------------------
el('lab-emitir').addEventListener('click', async () => {
    const boton = el('lab-emitir');
    const estado = el('lab-estado-emisor');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)(
        { sampleRate: plan.sampleRateHz }
    );

    boton.disabled = true;
    try {
        for (const [indice, frecuenciaHz] of plan.frecuenciasHz.entries()) {
            estado.textContent = `tono ${indice + 1}/${plan.frecuenciasHz.length}: `
                + `${frecuenciaHz} Hz (contexto a ${audioCtx.sampleRate} Hz)`;
            generarOnda({
                frecuencia: frecuenciaHz,
                duracion: plan.duracionTonoS,
                tipo: 'sine',
                amplitud: plan.amplitud,
                sampleRate: plan.sampleRateHz,
                audioCtx,
                fadeTime: plan.fadeS
            });
            await esperar(plan.duracionTonoS + plan.pausaS);
        }
        estado.textContent = 'plan emitido';
    } catch (error) {
        estado.textContent = `error al emitir: ${error.message}`;
    } finally {
        boton.disabled = false;
        setTimeout(() => audioCtx.close(), 200);
    }
});

// --- Receptor ---------------------------------------------------------------
let captura = null;

// Los identificadores de dispositivo no aportan a la medición y la captura
// puede terminar en un repositorio público: no se guardan.
function ajustesSinIdentificadores(stream) {
    const ajustes = stream.getAudioTracks()[0]?.getSettings?.();

    if (!ajustes) return null;

    const { deviceId, groupId, ...resto } = ajustes;
    return resto;
}

el('lab-capturar').addEventListener('click', async () => {
    const estado = el('lab-estado-receptor');
    const comoLaAplicacion = el('lab-procesamiento').checked;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: comoLaAplicacion
                ? true
                : {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
        });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();

        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SUAVIZADO;
        audioCtx.createMediaStreamSource(stream).connect(analyser);

        const bytes = new Uint8Array(analyser.frequencyBinCount);
        const inicio = performance.now();

        captura = {
            stream,
            audioCtx,
            cuadros: [],
            activa: true,
            comoLaAplicacion,
            ajustesPista: ajustesSinIdentificadores(stream)
        };

        const leer = () => {
            if (!captura?.activa) return;
            requestAnimationFrame(leer);
            analyser.getByteFrequencyData(bytes);

            const cuadro = analizarCuadro(bytes, {
                sampleRate: audioCtx.sampleRate,
                fftSize: FFT_SIZE
            });
            captura.cuadros.push({
                tMs: Number((performance.now() - inicio).toFixed(1)),
                ...cuadro
            });
            if (captura.cuadros.length % 15 === 0) {
                estado.textContent = `capturando: ${captura.cuadros.length} cuadros, `
                    + `pico ${cuadro.picoHz ?? '—'} Hz, magnitud ${cuadro.magnitud}, `
                    + `piso ${cuadro.pisoRuido}`;
            }
        };

        leer();
        el('lab-capturar').disabled = true;
        el('lab-detener').disabled = false;
        estado.textContent = `capturando a ${audioCtx.sampleRate} Hz…`;
    } catch (error) {
        estado.textContent = `no se pudo abrir el micrófono: ${error.message}`;
    }
});

function mostrarAnalisis(analisis) {
    const contenedor = el('lab-resultado');
    const tabla = document.createElement('table');
    const fila = (celdas, etiqueta) => {
        const tr = document.createElement('tr');

        for (const texto of celdas) {
            const celda = document.createElement(etiqueta);
            celda.textContent = texto;
            tr.appendChild(celda);
        }
        return tr;
    };

    tabla.className = 'lab-tabla';
    tabla.appendChild(fila(
        ['Tono (Hz)', 'Detectado', 'Cuadros', 'Desvío (Hz)', 'Sobre piso (dB)'],
        'th'
    ));
    for (const tono of analisis.tonos) {
        tabla.appendChild(fila([
            tono.frecuenciaHz,
            tono.detectado ? 'sí' : 'no',
            tono.cuadros,
            tono.desvioMedianoHz ?? '—',
            tono.sobrePisoDb ?? '—'
        ], 'td'));
    }
    contenedor.replaceChildren(tabla);
}

el('lab-detener').addEventListener('click', () => {
    if (!captura) return;

    captura.activa = false;
    captura.stream.getTracks().forEach((pista) => pista.stop());

    const analisis = analizarCaptura(captura.cuadros, plan);
    const informe = {
        schemaVersion: 1,
        tipo: 'sonar-medicion-fisica',
        capturadoEn: new Date().toISOString(),
        navegador: navigator.userAgent,
        notas: el('lab-notas').value,
        audio: {
            sampleRateHz: captura.audioCtx.sampleRate,
            fftSize: FFT_SIZE,
            smoothingTimeConstant: SUAVIZADO,
            capturaComoLaAplicacion: captura.comoLaAplicacion,
            ajustesPista: captura.ajustesPista
        },
        plan,
        analisis,
        cuadros: captura.cuadros
    };
    const enlace = document.createElement('a');

    enlace.href = URL.createObjectURL(new Blob(
        [JSON.stringify(informe, null, 2)],
        { type: 'application/json' }
    ));
    enlace.download = `sonar-medicion-${informe.capturadoEn.replace(/[:.]/g, '-')}.json`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);

    captura.audioCtx.close();
    captura = null;
    mostrarAnalisis(analisis);
    el('lab-estado-receptor').textContent = `captura terminada: `
        + `${analisis.tonosDetectados} de ${analisis.tonosDelPlan} tonos detectados`;
    el('lab-capturar').disabled = false;
    el('lab-detener').disabled = true;
});
