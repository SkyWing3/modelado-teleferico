"""
validacion.py
------------------------------------------------------------------
Validacion estadistica del modelo de "Mi Teleferico".

Compara el tiempo de espera promedio MEDIDO en la estacion real contra el
tiempo de espera promedio GENERADO por la simulacion (NetLogo), mediante una
prueba t de Student para dos muestras independientes (version de Welch, que no
asume varianzas iguales).

Hipotesis:
    H0: las medias son iguales  (mu_real = mu_sim)  -> el modelo es valido.
    H1: las medias son distintas (mu_real != mu_sim).

Criterio (alfa = 0.05):
    Si p-valor > 0.05  -> NO se rechaza H0: la simulacion se comporta,
                          estadisticamente, igual que la realidad. MODELO VALIDADO.
    Si p-valor <= 0.05 -> se rechaza H0: hay diferencia significativa;
                          se debe recalibrar el modelo.

Funciona SIN dependencias externas (solo libreria estandar). Si scipy esta
instalado, lo usa para verificar el p-valor; si no, lo calcula con una
implementacion propia de la funcion beta incompleta regularizada.

Uso:
    python validacion.py
    python validacion.py datos_reales.csv datos_simulados_ejemplo.csv
"""

import csv
import math
import sys


# --------------------------------------------------------------------------
# Lectura de datos
# --------------------------------------------------------------------------
def leer_columna_numerica(ruta, columna_preferida=None):
    """
    Lee una columna numerica de un CSV. Soporta:
      - CSV simple con encabezado (toma la columna 'columna_preferida' o la ultima).
      - Tabla exportada por BehaviorSpace (salta las 6 lineas de cabecera).
    """
    with open(ruta, "r", encoding="utf-8") as f:
        primera = f.readline()
        f.seek(0)
        lineas = f.readlines()

    # Deteccion del formato BehaviorSpace (Table output)
    if "BehaviorSpace" in primera:
        # Las tablas de BehaviorSpace tienen 6 lineas de metadatos antes del encabezado
        lineas = lineas[6:]

    lector = csv.reader(lineas)
    encabezado = next(lector)
    encabezado = [h.strip().strip('"') for h in encabezado]

    idx = None
    if columna_preferida:
        for j, h in enumerate(encabezado):
            if h == columna_preferida:
                idx = j
                break
    if idx is None:
        idx = len(encabezado) - 1  # por defecto, la ultima columna numerica

    valores = []
    for fila in lector:
        if not fila or len(fila) <= idx:
            continue
        celda = fila[idx].strip().strip('"')
        try:
            valores.append(float(celda))
        except ValueError:
            continue
    return valores


# --------------------------------------------------------------------------
# Estadistica descriptiva
# --------------------------------------------------------------------------
def media(x):
    return sum(x) / len(x)


def varianza_muestral(x):
    m = media(x)
    return sum((xi - m) ** 2 for xi in x) / (len(x) - 1)


# --------------------------------------------------------------------------
# Funcion beta incompleta regularizada I_x(a,b)  (para el p-valor de la t)
# Implementacion por fraccion continua (Numerical Recipes, Lentz).
# --------------------------------------------------------------------------
def _betacf(a, b, x):
    MAXIT, EPS, FPMIN = 200, 3.0e-12, 1.0e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < FPMIN:
        d = FPMIN
    d = 1.0 / d
    h = d
    for m in range(1, MAXIT + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < EPS:
            break
    return h


def betainc(a, b, x):
    """Beta incompleta regularizada I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    front = math.exp(lbeta + a * math.log(x) + b * math.log(1.0 - x))
    if x < (a + 1.0) / (a + b + 2.0):
        return front * _betacf(a, b, x) / a
    return 1.0 - front * _betacf(b, a, 1.0 - x) / b


def p_valor_t_bilateral(t, df):
    """p-valor a dos colas para un estadistico t con df grados de libertad."""
    x = df / (df + t * t)
    return betainc(df / 2.0, 0.5, x)


# --------------------------------------------------------------------------
# Prueba t de Welch (dos muestras independientes, varianzas distintas)
# --------------------------------------------------------------------------
def t_welch(a, b):
    na, nb = len(a), len(b)
    ma, mb = media(a), media(b)
    va, vb = varianza_muestral(a), varianza_muestral(b)
    se = math.sqrt(va / na + vb / nb)
    t = (ma - mb) / se
    # Grados de libertad de Welch-Satterthwaite
    df = (va / na + vb / nb) ** 2 / (
        (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)
    )
    p = p_valor_t_bilateral(t, df)
    return t, df, p


# --------------------------------------------------------------------------
# Programa principal
# --------------------------------------------------------------------------
def main():
    ruta_real = sys.argv[1] if len(sys.argv) > 1 else "datos_reales.csv"
    ruta_sim = sys.argv[2] if len(sys.argv) > 2 else "datos_simulados_ejemplo.csv"

    reales = leer_columna_numerica(ruta_real, "tiempo_espera_total_s")
    sims = leer_columna_numerica(ruta_sim, "espera-promedio-total")

    if len(reales) < 2 or len(sims) < 2:
        print("ERROR: se requieren al menos 2 observaciones por muestra.")
        return

    t, df, p = t_welch(reales, sims)

    print("=" * 62)
    print(" VALIDACION ESTADISTICA - Linea Roja 'Mi Teleferico'")
    print("=" * 62)
    print(f" Datos reales     : n={len(reales):>3}  media={media(reales):7.2f} s"
          f"  desv={math.sqrt(varianza_muestral(reales)):6.2f} s")
    print(f" Datos simulados  : n={len(sims):>3}  media={media(sims):7.2f} s"
          f"  desv={math.sqrt(varianza_muestral(sims)):6.2f} s")
    print("-" * 62)
    print(f" Diferencia de medias : {abs(media(reales) - media(sims)):.2f} s")
    print(f" Estadistico t        : {t:.4f}")
    print(f" Grados de libertad   : {df:.2f}")
    print(f" p-valor (2 colas)    : {p:.4f}")
    print("-" * 62)
    alfa = 0.05
    if p > alfa:
        print(f" RESULTADO: p = {p:.4f} > {alfa}  ->  NO se rechaza H0.")
        print(" El modelo reproduce la realidad de forma estadisticamente")
        print(" indistinguible. >>> MODELO VALIDADO <<<")
    else:
        print(f" RESULTADO: p = {p:.4f} <= {alfa}  ->  se rechaza H0.")
        print(" Existe diferencia significativa: recalibrar parametros.")
    print("=" * 62)

    # Verificacion opcional con scipy, si esta disponible
    try:
        from scipy import stats
        t2, p2 = stats.ttest_ind(reales, sims, equal_var=False)
        print(f" [scipy] t={t2:.4f}  p={p2:.4f}  (verificacion independiente)")
    except Exception:
        print(" [scipy no instalado: p-valor calculado con implementacion propia]")


if __name__ == "__main__":
    main()
