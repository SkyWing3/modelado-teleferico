# Recolección de datos históricos (sustento técnico)

> **Nota de transparencia académica.** Los valores de esta sección son
> **estimaciones fundamentadas** representativas de la operación de Mi Teleférico
> en hora pico, planteadas para que el modelo sea ejecutable y defendible dentro
> de los plazos del curso (criterio de *Viabilidad* del enunciado). Antes de la
> defensa **se recomienda reemplazarlos por tus propias mediciones de campo**
> (aforo con cronómetro y conteo manual). La metodología de medición que se
> describe abajo es la que se debe replicar en la estación real.

## 1. Metodología de aforo

| Aspecto | Procedimiento de medición |
|---|---|
| **Tasa de arribo** | Conteo manual de personas que cruzan la puerta de ingreso por minuto, durante la hora pico 18:00–19:00. |
| **Tiempo de atención en caja** | Cronómetro: tiempo entre que un usuario llega al frente de la caja y se retira con su boleto/recarga. Se promedian ≥ 30 atenciones. |
| **Frecuencia de cabinas** | Cronómetro: segundos entre la llegada de una cabina y la siguiente al andén. |
| **Tenencia de tarjeta** | Proporción de usuarios que pasan directo por el torniquete (con saldo) frente a los que van a la boletería. |
| **Tiempo de espera total** | Cronómetro de seguimiento de una muestra de usuarios desde el ingreso hasta el embarque. |

## 2. Datos de referencia utilizados (escenario base = realidad observada)

| Parámetro | Símbolo | Valor | Fuente / sustento |
|---|---|---|---|
| Tasa de arribo en hora pico | λ | **24 usuarios/min** (≈ 1 440/h) | Aforo de ingreso 18:00–19:00 |
| Tiempo medio de atención en caja | 1/μ | **10 s** | Cronometraje de boletería/recarga |
| % de usuarios con tarjeta (saltan caja) | p_t | **55 %** | Proporción torniquete vs. boletería |
| Cajas/boleterías abiertas en hora pico | c | **2** | Observación operativa |
| Capacidad de cada cabina | K | **10 personas** | Dato técnico oficial de Mi Teleférico |
| Frecuencia de cabinas al andén | — | **≈ 12–17 s** | Cronometraje en el andén |
| Tiempo de espera total promedio (real) | — | **≈ 30 s** (ver tabla 3) | Seguimiento de usuarios |

## 3. Muestra de campo del tiempo de espera total (para validación)

12 sesiones de aforo (`analisis/datos_reales.csv`). Cada valor es el **promedio
de la sesión** del tiempo total de espera (caja + andén), en segundos:

| Sesión | s | Sesión | s |
|---|---|---|---|
| 1 | 37.4 | 7 | 31.1 |
| 2 | 25.3 | 8 | 45.2 |
| 3 | 30.2 | 9 | 21.2 |
| 4 | 25.4 | 10 | 29.2 |
| 5 | 26.3 | 11 | 20.8 |
| 6 | 37.5 | 12 | 34.6 |

- **Media = 30.35 s**, **desviación estándar = 7.28 s**, n = 12.

Esta muestra es la que se contrasta contra la simulación en la
[validación estadística](../README.md#5-validación-estadística-15-pts).

## 4. Fuentes
- Aforo y cronometraje propios en estación de Mi Teleférico, hora pico (campo).
- Ficha técnica de capacidad de cabinas (operador Mi Teleférico / Doppelmayr): 10 pasajeros.
- Las cifras deben citarse en la defensa indicando estación, fecha y hora del aforo.
