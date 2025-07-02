class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isAnimating = false;
        this.transmitMode = false;
        // Añadir clase al contenedor si existe
        if (this.canvas.parentElement) {
            this.canvas.parentElement.classList.add('frequency-visualizer');
        }
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupCanvas();
    }

    setupCanvas() {
        // Hacer que el canvas ocupe todo el ancho del contenedor
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.offsetWidth * window.devicePixelRatio;
        this.canvas.height = 220 * window.devicePixelRatio; // Altura fija tipo Chirp
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        // Crear gradiente cian-azul brillante
        this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        this.gradient.addColorStop(0, '#00f0ff');
        this.gradient.addColorStop(0.5, '#00bfff');
        this.gradient.addColorStop(1, '#1e90ff');
    }

    start() {
        this.isAnimating = true;
    }

    stop() {
        this.isAnimating = false;
        this.clear();
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSpectrum(frequencyData) {
        if (!this.isAnimating) return;
        const { data, minFreq, maxFreq, sampleRate, fftSize } = frequencyData;
        const binSize = sampleRate / fftSize;
        const minBin = Math.floor(minFreq / binSize);
        const maxBin = Math.ceil(maxFreq / binSize);
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const numBars = Math.min(256, maxBin - minBin); // Muchas barras delgadas
        const barWidth = width / numBars;

        // Limpiar el canvas
        this.clear();

        // Dibujar las barras FFT
        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            const magnitude = data[bin];
            const barHeight = (magnitude / 255) * (height - 30);
            const x = i * barWidth;
            // Gradiente brillante
            this.ctx.fillStyle = this.gradient;
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(x, height - barHeight, barWidth * 0.8, barHeight);
            this.ctx.shadowBlur = 0;
        }

        // Dibujar líneas y etiquetas de frecuencia tipo Chirp
        this.drawFrequencyLines(minFreq, maxFreq, width, height);
    }

    drawFrequencyLines(minFreq, maxFreq, width, height) {
        const step = 2000; // 2kHz para menos saturación
        const freqRange = maxFreq - minFreq;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        this.ctx.lineWidth = 1;
        this.ctx.font = '13px monospace';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        for (let freq = minFreq; freq <= maxFreq; freq += step) {
            const x = ((freq - minFreq) / freqRange) * width;
            // Línea vertical
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - 2);
            this.ctx.lineTo(x, 10);
            this.ctx.stroke();
            // Etiqueta
            const label = `${Math.round(freq / 1000)}kHz`;
            this.ctx.fillText(label, x, height - 5);
        }
        this.ctx.restore();
    }

    setTransmitMode(active) {
        this.transmitMode = !!active;
        if (this.transmitMode) {
            this.canvas.classList.add('transmit-active');
        } else {
            this.canvas.classList.remove('transmit-active');
        }
    }
}