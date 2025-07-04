// Protocolo y mapeo de frecuencias ultrasónicas (equivalente a frecuencias_lite.py)
// Uso: importar en emisor y receptor web para mantener sincronía

// Frecuencias de control (protocolo)
export const START_FREQUENCY = 18500; // Hz - Inicio de transmisión
export const SYNC_FREQUENCY = 18600;  // Hz - Sincronización
export const END_FREQUENCY = 19700;   // Hz - Fin de transmisión

export const MIN_DATA_FREQUENCY = 18700;
export const MAX_DATA_FREQUENCY = 22400;
export const FREQUENCY_STEP = 100;

// Letras y números (A-Z, 0-9) en el rango funcional - MAPEO ÚNICO
export const CHAR_FREQUENCIES = {
    'A': 18700, 'B': 18800, 'C': 18900, 'D': 19000, 'E': 19100,
    'F': 19200, 'G': 19300, 'H': 19400, 'I': 19500, 'J': 19600,
    'K': 19700, 'L': 19800, 'M': 19900, 'N': 20000, 'O': 20100,
    'P': 20200, 'Q': 20300, 'R': 20400, 'S': 20500, 'T': 20600,
    'U': 20700, 'V': 20800, 'W': 20900, 'X': 21000, 'Y': 21100,
    'Z': 21200,
    '0': 21300, '1': 21400, '2': 21500, '3': 21600, '4': 21700,
    '5': 21800, '6': 21900, '7': 22000, '8': 22100, '9': 22200,
    ' ': 22300, // Espacio
    'Ñ': 22400 // Ñ
};

export function charToFrequency(char) {
    return CHAR_FREQUENCIES[char.toUpperCase()] || MIN_DATA_FREQUENCY;
}

export function frequencyToChar(frequency) {
    for (const [char, freq] of Object.entries(CHAR_FREQUENCIES)) {
        if (Math.abs(freq - frequency) <= 80) { // Usar la misma tolerancia que el receptor
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

export const SYMBOL_DURATION = 0.12; // segundos (120 ms)
export const MARKER_DURATION = 0.15; // segundos (150 ms)
export const CHARACTER_GAP = 0.08;   // segundos (80 ms) 