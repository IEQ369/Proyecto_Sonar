export const START_FREQUENCY = 18500;
export const SYNC_FREQUENCY = 19050;
export const END_FREQUENCY = 19600;

export const CHAR_FREQUENCIES = {
    ' ': 18600,
    'Ñ': 18700,
    'A': 18800, 'B': 18900, 'C': 18300, 'D': 18200, 'E': 19200,
    'F': 19300, 'G': 19400, 'H': 19500, 'I': 18400, 'J': 19700,
    'K': 19800, 'L': 19900, 'M': 20000, 'N': 20100, 'O': 20200,
    'P': 20300, 'Q': 20400, 'R': 20500, 'S': 20600, 'T': 20700,
    'U': 20800, 'V': 20900, 'W': 21000, 'X': 21100, 'Y': 21200,
    'Z': 21300,
    '0': 21400, '1': 21500, '2': 21600, '3': 21700, '4': 21800,
    '5': 21900, '6': 22000, '7': 22100, '8': 22200, '9': 22300
};

export const MIN_DATA_FREQUENCY = 18200;
export const MAX_DATA_FREQUENCY = 22300;
export const FREQUENCY_STEP = 100;

export function charToFrequency(char) {
    return CHAR_FREQUENCIES[char.toUpperCase()] || MIN_DATA_FREQUENCY;
}

export function frequencyToChar(frequency) {
    for (const [char, freq] of Object.entries(CHAR_FREQUENCIES)) {
        if (Math.abs(freq - frequency) <= 80) {
            return char;
        }
    }
    return '';
}

export function getAllFrequencies() {
    return Object.values(CHAR_FREQUENCIES);
}

export function getFrequencyRange() {
    return [MIN_DATA_FREQUENCY, MAX_DATA_FREQUENCY];
}

export function isControlFrequency(frequency) {
    return [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY].includes(frequency);
}

export function isDataFrequency(frequency) {
    return frequency >= MIN_DATA_FREQUENCY && frequency <= MAX_DATA_FREQUENCY;
}

export const SYMBOL_DURATION = 0.06;
export const MARKER_DURATION = 0.09;
export const CHARACTER_GAP = 0.02;

// Función para detectar conflictos de frecuencias
export function detectarConflictos() {
    const frecuenciasControl = [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY];
    const conflictos = [];

    // Revisar cada carácter contra frecuencias de control
    for (const [char, freq] of Object.entries(CHAR_FREQUENCIES)) {
        for (const controlFreq of frecuenciasControl) {
            const diferencia = Math.abs(freq - controlFreq);
            if (diferencia <= 100) { // Menos de 100 Hz de separación
                conflictos.push({
                    caracter: char,
                    frecuencia: freq,
                    conflicto: controlFreq,
                    diferencia: diferencia,
                    tipo: controlFreq === START_FREQUENCY ? 'START' :
                        controlFreq === SYNC_FREQUENCY ? 'SYNC' : 'END'
                });
            }
        }
    }

    // Revisar conflictos entre caracteres
    const caracteres = Object.entries(CHAR_FREQUENCIES);
    for (let i = 0; i < caracteres.length; i++) {
        for (let j = i + 1; j < caracteres.length; j++) {
            const [char1, freq1] = caracteres[i];
            const [char2, freq2] = caracteres[j];
            const diferencia = Math.abs(freq1 - freq2);
            if (diferencia <= 50) { // Menos de 50 Hz entre caracteres
                conflictos.push({
                    caracter: char1,
                    frecuencia: freq1,
                    conflicto: freq2,
                    diferencia: diferencia,
                    tipo: `conflicto con ${char2}`
                });
            }
        }
    }

    return conflictos;
}

// Mostrar conflictos en consola al cargar el módulo
const conflictos = detectarConflictos();
if (conflictos.length > 0) {
    console.log('=== CONFLICTOS DE FRECUENCIAS DETECTADOS ===');
    conflictos.forEach(c => {
        console.log(`${c.caracter} (${c.frecuencia}Hz) - ${c.tipo} (${c.conflicto}Hz) - Diferencia: ${c.diferencia}Hz`);
    });
    console.log('==========================================');
} else {
    console.log('No se detectaron conflictos de frecuencias');
} 