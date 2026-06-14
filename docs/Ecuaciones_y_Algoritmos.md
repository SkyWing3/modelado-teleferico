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

## 2. Servicio en las cajas — modelo de colas M/M/c

Las boleterías forman una cola **M/M/c**:
- **M** llegadas markovianas (Poisson),
- **M** tiempos de servicio exponenciales,
- **c** servidores (cajas abiertas).

Sólo una fracción `(1 − p_t)` de los usuarios usa la caja (los demás tienen
tarjeta). Por lo tanto la tasa efectiva de llegada a las cajas es:

```
λ_caja = (1 − p_t) · λ        [usuarios/seg]
μ = 1 / tiempo-atencion-caja  [servicios/seg por caja]
a = λ_caja / μ                (intensidad de tráfico ofrecida, erlangs)
ρ = a / c                     (utilización por servidor)
```

El tiempo de atención se muestrea como exponencial:
`round(random-exponential tiempo-atencion-caja)`.

**Condición de estabilidad:** la cola es estable sólo si **ρ < 1**
(es decir `c · μ > λ_caja`). Si `c = 1` con los parámetros base, ρ = 1.8 > 1 y
la fila crece indefinidamente: éste es precisamente el cuello de botella que el
modelo evidencia.

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

Las cabinas son un servidor de **capacidad K = 10** que atiende por lotes. Con
frecuencia de paso `f` (segundos entre cabinas) y demanda al andén
`λ_anden = λ` (todos terminan en el andén), por cada cabina suben:

```
suben = min(K − capacidad-actual, |cola-andén|)
```

Si la capacidad ofertada supera la demanda (`K / f > λ_anden`), no hay cola
acumulada y la espera media en el andén es aproximadamente la mitad del intervalo
entre cabinas:

```
W_anden ≈ f / 2
```

La frecuencia emerge de la geometría: con un circuito de longitud L, velocidad v
(patch/s) y n cabinas equiespaciadas,

```
f = L / (v · n)
```

---

## 4. Indicadores de salida

Acumuladores actualizados cuando un pasajero sale del sistema:

```
espera-promedio-caja  = suma-espera-caja  / n-completados
espera-promedio-anden = suma-espera-anden / n-completados
espera-promedio-total = suma-espera-total / n-completados
                      = (suma-espera-caja + suma-espera-anden) / n-completados
```

donde para cada pasajero:

```
tiempo-espera-caja  = t_fin_caja  − t_inicio_caja     (0 si tiene tarjeta)
tiempo-espera-anden = t_embarque  − t_inicio_anden
```

---

## 5. Algoritmo del ciclo principal (pseudocódigo)

```
cada tick (1 segundo):
    # 1. Llegadas
    k ← Poisson(λ/60)
    crear k pasajeros en la zona de ingreso
    asignar tarjeta con probabilidad p_t
        si tiene tarjeta → estado "en-fila-anden"
        si no            → estado "en-fila-caja"

    # 2. Cajas (M/M/c, disciplina FIFO)
    para cada pasajero "en-caja" con ticks ≥ t_fin_caja:
        registrar espera; pasar a "en-fila-anden"; liberar caja
    para cada caja i en 1..c:
        si caja i libre y hay alguien "en-fila-caja":
            tomar al de menor t_inicio_caja
            ocupar la caja por Exponencial(1/μ) segundos

    # 3. Cabinas (batch service, capacidad 10)
    para cada cabina:
        avanzar dist-ruta += v ; recalcular (x,y) sobre el circuito
        si está en el punto de embarque y tiene cupo:
            embarcar min(cupo, |cola-andén|) más antiguos
        si está en la salida:
            sus ocupantes salen del sistema (die)

    # 4. Visual + reloj
    mover pasajeros hacia su zona
    tick
```
