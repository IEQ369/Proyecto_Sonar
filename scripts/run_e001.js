import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { simularMensaje } from '../src/web/static/js/simulacion/simulador_mensajes.js';

const configUrl = new URL(
    '../docs/experiments/E001-baseline-mensajes/config.json',
    import.meta.url
);
const outputUrl = new URL(
    '../docs/experiments/E001-baseline-mensajes/results/latest.json',
    import.meta.url
);
const config = JSON.parse(readFileSync(configUrl, 'utf8'));

function resumirCaso(caso) {
    const resultado = simularMensaje(caso.message, {
        emisor: {
            sampleRate: config.canonicalSignal.sampleRateHz
        },
        canal: {
            ganancia: caso.channel.gain,
            amplitudRuido: caso.channel.noiseAmplitude,
            semilla: caso.channel.seed
        }
    });

    return {
        id: caso.id,
        input: {
            message: caso.message,
            channel: caso.channel
        },
        output: {
            receivedMessage: resultado.mensajeRecibido,
            sampleCount: resultado.muestrasTransmitidas.length,
            detectedFrequenciesHz: resultado.detecciones.map(
                (deteccion) => deteccion.frecuenciaHz
            )
        },
        metrics: {
            expectedSymbols: resultado.metricas.simbolosEsperados,
            receivedSymbols: resultado.metricas.simbolosRecibidos,
            symbolErrors: resultado.metricas.erroresSimbolo,
            symbolErrorRate: resultado.metricas.ser,
            messageCorrect: resultado.metricas.mensajeCorrecto
        }
    };
}

const cases = config.measurementCases.map(resumirCaso);
const report = {
    schemaVersion: 1,
    experimentId: config.experimentId,
    experimentStatus: config.status,
    executedAt: new Date().toISOString(),
    environment: {
        runtime: 'Node.js',
        runtimeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
    },
    configuration: {
        sampleRateHz: config.canonicalSignal.sampleRateHz,
        waveform: config.canonicalSignal.waveform,
        symbolDurationSeconds:
            config.canonicalSignal.symbolDurationSeconds,
        markerDurationSeconds:
            config.canonicalSignal.markerDurationSeconds,
        characterGapSeconds:
            config.canonicalSignal.characterGapSeconds
    },
    summary: {
        totalCases: cases.length,
        correctMessages: cases.filter(
            (caso) => caso.metrics.messageCorrect
        ).length,
        casesWithSymbolErrors: cases.filter(
            (caso) => caso.metrics.symbolErrors > 0
        ).map((caso) => caso.id)
    },
    cases
};
const outputPath = fileURLToPath(outputUrl);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`E001: ${report.summary.correctMessages}/${report.summary.totalCases} mensajes correctos`);
for (const caso of cases) {
    console.log(
        `${caso.id}: esperado="${caso.input.message}" recibido="${caso.output.receivedMessage}" SER=${caso.metrics.symbolErrorRate}`
    );
}
console.log(`Resultado: ${outputPath}`);
