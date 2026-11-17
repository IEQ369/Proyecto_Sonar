// Ensayo de /archivos_v2/ en Chromium con un WAV como micrófono simulado.
// No forma parte de `npm test` ni de CI: necesita Playwright y Chromium
// instalados aparte, y el servidor estático corriendo en el puerto 8000.
// Uso: node scripts/ensayo_navegador/recibir_archivo_en_chromium.cjs \
//        /ruta/abs/archivo.wav /ruta/abs/original.bin <segundos de señal> [captura.png]
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');

(async () => {
    const [wav, rutaOriginal, segundos, captura] = process.argv.slice(2);
    const original = readFileSync(rutaOriginal);
    const navegador = await chromium.launch({ args: [
        '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${wav}%noloop`
    ] });
    const contexto = await navegador.newContext({
        permissions: ['microphone'], viewport: { width: 1200, height: 900 }
    });
    const pagina = await contexto.newPage();
    const errores = [];

    pagina.on('pageerror', (e) => errores.push(String(e)));
    pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await pagina.goto('http://localhost:8000/archivos_v2/');
    await pagina.click('#v2-escuchar');

    const intermedios = [];
    for (let t = 0; t < Number(segundos) + 4; t += 4) {
        await pagina.waitForTimeout(4000);
        intermedios.push(await pagina.textContent('#v2-estado-receptor')
            + ' | faltan: ' + await pagina.inputValue('#v2-faltantes'));
    }

    const recibido = await pagina.evaluate(async () => {
        const enlace = document.querySelector('#v2-descarga a');
        if (!enlace) return null;
        const bytes = new Uint8Array(await (await fetch(enlace.href)).arrayBuffer());
        return { nombre: enlace.download, bytes: Array.from(bytes) };
    });

    // El emisor no se puede oír aquí; solo se comprueba que arranca sin errores.
    await pagina.setInputFiles('#v2-archivo', {
        name: 'emisor.txt', mimeType: 'text/plain', buffer: Buffer.from('hola sonar')
    });
    await pagina.waitForTimeout(300);
    const info = await pagina.textContent('#v2-info');
    await pagina.click('#v2-transmitir');
    await pagina.waitForTimeout(1500);
    const emisor = await pagina.textContent('#v2-estado-emisor');
    await pagina.click('#v2-cancelar');
    if (captura) await pagina.screenshot({ path: captura });
    await navegador.close();

    const estados = [...new Set(intermedios)];
    console.log(JSON.stringify({
        estados,
        nombre: recibido?.nombre ?? null,
        bytesRecibidos: recibido?.bytes.length ?? 0,
        identico: recibido !== null
            && recibido.bytes.length === original.length
            && recibido.bytes.every((b, i) => b === original[i]),
        info,
        emisor,
        errores
    }, null, 2));
})();
