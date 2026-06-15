# Guía para la defensa en vivo

Checklist y pasos concretos para la exposición del 15 de junio.

## A. Abrir y correr el modelo (Simulación en vivo — 20 pts)

1. Instala **NetLogo** (versión de escritorio, **7.0.4** recomendada) desde
   <https://ccl.northwestern.edu/netlogo/>. El modelo abre también en 6.x; en
   NetLogo 7 se convierte automáticamente al nuevo formato `.nlogox` al guardar.
2. Abre `modelo/MiTeleferico.nlogo`.
3. Pulsa **setup** (se dibuja la **Línea Roja** con sus tres estaciones, las dos
   vías y las cabinas) y luego **go**.
4. **Activa la vista 3D:** en la esquina superior derecha de la vista del mundo,
   pulsa el botón **"3D"**. Verás las personas y las cabinas (cajas rojas)
   renderizadas en tres dimensiones; puedes rotar con el ratón. Esto cumple el
   requerimiento de entorno tridimensional sin depender de un archivo
   `.nlogo3d` aparte (el mismo modelo se renderiza en 3D).
5. Durante la defensa, **mueve los sliders** para mostrar el efecto en tiempo
   real sobre las gráficas (personas por estación, tiempos promedio) y los
   monitores:
   - baja `cantidad-cajas-abiertas` a 1 → la fila de caja se dispara y la espera
     total salta a ~200 s (cuello de botella, ρ > 1 en Central);
   - sube `cantidad-cajas-abiertas` a 3 o `prob-tarjeta` a 70 % → la espera baja
     a ~11 s;
   - baja `numero-cabinas` → crece la fila del andén (capacidad de transporte).

## A-bis. Demo web 3D (impacto visual)

Como complemento de alto impacto a la vista 3D de NetLogo, el proyecto incluye
una simulación web 3D inmersiva (carpeta `web/`):

```bash
cd web
npm install      # solo la primera vez
npm run dev      # abre http://localhost:3000
```

Muestra la estación en 3D con cabinas circulando por el cable, pasajeros que
llegan, hacen fila, son atendidos y embarcan, con los mismos parámetros e
indicadores del modelo. Ideal para abrir o cerrar la defensa. (Requiere
Node.js 18.18+.)

## B. Experimentación masiva (BehaviorSpace)

1. Menú **Tools ▸ BehaviorSpace**.
2. Verás tres experimentos ya configurados (λ = 70/min, 18 cabinas):
   - `1-Validacion-Baseline` (30 corridas del escenario real, espera total ~17 s).
   - `2-Escenarios-Cajas` (varía las cajas/estación de 1 a 4).
   - `3-Escenario-Tarjeta` (varía el % de tarjeta: 40/55/70/85).
3. Selecciona uno, pulsa **Run**, marca **Table output** y elige dónde guardar
   el `.csv`. Cada experimento corre 3600 ticks (1 hora) por repetición.
4. Guarda el archivo del baseline como
   `analisis/datos_simulados.csv`.

## C. Validación estadística

Desde la carpeta `analisis/`:

```bash
# (Opcional, para probar el flujo con datos de ejemplo)
python validacion.py

# Con tus resultados reales de BehaviorSpace:
python validacion.py datos_reales.csv datos_simulados.csv
```

El script detecta automáticamente el formato de tabla de BehaviorSpace (salta
las 6 líneas de cabecera) y usa la columna `espera-promedio-total`.
Interpretación: **p > 0.05 ⇒ modelo validado**.

## D. Orden sugerido de la presentación (según el enunciado)

1. **Introducción y Definición** — nombre del proyecto, integrantes, sistema y
   propósito.
2. **Recolección de Datos y Modelado** — abstracción (agentes), datos de campo,
   Protocolo ODD, ecuaciones y herramienta (NetLogo).
3. **Validación y Experimentación** — prueba t, escenarios y propuesta de mejora.
4. **Demostración Práctica** — correr el modelo en vivo en 3D.

## E. Preguntas típicas del tribunal (prepárate)

- *¿Por qué ABM y no dinámica de sistemas?* → entidades discretas y autónomas;
  las colas emergen de interacciones locales (ver ODD §2).
- *¿Por qué Poisson y exponencial?* → supuestos estándar de teoría de colas;
  llegadas independientes y servicio sin memoria (ver Ecuaciones §1–2).
- *¿Cómo sé que el modelo es confiable?* → prueba t de Welch contra datos reales,
  p = 0.93 > 0.05 (no se rechaza H0).
- *¿Cuál es tu propuesta de mejora?* → abrir una tercera caja por estación reduce
  la espera total ~36 % (17→11 s); subir la tarjeta de 55 % a 70 % la reduce ~64 %
  (ver experimentación).
- *¿Por qué el andén no es el cuello de botella?* → con 18 cabinas la capacidad de
  transporte (~35/min por paradero) supera la demanda; el límite está en las cajas
  de las estaciones terminales (Central y 16 de Julio).
