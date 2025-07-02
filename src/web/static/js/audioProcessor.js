class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isProcessing = false;
        this.fftSize = 4096; // Para mejor resolución de frecuencia
        this.sampleRate = 48000; // Se actualizará con el valor real
        this.minFreq = 18000; // Frecuencia mínima de interés
        this.maxFreq = 22000; // Frecuencia máxima de interés
        this.onFrequencyDetected = null;
        this.frequencyData = null;
        this.smoothingTimeConstant = 0.5;
        this.noiseFloor = -85; // dB, ajustable según el ambiente
        this.minSNR = 15; // dB, relación señal-ruido mínima
        this.persistenceFrames = 3; // Frames consecutivos para confirmar detección
        this.currentPersistence = 0;
        this.lastDetectedFreq = 0;
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sampleRate = this.audioContext.sampleRate;
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000
                }
            });

            this.mediaStream = stream;
            const source = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            
            source.connect(this.analyser);
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            return true;
        } catch (error) {
            console.error('Error al inicializar el audio:', error);
            return false;
        }
    }

    start() {
        if (!this.isProcessing && this.analyser) {
            this.isProcessing = true;
            this.processAudio();
        }
    }

    stop() {
        this.isProcessing = false;
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
    }

    processAudio() {
        if (!this.isProcessing) return;

        this.analyser.getByteFrequencyData(this.frequencyData);
        const dominantFreq = this.detectDominantFrequency();
        
        if (dominantFreq) {
            if (Math.abs(dominantFreq - this.lastDetectedFreq) < 50) {
                this.currentPersistence++;
                if (this.currentPersistence >= this.persistenceFrames) {
                    if (this.onFrequencyDetected) {
                        this.onFrequencyDetected(dominantFreq);
                    }
                }
            } else {
                this.currentPersistence = 0;
            }
            this.lastDetectedFreq = dominantFreq;
        } else {
            this.currentPersistence = 0;
        }

        requestAnimationFrame(() => this.processAudio());
    }

    detectDominantFrequency() {
        const binSize = this.sampleRate / this.fftSize;
        const minBin = Math.floor(this.minFreq / binSize);
        const maxBin = Math.ceil(this.maxFreq / binSize);
        
        let maxMagnitude = this.noiseFloor;
        let dominantBin = -1;
        let averageMagnitude = 0;

        // Calcular promedio de magnitud para el rango de interés
        for (let i = minBin; i <= maxBin; i++) {
            averageMagnitude += this.frequencyData[i];
        }
        averageMagnitude /= (maxBin - minBin + 1);

        // Buscar la frecuencia dominante
        for (let i = minBin; i <= maxBin; i++) {
            const magnitude = this.frequencyData[i];
            if (magnitude > maxMagnitude && magnitude > (averageMagnitude + this.minSNR)) {
                maxMagnitude = magnitude;
                dominantBin = i;
            }
        }

        if (dominantBin !== -1) {
            return Math.round(dominantBin * binSize);
        }

        return null;
    }

    getFrequencyData() {
        return {
            data: new Uint8Array(this.frequencyData),
            minFreq: this.minFreq,
            maxFreq: this.maxFreq,
            sampleRate: this.sampleRate,
            fftSize: this.fftSize
        };
    }
}