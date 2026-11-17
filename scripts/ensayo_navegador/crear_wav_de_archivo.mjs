// Genera el audio de una transferencia V2 con pérdidas y su reenvío, para
// usarlo como micrófono simulado de Chromium.
// Uso: node scripts/ensayo_navegador/crear_wav_de_archivo.mjs /ruta/abs/archivo.wav /ruta/abs/original.bin
import { writeFileSync } from 'node:fs';
import { codificarPaquete, sintetizarSimbolos } from '../../src/web/static/js/core/modem_mfsk.js';
import { crearPaquetesArchivo, ordenDeEnvio } from '../../src/web/static/js/core/transferencia_archivos.js';
import { aplicarCanalSimulado } from '../../src/web/static/js/simulacion/canal_simulado.js';

const sr = 48000;
const texto = 'SONAR archivos V2: transferencia por paquetes con reenvío. ñandú 0123456789 '.repeat(2);
const original = new TextEncoder().encode(texto).slice(0, 96);
const paquetes = crearPaquetesArchivo(original, 'prueba_v2.txt');
const PERDIDOS = [3, 5];
// Primera pasada sin los bloques 3 y 5; después, el reenvío de esos dos.
const primera = ordenDeEnvio(paquetes).filter((p) => !(p[0] === 2 && PERDIDOS.includes((p[2] << 8) | p[3])));
const lista = [...primera, ...ordenDeEnvio(paquetes, PERDIDOS)];
const silencio = (s) => new Float32Array(Math.round(s * sr));
const partes = [silencio(2)];
for (const paquete of lista) {
    partes.push(sintetizarSimbolos(codificarPaquete(paquete), { sampleRate: sr }), silencio(0.15));
}
partes.push(silencio(20));
const total = partes.reduce((n, p) => n + p.length, 0);
const limpio = new Float32Array(total);
let pos = 0;
for (const p of partes) { limpio.set(p, pos); pos += p.length; }
const x = aplicarCanalSimulado(limpio, { ganancia: 0.3, amplitudRuido: 0.002, semilla: 369 });
const b = Buffer.alloc(44 + x.length * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(x[i] * 32767), 44 + i * 2);
writeFileSync(process.argv[2], b);
writeFileSync(process.argv[3], original);
console.log(JSON.stringify({ segundosDeSenal: Number(((total / sr) - 20).toFixed(1)), paquetes: lista.length, bytes: original.length }));
