# Proyecto: **Exfiltración de datos por ultrasonido (Implementación inicial funcional ofensiva)**

## 📌 Propósito del proyecto

Este proyecto tiene como objetivo demostrar cómo un atacante podría **exfiltrar datos (por ejemplo, comandos, texto o archivos pequeños)** usando señales **inaudibles (ultrasonido)**, aprovechando los micrófonos y parlantes comunes de laptops y celulares. Se inspira en ataques reales como **SurfingAttack**, **DolphinAttack** y **DiskFiltration**.

---

## 🎯 Objetivos

- ✅ Crear un sistema simple que permita enviar datos codificados desde un **laptop** a un **celular** usando sonidos por encima del umbral auditivo humano (~18-22 kHz).
- ✅ Codificar los datos en **binario (ASCII)** y reproducirlos como tonos breves por el parlante.
- ✅ Detectar y decodificar esos tonos en otro dispositivo (por ahora puede grabar, y más adelante procesar).
- ✅ Mostrar cómo incluso con **hardware común**, es posible implementar técnicas de ciberseguridad ofensiva.
- ⏳ Referenciar técnicas avanzadas para futuras mejoras, aunque no se implementen en esta etapa.

---

## 🧠 Idea general

1. El atacante usa un **emisor** (ej: laptop) que convierte texto en binario.
2. Luego reproduce esos bits como tonos **ultrasónicos** (ej: 20 kHz = bit 1, 19 kHz = bit 0).
3. Un **receptor** (ej: celular) graba ese audio y lo convierte nuevamente a binario.
4. Ese binario se traduce a **texto legible o comandos** (ASCII).
5. El sistema puede ampliarse para:
   - Enviar **comandos invisibles** a asistentes virtuales.
   - Exfiltrar contraseñas, tokens, etc., desde una víctima sin cables ni red.

---

## 📦 Componentes del sistema

| Componente   | Descripción                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| Emisor       | Laptop que convierte texto a ultrasonido usando Python (con `pydub`, `numpy`) |
| Receptor     | Celular que graba audio y luego decodifica tonos (por ahora puede ser manual) |
| Codificación | ASCII a binario, y cada bit representado como una frecuencia                  |
| Comunicación | Solo sonido (sin red, sin USB, sin Bluetooth)                                 |

---

## 🛠️ Tecnología usada

- **Python** (emisor)
- **pydub, numpy, scipy** para generar y reproducir tonos ultrasónicos.
- **Celular Android** con grabadora de audio (por ahora).
- (Más adelante) Python para decodificar grabaciones y análisis.

---

## 🚧 Limitaciones conocidas

- Los **micrófonos y parlantes integrados** tienen limitaciones para captar o emitir ciertas frecuencias ultrasónicas.
- Por ahora, se requiere una grabadora en el celular (receptor), y el procesamiento es manual.
- El sistema puede fallar en entornos muy ruidosos o con eco fuerte.
- Velocidad de transmisión muy baja (ej: ~1 minuto para 200 bytes).
- Se requiere proximidad física para que la señal se capte correctamente.

---

## 🧱 Etapas del proyecto

1. ✅ Codificar texto a binario y generar audio ultrasónico en PC.
2. ✅ Emitir correctamente una secuencia binaria (ej: “HELLO”) como audio.
3. ✅ Grabar desde el celular para comprobar si se detectan los tonos.
4. ⏳ Decodificar el audio desde el celular o PC (más adelante).
5. ⏳ Simular un ataque realista (comando o mensaje oculto).
6. ⏳ (Opcional) Mostrar cómo un asistente virtual puede ser activado con ultrasonido.
7. ⏳ Crear defensa que detecte tonos sospechosos (modo pasivo).

---

## 🔍 Inspiraciones y referencias

- **DolphinAttack:** Comandos inaudibles en ultrasonido para asistentes de voz.
- **SurfingAttack:** Inyección de comandos ultrasónicos para controlar dispositivos.
- **DiskFiltration:** Exfiltración de datos usando señales acústicas de discos duros.
- **Proyecto OrbitalCTF de Solst/ICE:** Transferencia ultrasónica de archivos, explorando OFDM y técnicas avanzadas.
- **BadBIOS 2.0:** Teoría sobre malware que se comunica mediante ultrasonido.

---

## 🧩 Conceptos técnicos (referencia para futuro desarrollo)

- **Modulación por desplazamiento de frecuencia (FSK):** Usar diferentes tonos para representar bits 0 y 1.
- **OFDM (Orthogonal Frequency Division Multiplexing):** Multiplexación en múltiples frecuencias ortogonales para mejorar velocidad y robustez.
- **Códigos de corrección de errores:** Detectar y corregir errores en transmisión (Reed-Solomon, Hamming, etc.).
- **Compresión:** Reducir tamaño de datos para acelerar transmisión.
- **Bandwidth (Ancho de banda):** Cantidad de frecuencias disponibles para enviar datos, limitada en ultrasonido.
- **Time Division Multiplexing:** Enviar datos en intervalos de tiempo para evitar interferencia.

---

## 📚 Glosario

- **Ultrasonido:** Sonido con frecuencia >20 kHz, inaudible para humanos.
- **ASCII:** Código binario estándar para representar texto y símbolos.
- **Modulación:** Transformar datos digitales en señales analógicas para transmisión.
- **Error Correction Code:** Código para detectar y corregir errores en señales.
- **OFDM:** Técnica para transmitir datos usando múltiples frecuencias simultáneas ortogonales.

---

## ✍️ Notas personales

- Proyecto con enfoque **ofensivo** para entender ataques reales en ciberseguridad.
- Inspirado en investigaciones y proyectos open-source.
- Enfocado en hardware común, pero considerando parlantes externos para pruebas.
- Aprendizaje en codificación, audio digital, y seguridad informática.
- Importante balancear entre complejidad técnica y tiempo disponible para parciales.

---

## 🎯 Meta final

Tener una **implementación inicial funcional** que:

- Envíe mensajes ocultos vía ultrasonido entre laptop y celular.
- Sirva como demostración técnica para exposiciones y defensa del proyecto.
- Establezca bases para futuras mejoras o investigaciones.

---

## Referencias y recursos

- [Repositorio OrbitalCTF - Solst/ICE](https://github.com/asynchronous-x/orbital-ctf)
- [DolphinAttack paper y videos](https://dolphinattack.com/)
- Artículos académicos sobre exfiltración acústica y ataques air-gapped.
- Foros y comunidades de ciberseguridad ofensiva.
