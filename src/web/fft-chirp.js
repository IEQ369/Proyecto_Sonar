const MAX_FREQ = 8300;
const EDGE_PADDING = 30;
const NUM_DIVISIONS = 10;
const KEY_MARKERS = [
    { freq: 900, label: 'SPACE' },
    { freq: 1300, label: 'SPECIAL' },
    { freq: 4700, label: 'NUMBERS' },
    { freq: 5700, label: 'LETTERS' },
    { freq: 2500, label: 'START' },
    { freq: 2700, label: 'END' }
];

let audioContext, analyser, canvas, ctx;

async function startFFT() {
    canvas = document.getElementById('fft-canvas');
    ctx = canvas.getContext('2d');
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        draw();
    } catch (e) {
        ctx.fillStyle = '#f00';
        ctx.font = '20px monospace';
        ctx.fillText('Error: ' + e.message, 20, 100);
    }
}

function draw() {
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Fondo negro
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Líneas verticales y escala de frecuencias
    ctx.strokeStyle = 'rgba(50,50,50,0.5)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(49,133,255,0.8)';
    const usableWidth = canvas.width - (EDGE_PADDING * 2);
    for (let i = 0; i <= NUM_DIVISIONS; i++) {
        const norm = i / NUM_DIVISIONS;
        const x = EDGE_PADDING + norm * usableWidth;
        const freq = Math.round(norm * MAX_FREQ);
        ctx.textAlign = (i === 0) ? 'left' : (i === NUM_DIVISIONS ? 'right' : 'center');
        ctx.fillText(`${freq}Hz`, x, canvas.height - 5);
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height - 15);
            ctx.stroke();
        }
    }

    // Barras FFT
    const graphWidth = canvas.width - (2 * EDGE_PADDING);
    const barWidth = graphWidth / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
        const x = EDGE_PADDING + i * barWidth;
        const value = dataArray[i];
        const normHeight = (value / 255) * (canvas.height - 20);
        const height = Math.max(3, normHeight);
        const y = canvas.height - 20 - height;
        // Gradiente neón
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 20);
        gradient.addColorStop(0, 'rgba(20,255,255,1.0)');
        gradient.addColorStop(1, 'rgba(65,155,255,0.9)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.max(2, barWidth - 1), y);
        ctx.lineTo(x + Math.max(2, barWidth - 1), canvas.height - 20);
        ctx.lineTo(x, canvas.height - 20);
        ctx.closePath();
        ctx.fill();
        // Glow
        if (value > 50) {
            ctx.shadowColor = 'rgba(20,255,255,0.7)';
            ctx.shadowBlur = 3;
            ctx.fillRect(x, y, Math.max(2, barWidth - 1), height);
            ctx.shadowBlur = 0;
        }
    }

    // Marcadores clave
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px monospace';
    KEY_MARKERS.forEach(marker => {
        const norm = marker.freq / MAX_FREQ;
        const x = EDGE_PADDING + norm * usableWidth;
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height - 20);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = (norm < 0.05) ? 'left' : (norm > 0.95 ? 'right' : 'center');
        ctx.fillText(marker.label, x, 10);
    });

    requestAnimationFrame(draw);
}

window.onload = startFFT;
