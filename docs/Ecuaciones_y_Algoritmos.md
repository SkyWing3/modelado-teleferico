# Ecuaciones y algoritmos del modelo

Este documento justifica matemáticamente cada submodelo. El modelo combina
**modelado basado en agentes** (la dinámica espacial) con **teoría de colas**
(las reglas de servicio), lo que permite contrastar la salida del simulador
contra resultados analíticos.

---

## 1. Proceso de llegadas — Poisson

El número de pasajeros que llegan en un intervalo corto se modela como un
**proceso de Poisson** de tasa λ. Si λ está en usuarios/min, la media por tick
(1 s) es λ/60, y el número de llegadas por tick es:

```
N_t ~ Poisson(λ / 60)
P(N_t = k) = e^(-λ/60) · (λ/60)^k / k!
```

En NetLogo: `random-poisson (tasa-llegada-usuarios / 60)`.

Justificación: las llegadas de personas independientes a una instalación de
servicio son el caso clásico de proceso de Poisson (tiempos entre llegadas
exponenciales e independientes).

---

## 2. Servicio en las cajas — modelo de colas M/M/c (por estación)

Las boleterías de **cada estación** forman una cola **M/M/c** independiente:
- **M** llegadas markovianas (Poisson),
- **M** tiempos de servicio exponenciales,
- **c** servidores (cajas abiertas por estación).

La demanda total λ se reparte por estación de origen con peso `w_s`
(Central 0.38, Cementerio 0.30, 16 de Julio 0.32). Sólo una fracción `(1 − p_t)`
usa la caja (los demás tienen tarjeta). La tasa efectiva a las cajas de la
estación `s` es:

```
λ_caja(s) = (1 − p_t) · w_s · λ   [usuarios/seg]
μ = 1 / tiempo-atencion-caja      [servicios/seg por caja]
a(s) = λ_caja(s) / μ              (intensidad ofrecida, erlangs)
ρ(s) = a(s) / c                   (utilización por servidor)
```

El tiempo de atención se muestrea como exponencial:
`round(random-exponential tiempo-atencion-caja)`.

**Estación crítica = la de mayor demanda de caja (Central, w = 0.38).** Con los
parámetros base (λ = 70/min, p_t = 0.60, μ = 0.1/s):

```
λ_caja(Central) = 0.40 · 0.38 · (70/60) = 0.177 /s
a = 1.77 erlangs
ρ = a / c
   c = 1 →  ρ = 1.77 > 1   →  cola inestable (colapso)
   c = 2 →  ρ = 0.89       →  estable pero congestionada  (escenario base)
   c = 3 →  ρ = 0.59       →  fluida
```

**Condición de estabilidad:** la cola es estable sólo si **ρ < 1**
(`c · μ > λ_caja(s)`). Con `c = 1` la estación Central colapsa: éste es
precisamente el cuello de botella que el modelo evidencia.

**Espera media en cola (fórmula de Erlang C):**

```
            a^c
P_wait = ─────────── · P0          (probabilidad de tener que esperar)
         c!(1 − ρ)

         ⎡ c-1  a^n        a^c     ⎤ ⁻¹
P0 =     ⎢  Σ  ────  +  ─────────  ⎥
         ⎣ n=0  n!      c!(1 − ρ)  ⎦

Wq = P_wait / (c·μ − λ_caja)       (tiempo medio de espera en la fila)
```

Estas fórmulas dan la predicción analítica con la que se compara la salida del
simulador (ver tabla de escenarios en el README), validando que el código
reproduce la teoría.

---

## 3. Servicio en el andén — servicio por lotes (batch service)

Las cabinas son servidores móviles de **capacidad K = 10** que atienden por lotes
en cada parada. La línea tiene **dos vías** (subida y bajada); un pasajero sólo
puede subir a una cabina que circula en su **sentido**. Por cada cabina suben:

```
suben = min(K − capacidad-actual, |cola-andén(s, sentido)|)
```

La frecuencia de paso por una parada emerge de la geometría: con un circuito de
longitud L, velocidad v (patch/s) y n cabinas equiespaciadas,

```
f = L / (v · n)        [segundos entre cabinas en una parada]
```

La **capacidad de transporte** ofrecida en una parada es `K / f = K · v · n / L`.
El paradero crítico es el **primero de cada sentido** (Central subida, 16 de Julio
bajada), donde las cabinas llegan vacías; para que el andén sea estable debe
cumplirse `K · v · n / L > λ_anden(parada-crítica)`. Con los parámetros base
(L ≈ 152 patches, v = 0.5, n = 18, K = 10) la capacidad es ≈ 0.59/s ≈ 35/min por
paradero, holgada frente a la demanda de subida en Central (≈ 27/min); por eso el
andén **no** es el cuello de botella y la espera media en él es aproximadamente la
mitad del intervalo entre cabinas:

```
W_anden ≈ f / 2 ≈ 8.5 s
```

---

## 4. Indicadores de salida

Acumuladores actualizados cuando un pasajero **baja en su destino**:

```
espera-promedio-caja  = suma-espera-caja  / n-completados
espera-promedio-anden = suma-espera-anden / n-completados
espera-promedio-total = suma-espera-total / n-completados
                      = (suma-espera-caja + suma-espera-anden) / n-completados
viaje-promedio        = suma-viaje / n-completados
tiempo-total-promedio = (suma-espera-caja + suma-espera-anden + suma-viaje) / n-completados
```

donde para cada pasajero:

```
tiempo-espera-caja  = t_fin_caja  − t_inicio_caja     (0 si tiene tarjeta)
tiempo-espera-anden = t_embarque  − t_inicio_anden
tiempo-viaje        = t_bajada    − t_embarque
```

`espera-promedio-total` (caja + andén en la estación de origen) es el indicador
usado para la **validación estadística** contra el aforo de campo.

---

## 5. Algoritmo del ciclo principal (pseudocódigo)

```
cada tick (1 segundo):
    # 1. Llegadas y ruteo
    k ← Poisson(λ/60)
    crear k pasajeros:
        origen  ← estación ponderada (0.38 / 0.30 / 0.32)
        destino ← uniforme entre las otras dos estaciones
        sentido ← "subida" si destino > origen, si no "bajada"
        asignar tarjeta con probabilidad p_t
            si tiene tarjeta → estado "en-fila-anden" (andén de su sentido)
            si no            → estado "en-fila-caja"  (caja de su estación)

    # 2. Cajas por estación (M/M/c, disciplina FIFO)
    para cada pasajero "en-caja" con ticks ≥ t_fin_caja:
        registrar espera; pasar a "en-fila-anden"; liberar caja
    para cada estación s, para cada caja i en 1..c:
        si caja i de s libre y hay alguien "en-fila-caja" en s:
            tomar al de menor t_inicio_caja
            ocupar la caja por Exponencial(1/μ) segundos

    # 3. Cabinas (batch service, capacidad 10, dos vías)
    para cada cabina:
        avanzar dist-ruta += v (desacelera en parada) ; recalcular (x,y)
        si está en la parada de la estación s, sentido d:
            desembarcar a los de destino = s (registrar estadísticas; die al salir)
            embarcar min(cupo, |cola-andén(s, d)|) más antiguos del andén d

    # 4. Posiciones + movimiento + reloj
    ordenar colas ; mover pasajeros hacia su objetivo
    tick
```
