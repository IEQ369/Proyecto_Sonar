# Experimentos reproducibles de SONAR

Esta carpeta conserva la relación entre una pregunta de investigación, la
configuración utilizada, las pruebas ejecutadas y la conclusión obtenida.

Cada experimento debe incluir como mínimo:

```text
identificador y estado
pregunta e hipótesis
alcance y exclusiones
configuración reproducible
entradas y salidas esperadas
métricas y condición de aprobación
resultados observados
interpretación y limitaciones
```

## Regla de evidencia

Una expectativa no es un resultado. Los documentos deben distinguir:

```text
DEFINIDO   → forma parte del contrato
MEDIDO     → fue producido por una prueba ejecutada
INFERIDO   → explicación razonable todavía no aislada experimentalmente
PENDIENTE  → aún no fue comprobado
```

Los resultados pequeños y deterministas pueden almacenarse como JSON o CSV.
No se guardarán grandes colecciones de audio sin justificar su utilidad y su
costo para el repositorio.

## Índice

- [E001 — Baseline reproducible de mensajes](E001-baseline-mensajes/README.md)
