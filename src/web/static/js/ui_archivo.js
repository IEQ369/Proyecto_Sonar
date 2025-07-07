// UI para envío de archivos por ultrasonido

export function setupArchivoUI() {
    const fileInput = document.getElementById('file');
    const progressBar = document.getElementById('progress-bar');
    const log = document.getElementById('archivo-log');

    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024) {
            alert('El archivo es demasiado grande (máx 1KB)');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function (evt) {
            const arrayBuffer = evt.target.result;
            log.textContent = 'Enviando archivo...';
            progressBar.style.width = '0%';
            progressBar.style.background = '#0f0';
            // Simula progreso (real: deberías actualizar en emitirArchivoBinario)
            let fakeProgress = 0;
            const interval = setInterval(() => {
                fakeProgress += 5;
                progressBar.style.width = fakeProgress + '%';
                if (fakeProgress >= 100) clearInterval(interval);
            }, 100);
            await emitirArchivoBinario(arrayBuffer);
            progressBar.style.width = '100%';
            log.textContent = 'Archivo enviado.';
        };
        reader.readAsArrayBuffer(file);
    });
} 