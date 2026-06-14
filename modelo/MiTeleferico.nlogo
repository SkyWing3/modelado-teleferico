;; =====================================================================
;;  SIMULACION DE LA ESTACION DE "MI TELEFERICO"  (La Paz - El Alto)
;;  Modelado Basado en Agentes (ABM) - NetLogo
;;  Materia: Modelado, Dinamica de Sistemas y Simulacion (SIS-216)
;;  Universidad Catolica Boliviana
;;
;;  Convencion temporal:  1 tick = 1 segundo simulado.
;;  Convencion espacial:  el mundo (no toroidal) representa la planta
;;                        de una estacion vista en planta; el eje X
;;                        ordena las zonas funcionales:
;;                          x < -10        -> Zona VERDE  : Ingreso
;;                          -10 <= x <  0  -> Zona AZUL   : Boleterias/cajas
;;                            0 <= x < 10  -> Zona AMARILLA: Anden de embarque
;;                          x >= 10        -> Zona GRIS   : Ruta aerea (cable)
;; =====================================================================

breed [ pasajeros pasajero ]
breed [ cabinas   cabina   ]

globals [
  ;; --- Parametros estructurales (dato real fijo) ---
  capacidad-cabina        ;; maximo de personas por cabina (oficial = 10)

  ;; --- Estructura de servicio de las cajas / boleterias ---
  cajas-fin-servicio      ;; lista de 4 posiciones: tick en que cada caja queda libre
                          ;; (-1 = caja libre en este momento)

  ;; --- Geometria de la ruta aerea de las cabinas ---
  ruta                    ;; lista de waypoints (parejas [x y]) del circuito cerrado
  ruta-largo              ;; longitud total del circuito (en patches)

  ;; --- Acumuladores estadisticos (variables de SALIDA del modelo) ---
  n-completados           ;; pasajeros que abordaron y salieron del sistema
  suma-espera-caja        ;; suma de tiempos de espera en caja (s)
  suma-espera-anden       ;; suma de tiempos de espera en anden (s)
  suma-espera-total       ;; suma de tiempos de espera totales (s)
]

pasajeros-own [
  tiempo-llegada          ;; tick de ingreso a la estacion
  tiempo-espera-caja      ;; segundos en fila + atencion de caja
  tiempo-espera-anden     ;; segundos esperando la cabina en el anden
  estado                  ;; "en-fila-caja" "en-caja" "en-fila-anden" "viajando"
  tiene-tarjeta?          ;; TRUE si ya tiene saldo: tapa en el torniquete y salta la caja
  t-inicio-caja           ;; tick en que empezo a hacer fila en la caja
  t-inicio-anden          ;; tick en que llego al anden
  t-fin-caja              ;; tick en que termina de ser atendido en la caja
  caja-asignada           ;; indice (0..3) de la caja que lo atiende; -1 si ninguna
  cabina-asignada         ;; who de la cabina en la que viaja; -1 si no viaja
  tx                      ;; coordenada X objetivo (posicion en la fila ordenada)
  ty                      ;; coordenada Y objetivo (carril de la fila)
]

cabinas-own [
  capacidad-actual        ;; pasajeros a bordo (0..capacidad-cabina)
  estado-cabina           ;; "en-ruta" o "cargando"
  dist-ruta               ;; distancia recorrida sobre el circuito (parametro de avance)
]

;; =====================================================================
;;  A.  INICIALIZACION
;; =====================================================================
to setup
  clear-all

  set capacidad-cabina 10
  set n-completados   0
  set suma-espera-caja  0
  set suma-espera-anden 0
  set suma-espera-total 0

  dibujar-estacion
  inicializar-cajas
  inicializar-ruta-cabinas
  crear-cabinas-iniciales

  reset-ticks
end

;; Pinta las zonas logicas de la estacion sobre los patches
to dibujar-estacion
  ask patches [
    (ifelse
      pxcor < -10 [ set pcolor green - 3 ]   ;; Zona de ingreso
      pxcor <   0 [ set pcolor blue  - 2 ]   ;; Zona de cajas / boleterias
      pxcor <  10 [ set pcolor yellow - 1 ]  ;; Zona de anden de embarque
                  [ set pcolor gray  - 2 ])  ;; Ruta aerea del cable
  ]
  ;; Marcadores de las 4 cajas (mostradores) en la zona azul
  ask patches with [ pxcor = -1 and member? pycor [ 6 2 -2 -6 ] ] [ set pcolor white ]
  ;; Marcador del punto de embarque, frente al anden
  ask patches with [ pxcor = 10 and abs pycor <= 1 ] [ set pcolor orange ]
  ;; Etiquetas de las zonas
  ask patch -13 11 [ set plabel "INGRESO" ]
  ask patch  -5 11 [ set plabel "CAJAS" ]
  ask patch   5 11 [ set plabel "ANDEN" ]
  ask patch  14 11 [ set plabel "CABLE" ]
end

;; Devuelve la coordenada Y del carril de la caja k (0..3)
to-report caja-y [ k ]
  report item k (list 6 2 -2 -6)
end

;; Las cajas se modelan como servidores; -1 indica "libre"
to inicializar-cajas
  set cajas-fin-servicio (list -1 -1 -1 -1)
end

;; Define el circuito cerrado del cable como una lista de waypoints
;; y calcula su longitud total para poder mover las cabinas por distancia.
to inicializar-ruta-cabinas
  set ruta (list
    (list 12  11)    ;; entrada superior a la estacion
    (list 12   0)    ;; PUNTO DE EMBARQUE (frente al anden)
    (list 12 -11)    ;; salida inferior
    (list 16 -11)    ;; retorno por el costado derecho
    (list 16  11) )  ;; vuelve arriba y cierra el circuito
  set ruta-largo 0
  let n length ruta
  let i 0
  while [ i < n ] [
    set ruta-largo ruta-largo + distancia-puntos (item i ruta) (item ((i + 1) mod n) ruta)
    set i i + 1
  ]
end

;; Crea las cabinas repartidas uniformemente sobre el circuito,
;; de modo que la frecuencia de embarque sea regular.
to crear-cabinas-iniciales
  let k 0
  repeat numero-cabinas [
    create-cabinas 1 [
      set shape "box"
      set color red
      set size 2.5
      set capacidad-actual 0
      set estado-cabina "en-ruta"
      set dist-ruta k * (ruta-largo / numero-cabinas)
      let p punto-en-ruta dist-ruta
      setxy (item 0 p) (item 1 p)
    ]
    set k k + 1
  ]
end

;; =====================================================================
;;  B.  CICLO PRINCIPAL  (motor de la simulacion)
;; =====================================================================
to go
  generar-pasajeros
  gestionar-cajas
  ordenar-colas        ;; calcula la posicion ordenada de cada pasajero en su fila
  mover-cabinas        ;; incluye el embarque en el anden
  mover-pasajeros      ;; desplazamiento fluido hacia su objetivo
  tick                 ;; avanza 1 segundo simulado y refresca las graficas
end

;; =====================================================================
;;  C.  LOGICA DE COMPORTAMIENTO DE LOS AGENTES
;; =====================================================================

;; --- Generacion de demanda (proceso de Poisson) ---
to generar-pasajeros
  let media-por-tick (tasa-llegada-usuarios / 60)   ;; usuarios/min -> usuarios/seg
  let llegadas random-poisson media-por-tick
  repeat llegadas [
    create-pasajeros 1 [
      set shape "person"
      set size 1.3
      set color one-of (list white gray orange brown)
      set tiempo-llegada ticks
      set tiempo-espera-caja  0
      set tiempo-espera-anden 0
      set caja-asignada   -1
      set cabina-asignada -1
      set tiene-tarjeta? (random-float 100 < prob-tarjeta)
      ;; aparece en la zona verde de ingreso
      setxy (-16 + random-float 4) (-11 + random-float 22)
      set tx xcor
      set ty ycor
      ifelse tiene-tarjeta? [
        ;; usuario con saldo: tapa en el torniquete y va directo al anden
        set estado "en-fila-anden"
        set t-inicio-anden ticks
      ] [
        ;; usuario sin saldo / con efectivo: debe pasar por la boleteria
        set estado "en-fila-caja"
        set t-inicio-caja ticks
      ]
    ]
  ]
end

;; --- Servicio en las cajas (modelo de colas multi-servidor M/M/c) ---
to gestionar-cajas
  ;; 1) Terminar las atenciones cuyo tiempo de servicio ya se cumplio
  ask pasajeros with [ estado = "en-caja" and ticks >= t-fin-caja ] [
    set tiempo-espera-caja (ticks - t-inicio-caja)
    set estado "en-fila-anden"
    set t-inicio-anden ticks
    set cajas-fin-servicio replace-item caja-asignada cajas-fin-servicio -1
    set caja-asignada -1
  ]

  ;; 2) Asignar cada caja libre al pasajero que mas tiempo lleva esperando (FIFO)
  let i 0
  while [ i < cantidad-cajas-abiertas ] [
    if (item i cajas-fin-servicio) = -1 [
      let en-espera (pasajeros with [ estado = "en-fila-caja" ])
      if any? en-espera [
        let cliente min-one-of en-espera [ t-inicio-caja ]
        ;; tiempo de atencion ~ Exponencial(media = tiempo-atencion-caja)
        let dur max (list 1 round (random-exponential tiempo-atencion-caja))
        ask cliente [
          set t-fin-caja ticks + dur
          set caja-asignada i
          set estado "en-caja"
        ]
        set cajas-fin-servicio replace-item i cajas-fin-servicio (ticks + dur)
      ]
    ]
    set i i + 1
  ]
end

;; --- Movimiento de las cabinas sobre el cable + embarque ---
to mover-cabinas
  ask cabinas [
    set dist-ruta dist-ruta + velocidad-cabinas
    let p punto-en-ruta dist-ruta
    setxy (item 0 p) (item 1 p)

    ;; Si esta junto al punto de embarque (12,0): se detiene a cargar
    ifelse (abs (xcor - 12) < 1.5 and abs ycor < 2) [
      set estado-cabina "cargando"
      embarcar
    ] [
      set estado-cabina "en-ruta"
    ]

    ;; Al pasar por la salida inferior, los pasajeros a bordo dejan el sistema
    if (ycor < -9 and capacidad-actual > 0) [
      ask pasajeros with [ estado = "viajando" and cabina-asignada = [who] of myself ] [ die ]
      set capacidad-actual 0
    ]
  ]
end

;; Embarca a los pasajeros del frente de la fila del anden (contexto: cabina)
to embarcar
  let cupo (capacidad-cabina - capacidad-actual)
  if cupo > 0 [
    let cola (pasajeros with [ estado = "en-fila-anden" ])
    let suben min (list cupo (count cola))
    if suben > 0 [
      ;; suben los que llegaron primero al anden (disciplina FIFO)
      ask min-n-of suben cola [ t-inicio-anden ] [
        set tiempo-espera-anden (ticks - t-inicio-anden)
        registrar-estadisticas
        set estado "viajando"
        set cabina-asignada [who] of myself
        move-to myself
        hide-turtle
      ]
      set capacidad-actual capacidad-actual + suben
    ]
  ]
end

;; Acumula los indicadores de un pasajero que sale del sistema (contexto: pasajero)
to registrar-estadisticas
  set suma-espera-caja  suma-espera-caja  + tiempo-espera-caja
  set suma-espera-anden suma-espera-anden + tiempo-espera-anden
  set suma-espera-total suma-espera-total + (tiempo-espera-caja + tiempo-espera-anden)
  set n-completados n-completados + 1
end

;; --- Asigna a cada pasajero su lugar ordenado en la fila correspondiente ---
to ordenar-colas
  ;; Fila de las cajas: se reparte en tantos carriles como cajas abiertas (FIFO)
  let lista-caja sort-on [ t-inicio-caja ] (pasajeros with [ estado = "en-fila-caja" ])
  let i 0
  foreach lista-caja [ p ->
    let carril (i mod cantidad-cajas-abiertas)
    let pos    (int (i / cantidad-cajas-abiertas))
    ask p [
      set tx (-2 - pos * 1.1)
      set ty caja-y carril
    ]
    set i i + 1
  ]
  ;; Pasajeros siendo atendidos: se ubican justo en su caja
  ask pasajeros with [ estado = "en-caja" ] [
    set tx -1
    set ty caja-y caja-asignada
  ]
  ;; Fila del anden: se ordena hacia el punto de embarque (FIFO)
  let lista-anden sort-on [ t-inicio-anden ] (pasajeros with [ estado = "en-fila-anden" ])
  let j 0
  foreach lista-anden [ p ->
    ask p [
      set tx (9 - (j mod 8) * 0.9)
      set ty (-3 + (int (j / 8)) * 1.3)
    ]
    set j j + 1
  ]
end

;; --- Desplazamiento fluido de cada pasajero hacia su objetivo (tx, ty) ---
to mover-pasajeros
  ask pasajeros with [ estado != "viajando" ] [
    let d distancexy tx ty
    ifelse d > 0.4 [
      facexy tx ty
      fd min (list 0.4 d)
    ] [
      setxy tx ty
    ]
  ]
end

;; =====================================================================
;;  D.  UTILIDADES GEOMETRICAS DEL CIRCUITO
;; =====================================================================

;; Distancia euclidiana entre dos puntos [x y]
to-report distancia-puntos [ a b ]
  report sqrt ( ((item 0 b) - (item 0 a)) ^ 2 + ((item 1 b) - (item 1 a)) ^ 2 )
end

;; Devuelve el punto [x y] ubicado a una distancia d sobre el circuito cerrado
to-report punto-en-ruta [ d ]
  let dd (d mod ruta-largo)
  let n length ruta
  let i 0
  while [ i < n ] [
    let a item i ruta
    let b item ((i + 1) mod n) ruta
    let seg distancia-puntos a b
    ifelse dd <= seg [
      let f ifelse-value (seg = 0) [ 0 ] [ dd / seg ]
      let x (item 0 a) + f * ((item 0 b) - (item 0 a))
      let y (item 1 a) + f * ((item 1 b) - (item 1 a))
      report (list x y)
    ] [
      set dd dd - seg
      set i i + 1
    ]
  ]
  report (item 0 ruta)
end

;; =====================================================================
;;  E.  REPORTERS DE SALIDA (monitores, graficas y BehaviorSpace)
;; =====================================================================
to-report fila-caja
  report count pasajeros with [ estado = "en-fila-caja" ]
end

to-report fila-anden
  report count pasajeros with [ estado = "en-fila-anden" ]
end

to-report espera-promedio-total
  report ifelse-value (n-completados = 0) [ 0 ] [ suma-espera-total / n-completados ]
end

to-report espera-promedio-caja
  report ifelse-value (n-completados = 0) [ 0 ] [ suma-espera-caja / n-completados ]
end

to-report espera-promedio-anden
  report ifelse-value (n-completados = 0) [ 0 ] [ suma-espera-anden / n-completados ]
end

to-report pasajeros-en-estacion
  report count pasajeros with [ estado != "viajando" ]
end

to-report throughput-por-min
  report ifelse-value (ticks = 0) [ 0 ] [ n-completados / (ticks / 60) ]
end
@#$#@#$#@
GRAPHICS-WINDOW
220
10
657
344
-1
-1
13.0
1
10
1
1
1
0
1
1
1
-16
16
-12
12
0
0
1
ticks
30.0

BUTTON
10
10
80
43
setup
setup
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

BUTTON
85
10
150
43
go
go
T
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

BUTTON
155
10
212
43
paso
go
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

SLIDER
10
55
212
88
tasa-llegada-usuarios
tasa-llegada-usuarios
0
60
24.0
1
1
usu/min
HORIZONTAL

SLIDER
10
92
212
125
cantidad-cajas-abiertas
cantidad-cajas-abiertas
1
4
2.0
1
1
cajas
HORIZONTAL

SLIDER
10
129
212
162
tiempo-atencion-caja
tiempo-atencion-caja
5
60
10.0
1
1
seg
HORIZONTAL

SLIDER
10
166
212
199
prob-tarjeta
prob-tarjeta
0
100
55.0
5
1
% con tarjeta
HORIZONTAL

SLIDER
10
203
212
236
numero-cabinas
numero-cabinas
3
12
6.0
1
1
cabinas
HORIZONTAL

SLIDER
10
240
212
273
velocidad-cabinas
velocidad-cabinas
0.1
1
0.5
0.1
1
patch/s
HORIZONTAL

MONITOR
10
285
130
334
Espera prom. total (s)
espera-promedio-total
1
1
12

MONITOR
133
285
213
334
Abordaron
n-completados
0
1
12

MONITOR
10
338
105
387
Fila caja
fila-caja
0
1
12

MONITOR
110
338
213
387
Fila anden
fila-anden
0
1
12

MONITOR
10
391
130
440
Espera caja (s)
espera-promedio-caja
1
1
12

MONITOR
133
391
213
440
Espera anden (s)
espera-promedio-anden
1
1
12

MONITOR
10
444
213
493
Throughput (pasajeros/min)
throughput-por-min
1
1
12

PLOT
220
350
657
500
Tamano de las filas en el tiempo
ticks (segundos)
personas
0.0
60.0
0.0
10.0
true
true
"" ""
PENS
"Fila caja" 1.0 0 -13345367 true "" "plot fila-caja"
"Fila anden" 1.0 0 -2674135 true "" "plot fila-anden"

PLOT
220
505
657
650
Tiempo de espera promedio (s)
ticks (segundos)
segundos
0.0
60.0
0.0
10.0
true
true
"" ""
PENS
"Espera total" 1.0 0 -16777216 true "" "plot espera-promedio-total"
"Espera caja" 1.0 0 -13345367 true "" "plot espera-promedio-caja"
"Espera anden" 1.0 0 -2674135 true "" "plot espera-promedio-anden"

@#$#@#$#@
# Simulacion de la estacion de "Mi Teleferico"

Modelo de **Modelado Basado en Agentes (ABM)** que reproduce el flujo de
pasajeros en una estacion del teleferico de La Paz - El Alto durante la hora
pico, con el fin de detectar cuellos de botella y evaluar mejoras operativas.

## Como usar
1. Presiona **setup** para construir la estacion (zonas de colores) y las cabinas.
2. Presiona **go** para correr la simulacion (1 tick = 1 segundo).
3. Activa la **vista 3D** con el boton "3D" de la esquina superior derecha de la
   vista para defender el modelo en un entorno tridimensional.
4. Ajusta los sliders para experimentar en vivo.

## Protocolo ODD (resumen)
- **Purpose:** estimar tiempos de espera y tamano de filas, y cuantificar el
  efecto de abrir mas cajas o aumentar el uso de tarjeta.
- **Entities:** patches (zonas de la estacion), pasajeros y cabinas.
- **State variables:** ver bloques `pasajeros-own` y `cabinas-own` del codigo.
- **Process overview:** generar-pasajeros -> gestionar-cajas -> mover-cabinas
  (embarque) -> mover-pasajeros -> tick.
- **Stochasticity:** llegadas ~ Poisson(tasa/60); atencion en caja ~
  Exponencial(media = tiempo-atencion-caja).

El protocolo ODD completo, las ecuaciones y la validacion estadistica estan en
la carpeta del proyecto (README.md, docs/ y analisis/).
@#$#@#$#@
default
true
0
Polygon -7500403 true true 150 5 40 250 150 205 260 250

box
false
0
Polygon -7500403 true true 150 285 285 225 285 75 150 135
Polygon -7500403 true true 150 135 15 75 150 15 285 75
Polygon -7500403 true true 15 75 15 225 150 285 150 135
Line -16777216 false 150 285 150 135
Line -16777216 false 150 135 15 75
Line -16777216 false 150 135 285 75

circle
false
0
Circle -7500403 true true 0 0 300

person
false
0
Circle -7500403 true true 110 5 80
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Rectangle -7500403 true true 127 79 172 94
Polygon -7500403 true true 195 90 240 150 225 180 165 105
Polygon -7500403 true true 105 90 60 150 75 180 135 105

square
false
0
Rectangle -7500403 true true 30 30 270 270
@#$#@#$#@
NetLogo 6.3.0
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
<experiments>
  <experiment name="1-Validacion-Baseline" repetitions="30" runMetricsEveryStep="false">
    <setup>setup</setup>
    <go>go</go>
    <timeLimit steps="3600"/>
    <metric>espera-promedio-total</metric>
    <metric>espera-promedio-caja</metric>
    <metric>espera-promedio-anden</metric>
    <metric>fila-caja</metric>
    <metric>fila-anden</metric>
    <metric>n-completados</metric>
    <enumeratedValueSet variable="tasa-llegada-usuarios">
      <value value="24"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="cantidad-cajas-abiertas">
      <value value="2"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="prob-tarjeta">
      <value value="55"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="6"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="velocidad-cabinas">
      <value value="0.5"/>
    </enumeratedValueSet>
  </experiment>
  <experiment name="2-Escenarios-Cajas" repetitions="30" runMetricsEveryStep="false">
    <setup>setup</setup>
    <go>go</go>
    <timeLimit steps="3600"/>
    <metric>espera-promedio-total</metric>
    <metric>espera-promedio-caja</metric>
    <metric>fila-caja</metric>
    <metric>n-completados</metric>
    <enumeratedValueSet variable="tasa-llegada-usuarios">
      <value value="24"/>
    </enumeratedValueSet>
    <steppedValueSet variable="cantidad-cajas-abiertas" first="1" step="1" last="4"/>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="prob-tarjeta">
      <value value="55"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="6"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="velocidad-cabinas">
      <value value="0.5"/>
    </enumeratedValueSet>
  </experiment>
  <experiment name="3-Escenario-Tarjeta" repetitions="30" runMetricsEveryStep="false">
    <setup>setup</setup>
    <go>go</go>
    <timeLimit steps="3600"/>
    <metric>espera-promedio-total</metric>
    <metric>espera-promedio-caja</metric>
    <metric>fila-caja</metric>
    <metric>n-completados</metric>
    <enumeratedValueSet variable="tasa-llegada-usuarios">
      <value value="24"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="cantidad-cajas-abiertas">
      <value value="2"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <steppedValueSet variable="prob-tarjeta" first="40" step="15" last="85"/>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="6"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="velocidad-cabinas">
      <value value="0.5"/>
    </enumeratedValueSet>
  </experiment>
</experiments>
@#$#@#$#@
@#$#@#$#@
default
0.0
-0.2 0 0.0 1.0
0.0 1 1.0 0.0
0.2 0 0.0 1.0
link direction
true
0
Line -7500403 true 150 150 90 180
Line -7500403 true 150 150 210 180

@#$#@#$#@
0
@#$#@#$#@
