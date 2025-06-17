const FREQ_1 = 20000; // 1 = 20kHz
const FREQ_0 = 19000; // 0 = 19kHz
const BIT_DURATION = 100; // Duración de cada bit en ms

function textToBinary(text) {
  return Array.from(text)
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}

async function emitir() {
  const mensaje = document.getElementById('mensaje').value;
  if (!mensaje) {
    document.getElementById('estado').textContent = 'Escribe un mensaje';
    return;
  }
  const binario = textToBinary(mensaje);
  document.getElementById('estado').textContent = 'Transmitiendo: ' + binario;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  for (let i = 0; i < binario.length; i++) {
    const freq = binario[i] === '1' ? FREQ_1 : FREQ_0;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + BIT_DURATION / 1000);
    await new Promise(r => setTimeout(r, BIT_DURATION));
  }
  document.getElementById('estado').textContent = 'Transmisión completada';
}

document.getElementById('emitir').onclick = emitir;