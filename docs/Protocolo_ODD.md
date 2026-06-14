# Protocolo ODD del modelo "Mi Teleférico"

El protocolo **ODD** (*Overview, Design concepts, Details*) de Grimm et al.
(2006, 2010) es el estándar para documentar modelos basados en agentes (ABM).
Se eligió porque el sistema es discreto, con entidades autónomas (pasajeros,
cabinas) que interactúan localmente, lo que corresponde exactamente a un ABM
y **no** a un modelo de dinámica de sistemas (Forrester) de stocks y flujos
continuos.

---

## 1. Overview (Visión general)

### 1.1 Purpose (Propósito)
Reproducir el flujo de pasajeros en una estación de **Mi Teleférico**
(La Paz – El Alto, Bolivia) durante la **hora pico (18:00–19:00)**, con dos
objetivos:

1. **Predecir** el tiempo promedio de espera y el tamaño de las filas
   (boletería y andén) en función de la demanda y los recursos disponibles.
2. **Evaluar** cuantitativamente políticas de mejora —abrir más cajas o
   incentivar el uso de tarjeta— para reducir el cuello de botella.

### 1.2 Entities, state variables and scales (Entidades y variables de estado)

| Entidad | Tipo en NetLogo | Variables de estado | Escala |
|---|---|---|---|
| **Estación / zonas** | `patches` | `pcolor` (zona: ingreso, cajas, andén, ruta) | 33 × 25 patches (planta de la estación) |
| **Pasajeros** | `breed pasajeros` | `tiempo-llegada`, `tiempo-espera-caja`, `tiempo-espera-anden`, `estado`, `tiene-tarjeta?`, `t-inicio-caja`, `t-inicio-anden`, `t-fin-caja`, `caja-asignada`, `cabina-asignada` | individuo |
| **Cabinas** | `breed cabinas` | `capacidad-actual`, `estado-cabina`, `dist-ruta` | vehículo (cap. 10) |

- **Escala temporal:** 1 tick = **1 segundo**. Una corrida de validación dura
  3600 ticks (1 hora simulada).
- **Escala espacial:** el mundo no es toroidal; el eje X ordena las zonas
  funcionales de la estación.

**Variables de entrada (parámetros, controlados por sliders):**
`tasa-llegada-usuarios`, `cantidad-cajas-abiertas`, `tiempo-atencion-caja`,
`prob-tarjeta`, `numero-cabinas`, `velocidad-cabinas`.

**Variables de estado del sistema (acumuladores):**
`n-completados`, `suma-espera-caja`, `suma-espera-anden`, `suma-espera-total`.

**Variables de salida (reporters):**
`espera-promedio-total`, `espera-promedio-caja`, `espera-promedio-anden`,
`fila-caja`, `fila-anden`, `n-completados`.

### 1.3 Process overview and scheduling (Procesos y calendarización)
Cada tick ejecuta `go`, que llama a los procedimientos **en este orden fijo**:

1. `generar-pasajeros` — nacen nuevos pasajeros (proceso de Poisson).
2. `gestionar-cajas` — se cierran atenciones terminadas y las cajas libres
   toman al pasajero que más espera (FIFO, modelo M/M/c).
3. `mover-cabinas` — las cabinas avanzan por el cable; al pasar por el andén
   **embarcan** pasajeros y, al salir, los retiran del sistema.
4. `mover-pasajeros` — desplazamiento visual hacia la zona objetivo.
5. `tick` — avanza el reloj y refresca las gráficas.

El orden es determinista; la aleatoriedad está sólo en las llegadas y en los
tiempos de atención.

---

## 2. Design concepts (Conceptos de diseño)

- **Basic principles:** teoría de colas (M/M/c en las cajas) y transporte por
  lotes (*batch service* en las cabinas, capacidad 10).
- **Emergence:** el tamaño de las filas y el tiempo de espera promedio **emergen**
  de las decisiones locales; no se imponen por ecuación global.
- **Adaptation / Objectives:** los pasajeros siguen reglas simples (ir a la caja
  o, si tienen tarjeta, directo al andén; avanzar y abordar la primera cabina con
  cupo). No optimizan.
- **Sensing:** un pasajero "percibe" el estado de la cola (su antigüedad relativa)
  y una cabina percibe si está en el punto de embarque y si tiene cupo.
- **Interaction:** mediada por recursos compartidos limitados (cajas y asientos
  de cabina) — origen del cuello de botella.
- **Stochasticity:** llegadas `~ Poisson(λ/60)`; tiempo de atención
  `~ Exponencial(media = tiempo-atencion-caja)`; tenencia de tarjeta `~ Bernoulli(prob-tarjeta)`.
- **Observation:** monitores y gráficas en vivo; en lote, BehaviorSpace exporta
  los reporters finales a CSV.

---

## 3. Details (Detalles)

### 3.1 Initialization (`setup`)
- Se pintan las zonas (verde/azul/amarillo/gris) según `pxcor`.
- Las 4 cajas inician libres (`cajas-fin-servicio = [-1 -1 -1 -1]`).
- Se construye el circuito cerrado del cable y se crean `numero-cabinas`
  repartidas **uniformemente** sobre él (frecuencia de embarque regular).
- No hay pasajeros al inicio (la estación se llena durante el transitorio).

### 3.2 Input data
El modelo no lee archivos externos; sus parámetros provienen del aforo de campo
documentado en [`Datos_Historicos.md`](Datos_Historicos.md).

### 3.3 Submodels
- **Llegadas:** `random-poisson (tasa-llegada-usuarios / 60)` por tick.
- **Servicio en caja:** al quedar libre, una caja toma `min-one-of` (el de menor
  `t-inicio-caja`, es decir FIFO) y queda ocupada `round(random-exponential μ)` s.
- **Embarque:** si una cabina está en el punto de embarque y tiene cupo, suben los
  `min(cupo, cola-andén)` pasajeros más antiguos en el andén; se registran sus
  tiempos y se ocultan (`hide-turtle`).
- **Salida:** al pasar la cabina por la salida inferior, sus ocupantes ejecutan
  `die` (abandonan el sistema) y la cabina vuelve a `capacidad-actual = 0`.

Las ecuaciones que sustentan estos submodelos están en
[`Ecuaciones_y_Algoritmos.md`](Ecuaciones_y_Algoritmos.md).
