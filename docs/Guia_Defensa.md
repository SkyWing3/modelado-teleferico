# Guía para la defensa en vivo

Checklist y pasos concretos para la exposición del 15 de junio.

## A. Abrir y correr el modelo (Simulación en vivo — 20 pts)

1. Instala **NetLogo** (versión de escritorio, 6.2 o superior) desde
   <https://ccl.northwestern.edu/netlogo/>.
2. Abre `modelo/MiTeleferico.nlogo`.
3. Pulsa **setup** (se dibuja la estación con sus zonas de colores y aparecen
   las cabinas) y luego **go**.
4. **Activa la vista 3D:** en la esquina superior derecha de la vista del mundo,
   pulsa el botón **"3D"**. Verás las personas y las cabinas (cajas rojas)
   renderizadas en tres dimensiones; puedes rotar con el ratón. Esto cumple el
   requerimiento de entorno tridimensional sin depender de un archivo
   `.nlogo3d` aparte (el mismo modelo se renderiza en 3D).
5. Durante la defensa, **mueve los sliders** para mostrar el efecto en tiempo
   real sobre las gráficas de filas y el monitor de espera promedio:
   - sube `tasa-llegada-usuarios` → crece la fila del andén;
   - baja `cantidad-cajas-abiertas` a 1 → la fila de caja se dispara (cuello
     de botella);
   - sube `cantidad-cajas-abiertas` o `prob-tarjeta` → la espera baja.

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
2. Verás tres experimentos ya configurados:
   - `1-Validacion-Baseline` (30 corridas del escenario real).
   - `2-Escenarios-Cajas` (varía las cajas de 1 a 4).
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
  p = 0.94 > 0.05 (no se rechaza H0).
- *¿Cuál es tu propuesta de mejora?* → abrir una tercera caja reduce la espera
  total ~56 %; promover la tarjeta tiene un efecto similar (ver experimentación).
