// Vuelve a analizar una captura descargada desde /laboratorio/.
// Uso: node scripts/analizar_medicion.js ruta/a/sonar-medicion-….json
import { readFileSync } from 'node:fs';

import {
    analizarCaptura,
    formatearAnalisis
} from '../src/web/static/js/core/medicion_fisica.js';

const ruta = process.argv[2];

if (!ruta) {
    console.error('Uso: node scripts/analizar_medicion.js <captura.json>');
    process.exit(1);
}

const captura = JSON.parse(readFileSync(ruta, 'utf8'));

if (captura.tipo !== 'sonar-medicion-fisica' || !Array.isArray(captura.cuadros)) {
    console.error('El archivo no es una captura de /laboratorio/.');
    process.exit(1);
}

console.log(`Captura: ${captura.capturadoEn}`);
console.log(`Notas: ${captura.notas || '(sin notas)'}`);
console.log(`Audio: ${captura.audio.sampleRateHz} Hz, FFT ${captura.audio.fftSize}, `
    + `captura como la aplicación: ${captura.audio.capturaComoLaAplicacion ? 'sí' : 'no'}`);
console.log('');
console.log(formatearAnalisis(analizarCaptura(captura.cuadros, captura.plan)));
