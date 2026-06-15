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
Reproducir el flujo de pasajeros en la **Línea Roja de Mi Teleférico**
(La Paz – El Alto, Bolivia) durante la **hora pico (18:00–19:00)**. La línea une
**tres estaciones reales** —Estación Central (Taypi Uta), Cementerio (Ajayuni) y
16 de Julio (Jach'a Qhathu)— y cada pasajero **elige un destino**, viaja por el
cable y **se baja en su estación**. Los objetivos son:

1. **Predecir** el tiempo promedio de espera (boletería y andén), de viaje y el
   tamaño de las filas por estación, en función de la demanda y los recursos.
2. **Evaluar** cuantitativamente políticas de mejora —abrir más cajas o
   incentivar el uso de tarjeta— para reducir el cuello de botella.

### 1.2 Entities, state variables and scales (Entidades y variables de estado)

| Entidad | Tipo en NetLogo | Variables de estado | Escala |
|---|---|---|---|
| **Línea / estaciones / vías** | `patches` | `pcolor` (ladera, planta de estación, andén subida/bajada, vías del cable), `plabel` (nombre de estación) | 61 × 33 patches (3 estaciones + 2 vías) |
| **Pasajeros** | `breed pasajeros` | `estacion-origen`, `estacion-destino`, `sentido`, `estado`, `tiene-tarjeta?`, `tiempo-llegada`, `tiempo-espera-caja`, `tiempo-espera-anden`, `tiempo-viaje`, `t-inicio-caja`, `t-inicio-anden`, `t-fin-caja`, `t-board`, `caja-asignada`, `cabina-asignada` | individuo |
| **Cabinas** | `breed cabinas` | `capacidad-actual`, `estado-cabina`, `dist-ruta` | vehículo (cap. 10) |

- **Escala temporal:** 1 tick = **1 segundo**. Una corrida de validación dura
  3600 ticks (1 hora simulada).
- **Escala espacial:** mundo no toroidal. El eje X ordena las tres estaciones
  (centros en x = −22, 0, 22); la vía de **subida** corre arriba (y ≈ +10) y la
  de **bajada** abajo (y ≈ −10), formando un bucle cerrado de dos vías.

**Variables de entrada (parámetros, controlados por sliders):**
`tasa-llegada-usuarios` (toda la línea), `cantidad-cajas-abiertas` (por estación),
`tiempo-atencion-caja`, `prob-tarjeta`, `numero-cabinas`, `velocidad-cabinas`.

**Variables de estado del sistema (acumuladores):**
`n-completados`, `suma-espera-caja`, `suma-espera-anden`, `suma-viaje`,
`suma-espera-total`, `suma-total-sistema`.

**Variables de salida (reporters):**
`espera-promedio-total`, `espera-promedio-caja`, `espera-promedio-anden`,
`viaje-promedio`, `tiempo-total-promedio`, `fila-caja`, `fila-anden`,
`fila-caja-est`, `fila-anden-est`, `cola-estacion`, `pasajeros-en-transito`,
`pasajeros-en-estacion`, `throughput-por-min`, `n-completados`.

### 1.3 Process overview and scheduling (Procesos y calendarización)
Cada tick ejecuta `go`, que llama a los procedimientos **en este orden fijo**:

1. `generar-pasajeros` — nacen nuevos pasajeros (proceso de Poisson); a cada uno
   se le asigna estación de **origen** (ponderada) y **destino**, y por tanto un
   **sentido** (subida si destino > origen, bajada si no).
2. `gestionar-cajas` — en cada estación se cierran atenciones terminadas y las
   cajas libres toman al pasajero que más espera (FIFO, modelo M/M/c).
3. `ordenar-colas` — calcula la posición ordenada de cada pasajero en la fila de
   caja o en el andén de su sentido.
4. `mover-cabinas` — las cabinas avanzan por el bucle; al entrar a una parada
   **desembarcan** a quienes llegan a su destino y **embarcan** a quienes esperan
   en ese sentido (servicio por lotes, cap. 10).
5. `mover-pasajeros` — desplazamiento hacia el objetivo; los que llegan a la
   salida abandonan el sistema.
6. `tick` — avanza el reloj y refresca las gráficas.

El orden es determinista; la aleatoriedad está sólo en las llegadas, los
tiempos de atención y la elección de origen/destino.

---

## 2. Design concepts (Conceptos de diseño)

- **Basic principles:** teoría de colas (M/M/c en las cajas) y transporte por
  lotes (*batch service* en las cabinas, capacidad 10).
- **Emergence:** el tamaño de las filas y el tiempo de espera promedio **emergen**
  de las decisiones locales; no se imponen por ecuación global.
- **Adaptation / Objectives:** los pasajeros siguen reglas simples (ir a la caja
  o, si tienen tarjeta, directo al andén de su **sentido**; abordar la primera
  cabina con cupo que va en su dirección; bajarse al llegar a su destino). No
  optimizan ni eligen ruta: el destino fija el sentido.
- **Sensing:** un pasajero "percibe" su antigüedad relativa en la cola y su propio
  destino; una cabina percibe si está en una parada, a qué estación y sentido
  corresponde, y si tiene cupo.
- **Interaction:** mediada por recursos compartidos limitados (cajas por estación
  y asientos de cabina) — origen del cuello de botella.
- **Stochasticity:** llegadas `~ Poisson(λ/60)`; tiempo de atención
  `~ Exponencial(media = tiempo-atencion-caja)`; tenencia de tarjeta `~ Bernoulli(prob-tarjeta)`;
  estación de **origen** ponderada (38 % / 30 % / 32 %) y **destino** uniforme
  entre las otras dos estaciones.
- **Observation:** monitores y gráficas en vivo; en lote, BehaviorSpace exporta
  los reporters finales a CSV.

---

## 3. Details (Detalles)

### 3.1 Initialization (`setup`)
- Se pinta la ladera, las dos vías del cable y la planta de las **tres
  estaciones** (con sus andenes de subida/bajada, mostradores de caja y etiquetas).
- Las 12 cajas (3 estaciones × 4) inician libres
  (`cajas-fin-servicio = [-1 -1 … -1]`, lista plana de 12 con índice estación·4 + caja).
- Se construye el **bucle cerrado de dos vías** y su lista de **paradas**
  (`[estación sentido distancia]`), y se crean `numero-cabinas` repartidas
  **uniformemente** sobre el circuito (frecuencia de paso regular).
- No hay pasajeros al inicio (la línea se llena durante el transitorio).

### 3.2 Input data
El modelo no lee archivos externos; sus parámetros provienen del aforo de campo
documentado en [`Datos_Historicos.md`](Datos_Historicos.md).

### 3.3 Submodels
- **Llegadas y ruteo:** `random-poisson (tasa-llegada-usuarios / 60)` por tick;
  a cada pasajero se le asigna origen ponderado, destino uniforme entre las otras
  dos estaciones y, en consecuencia, el sentido (subida/bajada).
- **Servicio en caja (por estación):** al quedar libre, una caja toma `min-one-of`
  (el de menor `t-inicio-caja`, FIFO) entre los que esperan **en esa estación** y
  queda ocupada `round(random-exponential μ)` s.
- **Desembarque:** cuando una cabina entra a la parada de la estación `s`, los
  pasajeros a bordo cuyo `estacion-destino = s` bajan, registran sus tiempos
  (caja + andén + viaje) y caminan a la salida (`die` al llegar).
- **Embarque:** en la misma parada, si hay cupo suben los `min(cupo, cola-andén)`
  pasajeros más antiguos que esperan **en ese sentido**; se ocultan (`hide-turtle`)
  y viajan con la cabina hasta su destino.

Las ecuaciones que sustentan estos submodelos están en
[`Ecuaciones_y_Algoritmos.md`](Ecuaciones_y_Algoritmos.md).
