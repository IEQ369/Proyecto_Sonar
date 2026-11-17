// Ensayo de /laboratorio/ en Chromium con un WAV como micrófono simulado.
// No forma parte de `npm test` ni de CI: necesita Playwright y Chromium
// instalados aparte, y el servidor estático corriendo en el puerto 8000.
// Uso: node scripts/ensayo_navegador/capturar_en_chromium.cjs \
//        /ruta/absoluta/plan.wav /ruta/absoluta/captura.json [si|no]
// El tercer argumento indica si se captura como la aplicación (por defecto, si).
const { chromium } = require('playwright');
(async () => {
const [wav, salida, comoApp] = process.argv.slice(2);
const b = await chromium.launch({ args: [
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'
] });
const ctx = await b.newContext({ acceptDownloads: true, permissions: ['microphone'], viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
await p.goto('http://localhost:8000/laboratorio/');
if (comoApp === 'no') await p.uncheck('#lab-procesamiento');
await p.fill('#lab-notas', 'prueba automática con micrófono simulado');
await p.click('#lab-capturar');
await p.waitForTimeout(17000);
console.log('estado:', await p.textContent('#lab-estado-receptor'));
const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#lab-detener')]);
await descarga.saveAs(salida);
console.log('final:', await p.textContent('#lab-estado-receptor'));
await p.click('#lab-emitir');
await p.waitForTimeout(2500);
console.log('emisor:', await p.textContent('#lab-estado-emisor'));
await p.screenshot({ path: salida.replace('.json', '.png') });
console.log('errores:', JSON.stringify(errores));
await b.close();
})();
