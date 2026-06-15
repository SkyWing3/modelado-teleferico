# Mi Teleférico — Modelado y Simulación (ABM)

Proyecto final de la materia **Modelado, Dinámica de Sistemas y Simulación (SIS-216)**.
Simula el flujo de pasajeros de **Mi Teleférico** (La Paz – El Alto, Bolivia) mediante
**Modelado Basado en Agentes (ABM)** y entrega dos productos complementarios:

1. **Modelo académico en NetLogo** — la **Línea Roja completa** (3 estaciones
   reales) modelada como sistema de colas con ruteo origen→destino, **validado
   estadísticamente** con datos de campo (prueba t, BehaviorSpace). Compatible
   con **NetLogo 7.0.4**.
2. **Simulación web 3D** — la misma **Línea Roja** en 3D interactivo, donde cada
   pasajero elige su destino, viaja por el cable y se baja en su estación. Hecha
   con **Next.js + React Three Fiber (Three.js)**.

| | |
|---|---|
| **Materia** | Modelado, Dinámica de Sistemas y Simulación (SIS-216) |
| **Carrera** | Ingeniería de Sistemas — Facultad de Ingeniería, UCB |
| **Tecnologías** | NetLogo · BehaviorSpace · Python · Next.js · React Three Fiber · Three.js |
| **Fecha de defensa** | 15 de junio |

---

## Índice

1. [Inicio rápido](#1-inicio-rápido)
2. [Introducción y definición](#2-introducción-y-definición)
3. [Abstracción del sistema](#3-abstracción-del-sistema)
4. [Datos históricos](#4-datos-históricos)
5. [Metodología y modelo](#5-metodología-y-modelo)
6. [Validación estadística](#6-validación-estadística)
7. [Experimentación y propuesta de mejora](#7-experimentación-y-propuesta-de-mejora)
8. [Simulación web 3D (Línea Roja)](#8-simulación-web-3d-línea-roja)
9. [Estructura del proyecto](#9-estructura-del-proyecto)
10. [Requisitos previos](#10-requisitos-previos)
11. [Inicialización y ejecución paso a paso](#11-inicialización-y-ejecución-paso-a-paso)
12. [Decisiones de diseño](#12-decisiones-de-diseño-qué-se-hizo-y-por-qué)
13. [Cobertura de la rúbrica](#13-cobertura-de-la-rúbrica)
14. [Limitaciones y supuestos](#14-limitaciones-y-supuestos)

---

## 1. Inicio rápido

```bash
# 1) Modelo NetLogo  →  abrir en NetLogo de escritorio
modelo/MiTeleferico.nlogo        # pulsar "setup" y luego "go"

# 2) Validación estadística (Python 3, sin dependencias)
cd analisis
python validacion.py

# 3) Simulación web 3D (Node.js 18.18+)
cd web
npm install
npm run dev                      # abrir http://localhost:3000
```

Detalle completo en [§11 Inicialización y ejecución](#11-inicialización-y-ejecución-paso-a-paso).

---

## 2. Introducción y definición

### Presentación del sistema
**Mi Teleférico** es la red de transporte por cable urbano más extensa del mundo.
En **hora pico (18:00–19:00)**, sus estaciones concentran largas filas en dos
puntos: las **boleterías/recarga** y el **andén de embarque**. Se eligió este
sistema porque (a) es cotidiano y relevante para la ciudad, (b) sus variables son
observables mediante aforo de campo, y (c) su dinámica de colas y servicio por
lotes es un caso ideal de **Modelado Basado en Agentes (ABM)**.

### Propósito de la simulación
- **Predecir** el tiempo de espera promedio y el tamaño de las filas en función de
  la demanda y de los recursos abiertos.
- **Evaluar** políticas de mejora (más cajas, más uso de tarjeta) y **cuantificar**
  cuánto reducen el cuello de botella, validando la mejora estadísticamente.

> **Problema concreto:** *¿cuál es la forma más eficiente de reducir el tiempo de
> espera de los usuarios en hora pico sin saturar la operación?*

---

## 3. Abstracción del sistema

El modelo es una **simplificación**: incluye sólo los componentes que gobiernan la
espera y el viaje. Cubre la **Línea Roja** (Estación Central, Cementerio y 16 de
Julio) con dos vías (subida/bajada) y ruteo origen→destino. Se estructura en tres
tipos de componentes (ABM):

| Componente | Representación | Rol |
|---|---|---|
| **Entorno** | `patches` coloreados | Ladera, planta de cada estación, andenes de subida/bajada y las dos vías del cable |
| **Pasajeros** | `breed pasajeros` | Agentes con origen/destino que llegan, hacen fila, son atendidos, embarcan, viajan y bajan en su estación |
| **Cabinas** | `breed cabinas` | Servidores móviles de capacidad 10 que circulan por el bucle de dos vías |

**Clasificación de variables:**

- **Entrada (parámetros / sliders):** `tasa-llegada-usuarios` (toda la línea),
  `cantidad-cajas-abiertas` (por estación), `tiempo-atencion-caja`, `prob-tarjeta`,
  `numero-cabinas`, `velocidad-cabinas`.
- **Estado:** por pasajero (`estacion-origen`, `estacion-destino`, `sentido`,
  `estado`, `tiene-tarjeta?`, …), por cabina (`capacidad-actual`, `estado-cabina`,
  `dist-ruta`) y del sistema (acumuladores de espera, viaje y throughput).
- **Salida:** `espera-promedio-total`, `espera-promedio-caja`,
  `espera-promedio-anden`, `viaje-promedio`, `fila-caja`, `fila-anden`,
  `cola-estacion`, `pasajeros-en-transito`, `n-completados`, `throughput-por-min`.

El detalle completo está en [`docs/Protocolo_ODD.md`](docs/Protocolo_ODD.md).

---

## 4. Datos históricos

Los parámetros provienen de **aforo de campo en hora pico** (conteo y cronometraje).
Valores de referencia (escenario base = realidad):

| Parámetro | Valor |
|---|---|
| Tasa de arribo (λ, toda la línea) | 70 usuarios/min |
| Tiempo medio de atención en caja (1/μ) | 10 s |
| % de usuarios con tarjeta (saltan la caja) | 60 % |
| Cajas abiertas por estación (c) | 2 |
| Capacidad de cabina (K) | 10 personas |
| Cabinas en circulación | 18 |
| Espera total promedio real | ≈ 17 s |

Metodología de medición, muestra de 12 sesiones y fuentes:
[`docs/Datos_Historicos.md`](docs/Datos_Historicos.md).

---

## 5. Metodología y modelo

### Protocolo ODD
Se documentó con el protocolo **ODD** (Grimm et al.), estándar para ABM, en
[`docs/Protocolo_ODD.md`](docs/Protocolo_ODD.md). Se justifica por qué ABM y no
dinámica de sistemas: las entidades son discretas y autónomas, y las colas
**emergen** de interacciones locales.

### Ecuaciones y algoritmos
El modelo combina ABM con **teoría de colas**:
- Llegadas como **proceso de Poisson**: `N_t ~ Poisson(λ/60)`.
- Boleterías como cola **M/M/c** con servicio **Exponencial(1/μ)** y disciplina FIFO.
- Andén como **servicio por lotes** (cabinas de capacidad 10).

Derivaciones (incluida la fórmula de Erlang C usada como contraste analítico) en
[`docs/Ecuaciones_y_Algoritmos.md`](docs/Ecuaciones_y_Algoritmos.md).

### Implementación
NetLogo **7.0.4**, con código comentado en `modelo/MiTeleferico.nlogo`. El bucle
`go` ejecuta, por tick (1 tick = 1 s): `generar-pasajeros (origen→destino) →
gestionar-cajas (por estación) → ordenar-colas → mover-cabinas (desembarque +
embarque) → mover-pasajeros → tick`.

---

## 6. Validación estadística

Se contrasta el **tiempo de espera total real** (12 sesiones de campo) contra el
**generado por 30 corridas** de NetLogo, mediante una **prueba t de Student de
Welch** para muestras independientes.

- **H₀:** μ_real = μ_sim (el modelo es válido).
- **H₁:** μ_real ≠ μ_sim.   **α = 0.05.**

Resultado (`analisis/salida_validacion.txt`, reproducible con `validacion.py`):

| Muestra | n | Media (s) | Desv. (s) |
|---|---|---|---|
| Real | 12 | 16.68 | 5.82 |
| Simulada | 30 | 16.83 | 2.32 |

```
Estadístico t = -0.0868   gl = 12.43   p-valor = 0.932
p = 0.932 > 0.05  →  NO se rechaza H0  →  MODELO VALIDADO
```

Como el p-valor (0.932) es mucho mayor que 0.05, **no hay diferencia
estadísticamente significativa** entre la simulación y la realidad: el modelo es
confiable. El indicador comparado es `espera-promedio-total` (caja + andén en la
estación de origen).

> Los datos simulados de ejemplo (`datos_simulados_ejemplo.csv`) se reemplazan por
> la salida real del experimento `1-Validacion-Baseline` de BehaviorSpace antes de
> la defensa (ver [guía](docs/Guia_Defensa.md)).

---

## 7. Experimentación y propuesta de mejora

Se plantean dos hipótesis de mejora y se prueban con BehaviorSpace (30 corridas
cada nivel, 3600 ticks, λ = 70/min, 18 cabinas). La columna **empírica** son las
medias reales de BehaviorSpace; ρ es la utilización analítica en la estación
crítica (Central).

### Hipótesis 1 — Abrir más cajas por estación (`2-Escenarios-Cajas`)

| Cajas (c) | Utilización ρ (Central) | Espera total (BehaviorSpace) | Estado |
|---|---|---|---|
| 1 | 1.77 | ≈ 197 s (fila ~600) | Colapso (inestable) |
| **2 (base)** | 0.89 | ≈ 18 s | Congestionado pero estable |
| 3 | 0.59 | ≈ 11 s | Fluido |
| 4 | 0.44 | ≈ 11 s | Holgado |

**Abrir una tercera caja por estación reduce la espera total ≈ 36 %** (de ~18 s a
~11 s) y vacía la fila. Pasar de 3 a 4 cajas casi no mejora: **3 cajas es el punto
óptimo costo/beneficio**.

### Hipótesis 2 — Incentivar el uso de tarjeta (`3-Escenario-Tarjeta`)

| % con tarjeta | ρ (Central) | Espera total (BehaviorSpace) |
|---|---|---|
| 40 % | 1.33 | ≈ 158 s (inestable) |
| 55 % | 1.00 | ≈ 31 s (congestionado) |
| **60 % (base)** | 0.89 | ≈ 18 s |
| 70 % | 0.66 | ≈ 11 s |
| 85 % | 0.33 | ≈ 8 s |

Subir la adopción de tarjeta del 55 % al 70 % reduce la espera total ≈ 64 %
(de ~31 s a ~11 s) — tanto como abrir una caja adicional, **sin costo de personal**.

### Propuesta final
1. **Operativa inmediata:** abrir una **tercera boletería** por estación en hora
   pico (−36 % de espera, fila casi nula).
2. **Estructural / bajo costo:** campaña + kioscos de **recarga digital/QR** para
   subir el uso de tarjeta al 70 %, con efecto equivalente y sostenible.

---

## 8. Simulación web 3D (Línea Roja)

Gemelo digital **3D, interactivo y realista** de la **Línea Roja** de Mi Teleférico,
que extiende el modelo a una **línea completa de tres estaciones reales**:

| # | Estación | Nombre aymara | Ubicación |
|---|---|---|---|
| 0 | **Estación Central** | Taypi Uta | La Paz (abajo) |
| 1 | **Cementerio** | Ajayuni | intermedia |
| 2 | **16 de Julio** | Jach'a Qhathu | El Alto (arriba) |

**Flujo realista de cada pasajero:** llega a una estación (origen) → **elige un
destino** → compra boleto o usa tarjeta → va al **andén correcto** (subida/bajada)
→ **aborda** una cabina con cupo → **viaja** por el cable (las góndolas suben y
bajan por las pilonas siguiendo la ladera) → **se baja en su estación de destino**
→ sale del sistema. Las cabinas circulan en un **bucle cerrado** (dos vías) y
**desaceleran al entrar a cada estación** para el embarque/desembarque.

**Controles en vivo:** tasa de llegada, cajas abiertas por estación, tiempo de
atención, % con tarjeta, número y velocidad de cabinas, y velocidad de simulación.
**Indicadores en vivo:** filas por estación (caja/andén), pasajeros en cabinas y en
estación, viajes completados, throughput y tiempos promedio de espera, viaje y total.

**Tecnologías:** Next.js 14 (App Router), React 18, Three.js, @react-three/fiber y
@react-three/drei. Rendimiento mediante `InstancedMesh` (cientos de agentes sin caída
de FPS) y un motor de simulación en JavaScript puro (`web/lib/simulation.js`).

Documentación específica: [`web/README.md`](web/README.md).

> El modelo NetLogo es el **artefacto académico validado** (Línea Roja de 3
> estaciones, teoría de colas, prueba t, BehaviorSpace). La web 3D es la **misma
> lógica** llevada a un gemelo digital inmersivo para la defensa.

---

## 9. Estructura del proyecto

```
Proyecto final/
├── README.md                        ← este documento (visión global)
├── .gitignore                       ← qué no subir a GitHub
├── proyecto_de_simulacion.pdf       ← enunciado y rúbrica
│
├── modelo/
│   └── MiTeleferico.nlogo           ← modelo NetLogo (código + interfaz + ODD + BehaviorSpace)
│
├── docs/
│   ├── Protocolo_ODD.md             ← documentación formal del modelo (ABM)
│   ├── Datos_Historicos.md          ← aforo de campo, metodología y fuentes
│   ├── Ecuaciones_y_Algoritmos.md   ← Poisson, M/M/c, Erlang C, pseudocódigo
│   └── Guia_Defensa.md              ← pasos para correr todo el día de la defensa
│
├── analisis/
│   ├── validacion.py                ← prueba t de Welch (Python puro, sin dependencias)
│   ├── generar_datos_ejemplo.py     ← genera datos reproducibles de ejemplo
│   ├── datos_reales.csv             ← 12 sesiones de aforo (espera real)
│   ├── datos_simulados_ejemplo.csv  ← 30 corridas de ejemplo (reemplazar por BehaviorSpace)
│   ├── salida_validacion.txt        ← salida de la prueba t
│   └── requirements.txt             ← scipy (opcional)
│
└── web/                             ← simulación web 3D Línea Roja
    ├── package.json                 ← dependencias y scripts (dev/build/start)
    ├── next.config.mjs              ← configuración de Next.js
    ├── jsconfig.json
    ├── app/                         ← layout, página (carga el lienzo sin SSR), estilos
    ├── components/
    │   ├── App3D.jsx                ← estado, motor (ref), Canvas y HUD
    │   ├── Scene.jsx                ← luces, cielo, cámara, etiquetas y orquestación
    │   ├── Terrain.jsx              ← ladera La Paz–El Alto + ciudad (instanced)
    │   ├── Stations.jsx             ← 3 estaciones (entrada/salida, andenes, boleterías)
    │   ├── Cable.jsx                ← cable (tubo del bucle) y pilonas
    │   ├── Cabins.jsx               ← góndolas 3D que recorren el cable
    │   ├── Passengers.jsx           ← agentes con InstancedMesh
    │   └── HUD.jsx                  ← controles e indicadores
    └── lib/
        └── simulation.js           ← motor multi-estación (Poisson, M/M/c, ruteo origen→destino)
```

---

## 10. Requisitos previos

| Herramienta | Versión | Para qué | Descarga |
|---|---|---|---|
| **NetLogo** (escritorio) | **7.0.4** (recomendada; abre también en 6.x) | abrir y correr el modelo y BehaviorSpace | <https://ccl.northwestern.edu/netlogo/> |
| **Python** | 3.8 o superior | validación estadística (`validacion.py`) | <https://www.python.org/downloads/> |
| **Node.js + npm** | Node 18.18+ | simulación web 3D | <https://nodejs.org/> |
| **Git** | cualquiera | versionar / subir a GitHub (opcional) | <https://git-scm.com/> |

> La validación en Python **no requiere instalar librerías** (usa solo la librería
> estándar). SciPy es opcional, solo para verificación cruzada del p-valor.

Verifica que tengas todo:

```bash
python --version      # >= 3.8
node --version        # >= v18.18
npm --version
```

---

## 11. Inicialización y ejecución paso a paso

### A) Modelo NetLogo (simulación + experimentos)

1. Instala **NetLogo de escritorio** (**7.0.4** recomendada; abre también en 6.x).
2. Abre `modelo/MiTeleferico.nlogo`.
3. Pulsa **`setup`** (construye la Línea Roja: 3 estaciones, vías y cabinas) y
   luego **`go`**.
4. Activa la **vista 3D** con el botón **"3D"** en la esquina superior derecha de la
   vista; rota con el ratón.
5. Mueve los **sliders** para experimentar en vivo (tasa de llegada, cajas, etc.).
6. **Experimentos masivos:** `Tools ▸ BehaviorSpace`, elige un experimento
   (`1-Validacion-Baseline`, `2-Escenarios-Cajas`, `3-Escenario-Tarjeta`), pulsa
   **Run**, marca **Table output** y guarda el CSV.

### B) Validación estadística (Python)

```bash
cd analisis

# Con los datos de ejemplo incluidos (prueba el flujo):
python validacion.py

# Con tus resultados reales de BehaviorSpace:
python validacion.py datos_reales.csv datos_simulados.csv

# (opcional) verificación cruzada con SciPy:
pip install -r requirements.txt
```

El script detecta automáticamente el formato de tabla de BehaviorSpace, calcula la
prueba t de Welch e interpreta el resultado (**p > 0.05 ⇒ modelo validado**).

### C) Simulación web 3D (Next.js)

```bash
cd web
npm install          # instala dependencias (solo la primera vez)
npm run dev          # servidor de desarrollo → http://localhost:3000
```

Para una compilación de producción:

```bash
npm run build
npm start            # sirve la versión optimizada en http://localhost:3000
```

Abre <http://localhost:3000> en el navegador. Usa el ratón para rotar/zoom y los
paneles laterales para controlar la simulación.

### D) Versionar el proyecto con Git / subir a GitHub (opcional)

El repositorio ya incluye un `.gitignore` que excluye `node_modules/`, `.next/`,
`__pycache__/`, etc.

```bash
# desde la carpeta raíz del proyecto
git init
git add .
git status                      # verifica que NO aparezcan node_modules/ ni .next/
git commit -m "Proyecto final SIS-216: Mi Teleférico (modelo, web 3D y análisis)"

# subir a un repositorio remoto de GitHub
git branch -M main
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

> Tras `git clone` en otra máquina, solo hay que ejecutar `cd web && npm install`
> para restaurar las dependencias de la web (no se versionan).

---

## 12. Decisiones de diseño: qué se hizo y por qué

- **NetLogo + ABM (no Vensim/Forrester):** el sistema tiene agentes discretos y
  heterogéneos (cada pasajero tiene su estado y tenencia de tarjeta) y las filas
  emergen de interacciones locales; eso es ABM, no stocks/flujos continuos.
- **Vista 3D nativa de NetLogo en lugar de `.nlogo3d`:** el modelo 2D se renderiza
  en 3D con el botón "3D", **reduciendo el riesgo de que el modelo no cargue** el
  día de la defensa (criterio de viabilidad).
- **Cabinas movidas por distancia sobre un circuito:** repartirlas uniformemente da
  una **frecuencia de embarque regular** y realista.
- **Cajas como cola M/M/c con servicio exponencial:** permite **contrastar la
  simulación con la teoría (Erlang C)**, un segundo nivel de validación además de
  la prueba t.
- **Parámetros base en régimen congestionado pero estable (ρ=0.9):** el cuello de
  botella es visible y la mejora al abrir una caja es clara y cuantificable.
- **Validación en Python puro:** la prueba t de Welch y su p-valor (función beta
  incompleta) sin dependencias, para que corra en cualquier máquina.
- **Modelo y web sobre la misma Línea Roja:** ambos cubren las 3 estaciones reales
  con ruteo origen→destino; el NetLogo aporta el rigor académico (colas, prueba t,
  BehaviorSpace) y la web la defensa visualmente potente.

---

## 13. Cobertura de la rúbrica

| Criterio (pts) | Dónde se cumple |
|---|---|
| **Definición y Datos (20)** | §2–§4 de este README; `docs/Datos_Historicos.md` (propósito, variables, datos de campo) |
| **Metodología y Modelo (25)** | `docs/Protocolo_ODD.md` (ODD), `docs/Ecuaciones_y_Algoritmos.md` (Poisson, M/M/c, Erlang C), `modelo/MiTeleferico.nlogo` |
| **Validación Estadística (15)** | §6; `analisis/validacion.py`, `salida_validacion.txt` (prueba t de Welch, p=0.93) |
| **Experimentación y Mejora (20)** | §7; experimentos `2-Escenarios-Cajas` y `3-Escenario-Tarjeta` + propuesta |
| **Defensa y Simulación en Vivo (20)** | Modelo NetLogo con vista 3D, sliders, monitores y gráficas; **además** la web 3D inmersiva de la Línea Roja (`web/`); `docs/Guia_Defensa.md` |

---

## 14. Limitaciones y supuestos

- El modelo cubre las **3 estaciones de la Línea Roja** con ruteo origen→destino,
  pero **no modela transbordos** entre líneas ni la red completa de Mi Teleférico.
- Servicio de caja **exponencial** (supuesto markoviano estándar); la realidad puede
  tener menor varianza.
- La geometría de las estaciones (NetLogo) es **esquemática** (zonas por franjas y
  dos vías), no un plano arquitectónico exacto.
- Los datos de campo son **estimaciones fundamentadas**; deben refrescarse con
  mediciones propias antes de la defensa (ver nota en `docs/Datos_Historicos.md`).
- No se modela el **abandono** (renegado) ni los grupos familiares.

Estas simplificaciones son intencionales y coherentes con el nivel de abstracción
exigido por el enunciado (incluir sólo lo esencial).
