import torch
import torch.nn as nn

class AudioDenoiser(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv1d(1, 16, kernel_size=5, padding=2),
            nn.ReLU(),
            nn.MaxPool1d(2)
        )
        self.decoder = nn.Sequential(
            nn.ConvTranspose1d(16, 1, kernel_size=5, stride=2, padding=2, output_padding=1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        x = self.encoder(x)
        return self.decoder(x)

# Uso:
# model = AudioDenoiser().cuda()  # Para GPU
# noisy_audio = torch.from_numpy(audio).float().cuda()
# clean_audio = model(noisy_audio)