import numpy as np
from scipy import signal as sp_signal  # Renamed to avoid conflict

class Beamformer:
    def __init__(self, virtual_mic_spacing=0.05, sample_rate=48000):
        self.virtual_mic_spacing = virtual_mic_spacing
        self.speed_of_sound = 343
        self.sample_rate = sample_rate
        self.prev_angle = 0

    def estimate_direction(self, audio_signal):
        if len(audio_signal) < 1024:  # Tamaño mínimo para procesar
            return 0
        
        window_size = 1024
        step = 256
        angles = []
        
        for i in range(0, len(audio_signal)-window_size, step):
            chunk1 = audio_signal[i:i+window_size]
            chunk2 = audio_signal[i+step:i+step+window_size]
            
            corr = sp_signal.correlate(chunk1, chunk2, mode='valid')  # Use renamed module
            lag = np.argmax(corr) - len(chunk2)
            time_delay = lag / self.sample_rate
            
            sin_theta = (time_delay * self.speed_of_sound) / (step/self.sample_rate * self.speed_of_sound)
            sin_theta = np.clip(sin_theta, -1, 1)
            angle = np.degrees(np.arcsin(sin_theta))
            
            if not np.isnan(angle):
                self.prev_angle = 0.8*self.prev_angle + 0.2*angle
                angles.append(self.prev_angle)
        
        return np.mean(angles) if angles else 0