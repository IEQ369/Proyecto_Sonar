document.addEventListener('DOMContentLoaded', function () {
    const visualizer = new Visualizer('fft-canvas');
    visualizer.start();

    const startBtn = document.getElementById('start-fft-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function () {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 1024;
                source.connect(analyser);

                function drawFFT() {
                    requestAnimationFrame(drawFFT);
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(dataArray);
                    const fftData = Array.from(dataArray);
                    visualizer.drawSpectrum({
                        data: fftData,
                        minFreq: 0,
                        maxFreq: audioCtx.sampleRate / 2,
                        sampleRate: audioCtx.sampleRate,
                        fftSize: analyser.fftSize
                    });
                }
                drawFFT();
                startBtn.style.display = 'none';
            }).catch(err => {
                alert('No se pudo acceder al micrófono: ' + err);
                console.error('Error al solicitar el micrófono:', err);
                startBtn.style.display = '';
            });
        });
    } else {
        console.error('No se encontró el botón con id start-fft-btn');
    }
});