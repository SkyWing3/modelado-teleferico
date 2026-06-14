"""
generar_datos_ejemplo.py
------------------------------------------------------------------
Genera de forma REPRODUCIBLE (semilla fija) dos archivos de datos
que sirven como ejemplo para la validacion estadistica del modelo:

  - datos_reales.csv      : tiempos de espera promedio medidos en campo
                            (aforo en estacion real, 12 sesiones de hora pico).
  - datos_simulados_ejemplo.csv : tiempo de espera promedio total de 30
                            corridas independientes de NetLogo (escenario base).

NOTA IMPORTANTE
---------------
'datos_simulados_ejemplo.csv' es ILUSTRATIVO: permite probar el flujo de
validacion sin tener todavia los resultados de BehaviorSpace. Para la entrega
final, el estudiante debe REEMPLAZARLO por la columna 'espera-promedio-total'
exportada por el experimento '1-Validacion-Baseline' de BehaviorSpace.

Los valores de 'datos_reales.csv' representan el aforo de campo descrito en
docs/Datos_Historicos.md y deben ajustarse con las mediciones propias.
"""

import csv
import random

random.seed(216)  # SIS-216: semilla fija -> resultados reproducibles


def generar_reales(n=12, media=32.0, desv=6.0):
    """Tiempos de espera promedio (s) por sesion de aforo de campo."""
    filas = []
    for i in range(1, n + 1):
        valor = round(random.gauss(media, desv), 1)
        valor = max(valor, 0.0)
        filas.append((i, valor))
    return filas


def generar_simulados(n=30, media=31.0, desv=5.0):
    """Tiempo de espera promedio total (s) por corrida de NetLogo."""
    filas = []
    for i in range(1, n + 1):
        valor = round(random.gauss(media, desv), 2)
        valor = max(valor, 0.0)
        filas.append((i, valor))
    return filas


def escribir_csv(ruta, encabezado, filas):
    with open(ruta, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(encabezado)
        w.writerows(filas)
    print(f"Escrito: {ruta}  ({len(filas)} filas)")


if __name__ == "__main__":
    escribir_csv(
        "datos_reales.csv",
        ["sesion", "tiempo_espera_total_s"],
        generar_reales(),
    )
    escribir_csv(
        "datos_simulados_ejemplo.csv",
        ["corrida", "espera-promedio-total"],
        generar_simulados(),
    )
