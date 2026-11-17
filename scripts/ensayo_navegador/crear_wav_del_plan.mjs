// Genera un WAV con el plan de medición (+12 Hz de desvío, atenuado y con ruido)
// para usarlo como micrófono simulado de Chromium.
// Uso: node scripts/ensayo_navegador/crear_wav_del_plan.mjs /ruta/absoluta/plan.wav
import { writeFileSync } from 'node:fs';
import { crearPlanMedicion } from '../../src/web/static/js/core/medicion_fisica.js';
import { generarMuestrasOnda, generarSilencio, concatenarMuestras } from '../../src/web/static/js/generador_onda.js';
import { aplicarCanalSimulado } from '../../src/web/static/js/simulacion/canal_simulado.js';
const plan = crearPlanMedicion();
const sr = 48000;
const partes = [generarSilencio({ duracion: 1, sampleRate: sr })];
for (const f of plan.frecuenciasHz) {
    partes.push(generarMuestrasOnda({ frecuencia: f + 12, duracion: plan.duracionTonoS, tipo: 'sine', amplitud: plan.amplitud, sampleRate: sr, fadeTime: plan.fadeS }));
    partes.push(generarSilencio({ duracion: plan.pausaS, sampleRate: sr }));
}
partes.push(generarSilencio({ duracion: 30, sampleRate: sr }));
const x = aplicarCanalSimulado(concatenarMuestras(partes), { ganancia: 0.2, amplitudRuido: 0.002, semilla: 369 });
const b = Buffer.alloc(44 + x.length * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(x[i] * 32767), 44 + i * 2);
writeFileSync(process.argv[2], b);
console.log('wav', (x.length / sr).toFixed(1), 's');
