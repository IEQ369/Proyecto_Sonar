import { START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY } from './protocolo_ultrasonico.js';

export class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isAnimating = false;
        this.transmitMode = false;
        if (this.canvas.parentElement) {
            this.canvas.parentElement.classList.add('frequency-visualizer');
        }
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupCanvas();
    }

    setupCanvas() {
        const parent = this.canvas.parentElement;
        if (window.innerWidth <= 600) {
            this.canvas.width = window.innerWidth * window.devicePixelRatio;
            this.canvas.height = 180 * window.devicePixelRatio;
        } else {
            this.canvas.width = parent.offsetWidth * window.devicePixelRatio;
            this.canvas.height = 220 * window.devicePixelRatio;
        }
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        this.gradient.addColorStop(0, '#6e1fff');
        this.gradient.addColorStop(0.5, '#a259f7');
        this.gradient.addColorStop(1, '#e040fb');
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
        const minBin = Math.floor(0 / binSize);
        const maxBin = Math.ceil(22500 / binSize);
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const numBars = Math.min(256, maxBin - minBin);
        const barWidth = width / numBars;

        let maxBarIdx = -1;
        let maxBarMag = 0;
        let secondIdx = -1;
        let secondMag = 0;
        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            const magnitude = data[bin];
            if (magnitude > maxBarMag) {
                secondMag = maxBarMag;
                secondIdx = maxBarIdx;
                maxBarMag = magnitude;
                maxBarIdx = i;
            } else if (magnitude > secondMag) {
                secondMag = magnitude;
                secondIdx = i;
            }
        }

        this.clear();

        // cambiar colores según modo transmisión (patrón chirp)
        if (this.transmitMode) {
            // modo transmisión: colores verdes
            this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
            this.gradient.addColorStop(0, '#00ff41');
            this.gradient.addColorStop(0.5, '#00ff88');
            this.gradient.addColorStop(1, '#00ffaa');
        } else {
            // modo recepción: colores originales
            this.gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
            this.gradient.addColorStop(0, '#6e1fff');
            this.gradient.addColorStop(0.5, '#a259f7');
            this.gradient.addColorStop(1, '#e040fb');
        }

        for (let i = 0; i < numBars; i++) {
            const bin = minBin + Math.floor(i * (maxBin - minBin) / numBars);
            let magnitude = data[bin];
            const freq = bin * binSize;
            const barHeight = (magnitude / 255) * (height - 30);
            const x = i * barWidth;

            if (this.transmitMode) {
                // colores verdes para transmisión
                if (i === maxBarIdx) {
                    this.ctx.fillStyle = '#00ff41';
                    this.ctx.shadowColor = '#00ff41';
                    this.ctx.shadowBlur = 16;
                } else if (i === secondIdx) {
                    this.ctx.fillStyle = '#00ff88';
                    this.ctx.shadowColor = '#00ff88';
                    this.ctx.shadowBlur = 12;
                } else {
                    this.ctx.fillStyle = this.gradient;
                    this.ctx.shadowColor = '#00ff41';
                    this.ctx.shadowBlur = 8;
                }
            } else {
                // colores originales para recepción
                if (i === maxBarIdx) {
                    this.ctx.fillStyle = '#00fff7';
                    this.ctx.shadowColor = '#00fff7';
                    this.ctx.shadowBlur = 16;
                } else if (i === secondIdx) {
                    this.ctx.fillStyle = '#e040fb';
                    this.ctx.shadowColor = '#e040fb';
                    this.ctx.shadowBlur = 12;
                } else {
                    this.ctx.fillStyle = this.gradient;
                    this.ctx.shadowColor = '#00f0ff';
                    this.ctx.shadowBlur = 8;
                }
            }

            this.ctx.fillRect(x, height - barHeight, barWidth * 0.8, barHeight);
            this.ctx.shadowBlur = 0;
        }
        this.drawFrequencyLines(0, 22500, width, height);
        this.drawMarkers(0, 22500, width, height);
    }

    drawFrequencyLines(minFreq, maxFreq, width, height) {
        const step = 2000;
        const freqRange = maxFreq - minFreq;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        this.ctx.lineWidth = 1;
        this.ctx.font = '13px monospace';
        this.ctx.fillStyle = '#e040fb';
        this.ctx.textAlign = 'center';
        for (let freq = minFreq; freq <= maxFreq; freq += step) {
            const x = ((freq - minFreq) / freqRange) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - 2);
            this.ctx.lineTo(x, 10);
            this.ctx.stroke();
            const label = `${Math.round(freq / 1000)}kHz`;
            this.ctx.fillText(label, x, height - 5);
        }
        this.ctx.restore();
    }

    drawMarkers(minFreq, maxFreq, width, height) {
        const markerFreqs = [
            { freq: START_FREQUENCY, label: 'START' },
            { freq: SYNC_FREQUENCY, label: 'SYNC' },
            { freq: END_FREQUENCY, label: 'END' }
        ];
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        markerFreqs.forEach(marker => {
            if (marker.freq >= minFreq && marker.freq <= maxFreq) {
                const x = Math.round((marker.freq - minFreq) / (maxFreq - minFreq) * width);
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
                this.ctx.stroke();
                this.ctx.fillText(marker.label, x, 13);
            }
        });
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