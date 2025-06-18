# Proyecto: **Exfiltración de datos por ultrasonido (Implementación ofensiva avanzada)**

## 📌 Propósito del proyecto

Este proyecto demuestra cómo un atacante puede **exfiltrar datos (comandos, texto, archivos pequeños)** usando señales **ultrasónicas inaudibles** (por encima de ~18 kHz), aprovechando micrófonos y parlantes comunes de laptops y celulares. Se inspira en ataques reales como **SurfingAttack**, **DolphinAttack** y **DiskFiltration**, y busca ser una herramienta ofensiva robusta, realista y educativa.

---

## 🎯 Objetivos

- ✅ Crear una herramienta ofensiva en **Python** capaz de transmitir y recibir datos por ultrasonido, resistente a ruido y ambiente real.
- ✅ Codificar datos en **binario (ASCII)** y transmitirlos como tonos breves (FSK: 1=20kHz, 0=19kHz, ajustable).
- ✅ Implementar técnicas de **filtrado, sincronización y detección robusta** para ambientes ruidosos.
- ✅ Permitir configuración avanzada: frecuencias, duración de bit, umbrales, etc.
- ✅ Documentar y demostrar limitaciones físicas (hardware, beat frequencies, etc.).
- ✅ Visualización web (solo para demo): espectro FFT en vivo, decodificación y estilo cyberpunk.
- ⏳ Explorar técnicas avanzadas: multi-frecuencia (FDM), OFDM, corrección de errores, compresión.

---

## 🧠 Idea general

1. El atacante usa un **emisor** (laptop) que convierte texto en binario y lo transmite como ultrasonido.
2. Un **receptor** (laptop/celular) capta el audio, hace FFT en tiempo real y decodifica los bits.
3. El sistema es configurable y robusto ante ruido, usando técnicas de filtrado y sincronización.
4. La **visualización web** solo muestra el proceso y el espectro, pero la herramienta real es Python.
5. **Frecuencias optimizadas:** START (18.5 kHz), END (19.9 kHz), datos (18.6-19.8 kHz) - inaudibles y bien captadas por micrófonos.
6. El sistema puede ampliarse para:
   - Enviar comandos invisibles a asistentes virtuales.
   - Exfiltrar contraseñas, tokens, etc., sin cables ni red.
   - Demostrar técnicas avanzadas (FDM, OFDM, etc.).

---

## 📦 Componentes del sistema

| Componente    | Descripción                                                              |
| ------------- | ------------------------------------------------------------------------ |
| Emisor        | Script Python que convierte texto a ultrasonido (FSK, configurable)      |
| Receptor      | Script Python que graba, filtra, hace FFT y decodifica en tiempo real    |
| Visualización | Web que muestra el espectro FFT y la decodificación (solo para demo)     |
| Codificación  | ASCII a binario, cada bit/frecuencia configurable, soporte para FDM/OFDM |
| Comunicación  | Solo sonido (sin red, sin USB, sin Bluetooth)                            |

---

## 🛠️ Tecnología usada

- **Python** (emisor y receptor ofensivo)
  - `sounddevice`, `numpy`, `scipy` para audio y FFT
  - Filtros digitales, sincronización, detección robusta
- **JavaScript/Web** (solo visualización)
  - Web Audio API para FFT y espectro en vivo
  - Canvas para visualización tipo Spectroid/cyberpunk
- **Celular/laptop** con micrófono y parlante integrados

---

## 🚧 Limitaciones conocidas

- Los **micrófonos y parlantes integrados** filtran frecuencias ultrasónicas; calibración necesaria.
- El sistema puede fallar en ambientes muy ruidosos o con eco fuerte.
- Velocidad limitada por robustez y sigilo (ej: ~1 min para 200 bytes en modo seguro).
- Multi-frecuencia (FDM/OFDM) puede generar batidos audibles (beat frequencies).
- La visualización web es solo para demo, no es la herramienta real de ataque.

---

## 🧱 Etapas del proyecto

1. ✅ Codificar texto a binario y generar audio ultrasónico en Python.
2. ✅ Emitir y recibir secuencias binario-ultrasonido.
3. ✅ Grabar y decodificar en tiempo real (FFT, filtrado, sincronización).
4. ✅ Calibrar frecuencias según hardware y ambiente.
5. ⏳ Implementar multi-frecuencia (FDM) y/o OFDM para mayor velocidad.
6. ⏳ Agregar corrección de errores y compresión.
7. ⏳ Visualización web avanzada para demo.
8. ⏳ Documentar teoría y limitaciones (beat frequencies, multiplexación, etc.).

---

## 🔍 Inspiraciones y referencias

- **DolphinAttack:** Comandos ultrasónicos para asistentes de voz.
- **SurfingAttack:** Inyección de comandos ultrasónicos.
- **DiskFiltration:** Exfiltración acústica desde discos duros.
- **Solst/ICE OrbitalCTF:** Transferencia ultrasónica, FDM/OFDM, visualización avanzada.
- **BadBIOS 2.0:** Teoría sobre malware acústico.
- **Teoría de señales:** FSK, FDM, OFDM, beat frequencies, filtrado digital.

---

## 🧩 Conceptos técnicos clave

- **FSK (Frequency Shift Keying):** Modulación por desplazamiento de frecuencia (datos: 18.6-19.8 kHz).
- **FDM (Frequency Division Multiplexing):** Transmisión simultánea en varias frecuencias (multi-bit).
- **OFDM (Orthogonal FDM):** Multiplexación ortogonal, base de WiFi/LTE, muy eficiente pero compleja.
- **Beat frequencies:** Batidos audibles al usar frecuencias cercanas, limitan el sigilo.
- **Filtrado digital:** Pasa banda para aislar frecuencias de interés y reducir ruido.
- **Sincronización:** Preámbulo (18.5 kHz) y detección robusta de inicio/fin (19.9 kHz) de mensaje.
- **Corrección de errores:** Paridad, checksum, Hamming, etc.
- **Compresión:** Reducir tamaño de datos para mayor velocidad.
- **Calibración:** Ajustar frecuencias y umbrales según hardware y ambiente.
- **Rango optimizado:** 18.5-19.9 kHz - inaudible para humanos pero bien captado por micrófonos.

---

## 📚 Glosario

- **Ultrasonido:** Sonido >20 kHz, inaudible para humanos.
- **ASCII:** Código binario estándar para texto.
- **Modulación:** Transformar datos digitales en señales analógicas.
- **Beat frequency:** Frecuencia resultante de la interferencia entre dos tonos cercanos.
- **OFDM:** Técnica para transmitir datos usando múltiples frecuencias ortogonales.
- **Filtro pasa banda:** Filtro digital que deja pasar solo un rango de frecuencias.

---

## ✍️ Notas y aprendizajes clave

- El ataque realista requiere robustez ante ruido y ambiente, no solo "que funcione".
- FSK es sigiloso pero lento; FDM/OFDM es rápido pero puede ser audible.
- La calibración es esencial: cada hardware tiene límites distintos.
- La visualización web es solo para demo, la herramienta real es Python.
- Documentar teoría y experimentos en el README ayuda a no perder el rumbo.
- El proyecto busca ser educativo, ofensivo y reproducible.

---

## 🎯 Meta final

Tener una **herramienta ofensiva robusta en Python** que:

- Exfiltre datos vía ultrasonido entre laptop y celular.
- Sea configurable, resistente a ruido y adaptable a hardware real.
- Sirva como demo técnica y base para futuras investigaciones.
- Tenga una visualización web atractiva solo para la presentación.

---

## Referencias y recursos

- [Repositorio Chirp: Sound-based Data Transfer](https://github.com/solst-ice/chirp)
- [DolphinAttack paper y videos](https://dolphinattack.com/)
- Artículos académicos sobre exfiltración acústica y ataques air-gapped.
- Foros y comunidades de ciberseguridad ofensiva.
- Comentarios y teoría sobre FSK, FDM, OFDM y beat frequencies en proyectos similares.
