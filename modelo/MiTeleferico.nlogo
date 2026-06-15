; =====================================================================
;  SIMULACION DE LA LINEA ROJA DE "MI TELEFERICO"  (La Paz - El Alto)
;  Modelado Basado en Agentes (ABM) - NetLogo 7.0.4
;  Materia: Modelado, Dinamica de Sistemas y Simulacion (SIS-216)
;  Universidad Catolica Boliviana
;
;  La Linea Roja une TRES estaciones reales:
;     0) Estacion Central (Taypi Uta)      - La Paz   (abajo)
;     1) Cementerio       (Ajayuni)        - intermedia
;     2) 16 de Julio      (Jach'a Qhathu)  - El Alto  (arriba)
;
;  Flujo realista de cada pasajero: llega a una estacion (ORIGEN), elige un
;  DESTINO, compra boleto (o usa tarjeta), espera en el anden correcto segun el
;  SENTIDO (subida o bajada), aborda una cabina con cupo, VIAJA por el cable y
;  SE BAJA en su estacion de destino, liberando el asiento. Las cabinas circulan
;  en un bucle cerrado de dos vias (subida arriba, bajada abajo).
;
;  Convencion temporal:  1 tick = 1 segundo simulado.
;  Convencion espacial:  mundo NO toroidal visto en planta.
;                          - eje X: posicion a lo largo de la linea (estaciones
;                            centradas en x = -22, 0, 22)
;                          - via de SUBIDA  arriba  (y ~ +10)
;                          - via de BAJADA  abajo   (y ~ -10)
; =====================================================================

breed [ pasajeros pasajero ]
breed [ cabinas   cabina   ]

globals [
  ;; --- Parametros estructurales (dato real fijo) ---
  capacidad-cabina        ;; maximo de personas por cabina (oficial = 10)

  ;; --- Servidores de las cajas / boleterias ---
  ;; lista plana de 12 posiciones (3 estaciones x 4 cajas): indice = estacion*4 + caja
  ;; valor = tick en que la caja queda libre (-1 = caja libre ahora)
  cajas-fin-servicio

  ;; --- Geometria de la ruta aerea (bucle cerrado de dos vias) ---
  ruta                    ;; lista de waypoints (parejas [x y]) del circuito cerrado
  ruta-largo              ;; longitud total del circuito (en patches)
  paradas                 ;; lista de [estacion sentido distancia] de cada parada

  ;; --- Acumuladores estadisticos (variables de SALIDA del modelo) ---
  n-completados           ;; pasajeros que viajaron y bajaron en su destino
  suma-espera-caja        ;; suma de tiempos de espera en caja (s)
  suma-espera-anden       ;; suma de tiempos de espera en anden (s)
  suma-viaje              ;; suma de tiempos de viaje a bordo (s)
  suma-espera-total       ;; suma de esperas (caja + anden) (s)
  suma-total-sistema      ;; suma de tiempos totales en el sistema (caja+anden+viaje)
]

pasajeros-own [
  estacion-origen         ;; estacion donde aparece (0,1,2)
  estacion-destino        ;; estacion a la que va (0,1,2); distinta del origen
  sentido                 ;; "subida" (destino > origen) o "bajada" (destino < origen)
  estado                  ;; "en-fila-caja" "en-caja" "en-fila-anden" "viajando" "saliendo"
  tiene-tarjeta?          ;; TRUE si ya tiene saldo: tapa en el torniquete y salta la caja
  tiempo-llegada          ;; tick de ingreso a la estacion
  tiempo-espera-caja      ;; segundos en fila + atencion de caja
  tiempo-espera-anden     ;; segundos esperando la cabina en el anden
  tiempo-viaje            ;; segundos a bordo de la cabina
  t-inicio-caja           ;; tick en que empezo a hacer fila en la caja
  t-inicio-anden          ;; tick en que llego al anden
  t-fin-caja              ;; tick en que termina de ser atendido en la caja
  t-board                 ;; tick en que aborda la cabina
  caja-asignada           ;; indice local (0..3) de la caja que lo atiende; -1 si ninguna
  cabina-asignada         ;; who de la cabina en la que viaja; -1 si no viaja
  tx                      ;; coordenada X objetivo (posicion ordenada en su fila)
  ty                      ;; coordenada Y objetivo (carril / anden)
]

cabinas-own [
  capacidad-actual        ;; pasajeros a bordo (0..capacidad-cabina)
  estado-cabina           ;; "en-ruta" o "en-estacion"
  dist-ruta               ;; distancia recorrida sobre el circuito (parametro de avance)
]

;; =====================================================================
;;  A.  INICIALIZACION
;; =====================================================================
to setup
  clear-all

  set capacidad-cabina   10
  set n-completados      0
  set suma-espera-caja   0
  set suma-espera-anden  0
  set suma-viaje         0
  set suma-espera-total  0
  set suma-total-sistema 0

  dibujar-linea
  inicializar-cajas
  inicializar-ruta-cabinas
  crear-cabinas-iniciales

  reset-ticks
end

;; Coordenada X del centro de la estacion s (0,1,2)
to-report centro-x [ s ]
  report item s (list -22 0 22)
end

;; Nombre de la estacion s
to-report nombre-est [ s ]
  report item s (list "CENTRAL" "CEMENTERIO" "16 DE JULIO")
end

;; Y del anden segun el sentido
to-report anden-y [ snt ]
  report ifelse-value (snt = "subida") [ 8 ] [ -8 ]
end

;; Y del carril de la caja k (0..3) dentro de una estacion
to-report caja-y [ k ]
  report item k (list 3 1 -1 -3)
end

;; Pinta la ladera, las dos vias del cable y las tres estaciones
to dibujar-linea
  ask patches [ set pcolor 62 ]                              ;; ladera (verde)
  ask patches with [ pycor >=  9 ] [ set pcolor gray - 2 ]  ;; via de SUBIDA (arriba)
  ask patches with [ pycor <= -9 ] [ set pcolor gray - 2 ]  ;; via de BAJADA (abajo)

  foreach (list 0 1 2) [ s ->
    let cx centro-x s
    ;; planta de la estacion (boleterias/ingreso)
    ask patches with [ abs (pxcor - cx) <= 7 and pycor > -9 and pycor < 9 ] [ set pcolor blue - 4 ]
    ;; anden de SUBIDA (sur->norte) arriba
    ask patches with [ abs (pxcor - cx) <= 6 and pycor >= 6 and pycor <= 8 ] [ set pcolor yellow - 1 ]
    ;; anden de BAJADA (norte->sur) abajo
    ask patches with [ abs (pxcor - cx) <= 6 and pycor <= -6 and pycor >= -8 ] [ set pcolor orange - 1 ]
    ;; mostradores de las 4 cajas
    ask patches with [ pxcor = cx and member? pycor [ 3 1 -1 -3 ] ] [ set pcolor white ]
    ;; punto de embarque (frente a cada via)
    ask patch cx  9 [ set pcolor red - 2 ]
    ask patch cx -9 [ set pcolor red - 2 ]
    ;; etiqueta de la estacion
    ask patch cx 12 [ set plabel nombre-est s ]
  ]
end

;; Las cajas se modelan como servidores; -1 indica "libre"
to inicializar-cajas
  set cajas-fin-servicio n-values 12 [ i -> -1 ]
end

;; Define el bucle cerrado de dos vias y la distancia de cada parada
to inicializar-ruta-cabinas
  ;; waypoints del circuito (subida arriba, retorno por bajada abajo)
  set ruta (list
    (list -22  10)   ;; 0  parada Central     SUBIDA
    (list   0  10)   ;; 1  parada Cementerio  SUBIDA
    (list  22  10)   ;; 2  parada 16 de Julio SUBIDA
    (list  28  10)   ;; 3  giro superior
    (list  28 -10)   ;; 4  giro superior
    (list  22 -10)   ;; 5  parada 16 de Julio BAJADA
    (list   0 -10)   ;; 6  parada Cementerio  BAJADA
    (list -22 -10)   ;; 7  parada Central     BAJADA
    (list -28 -10)   ;; 8  giro inferior
    (list -28  10) ) ;; 9  giro inferior

  ;; longitud total y distancia acumulada hasta cada waypoint
  let n length ruta
  set ruta-largo 0
  let acum (list)
  let dac 0
  let i 0
  while [ i < n ] [
    set acum lput dac acum
    let seg distancia-puntos (item i ruta) (item ((i + 1) mod n) ruta)
    set dac dac + seg
    set ruta-largo ruta-largo + seg
    set i i + 1
  ]

  ;; paradas: [estacion sentido distancia-sobre-el-circuito]
  set paradas (list
    (list 0 "subida" (item 0 acum))
    (list 1 "subida" (item 1 acum))
    (list 2 "subida" (item 2 acum))
    (list 2 "bajada" (item 5 acum))
    (list 1 "bajada" (item 6 acum))
    (list 0 "bajada" (item 7 acum)))
end

;; Crea las cabinas repartidas uniformemente sobre el circuito
to crear-cabinas-iniciales
  let k 0
  repeat numero-cabinas [
    create-cabinas 1 [
      set shape "box"
      set color red
      set size 2
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
  mover-cabinas        ;; avance + desembarque (destino) + embarque (origen)
  mover-pasajeros      ;; desplazamiento fluido hacia el objetivo
  tick                 ;; avanza 1 segundo simulado y refresca las graficas
end

;; =====================================================================
;;  C.  LOGICA DE COMPORTAMIENTO DE LOS AGENTES
;; =====================================================================

;; --- Generacion de demanda en toda la linea (proceso de Poisson) ---
to generar-pasajeros
  let media-por-tick (tasa-llegada-usuarios / 60)   ;; usuarios/min -> usuarios/seg
  let llegadas random-poisson media-por-tick
  repeat llegadas [
    if count pasajeros < 700 [
      crear-un-pasajero
    ]
  ]
end

to crear-un-pasajero
  ;; origen ponderado: los terminales concentran algo mas de demanda
  let r random-float 1
  let o ifelse-value (r < 0.38) [ 0 ] [ ifelse-value (r < 0.68) [ 1 ] [ 2 ] ]
  ;; destino: cualquiera de las otras dos estaciones
  let dst o
  while [ dst = o ] [ set dst random 3 ]

  create-pasajeros 1 [
    set shape "person"
    set size 1.3
    set color one-of (list white gray orange brown)
    set estacion-origen  o
    set estacion-destino dst
    set sentido (ifelse-value (dst > o) [ "subida" ] [ "bajada" ])
    set tiempo-llegada ticks
    set tiempo-espera-caja  0
    set tiempo-espera-anden 0
    set tiempo-viaje        0
    set caja-asignada   -1
    set cabina-asignada -1
    set tiene-tarjeta? (random-float 100 < prob-tarjeta)
    ;; aparece en la planta de su estacion de origen
    let cx centro-x o
    setxy (cx - 6 + random-float 2) (random-float 6 - 3)
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
end

;; --- Servicio en las cajas de cada estacion (colas multi-servidor M/M/c) ---
to gestionar-cajas
  ;; 1) Terminar las atenciones cuyo tiempo de servicio ya se cumplio
  ask pasajeros with [ estado = "en-caja" and ticks >= t-fin-caja ] [
    set tiempo-espera-caja (ticks - t-inicio-caja)
    set estado "en-fila-anden"
    set t-inicio-anden ticks
    set cajas-fin-servicio replace-item (estacion-origen * 4 + caja-asignada) cajas-fin-servicio -1
    set caja-asignada -1
  ]

  ;; 2) Para cada estacion, asignar cada caja libre al pasajero mas antiguo (FIFO)
  let s 0
  while [ s < 3 ] [
    let k 0
    while [ k < cantidad-cajas-abiertas ] [
      let idx s * 4 + k
      if (item idx cajas-fin-servicio) = -1 [
        let en-espera (pasajeros with [ estado = "en-fila-caja" and estacion-origen = s ])
        if any? en-espera [
          let cliente min-one-of en-espera [ t-inicio-caja ]
          ;; tiempo de atencion ~ Exponencial(media = tiempo-atencion-caja)
          let dur max (list 1 round (random-exponential tiempo-atencion-caja))
          ask cliente [
            set t-fin-caja ticks + dur
            set caja-asignada k
            set estado "en-caja"
          ]
          set cajas-fin-servicio replace-item idx cajas-fin-servicio (ticks + dur)
        ]
      ]
      set k k + 1
    ]
    set s s + 1
  ]
end

;; --- Movimiento de las cabinas + servicio en cada parada ---
to mover-cabinas
  ask cabinas [
    let parada parada-cercana dist-ruta
    let v velocidad-cabinas
    ifelse is-list? parada [
      set v v * 0.5                 ;; desacelera al entrar a la estacion (desembrague)
      set estado-cabina "en-estacion"
    ] [
      set estado-cabina "en-ruta"
    ]
    set dist-ruta dist-ruta + v
    let p punto-en-ruta dist-ruta
    setxy (item 0 p) (item 1 p)
    if is-list? parada [ servir-parada parada ]
  ]
end

;; Desembarca a quien llega a su destino y embarca a quien sale en este sentido
;; (contexto: cabina). parada = [estacion sentido distancia]
to servir-parada [ pr ]
  let s item 0 pr
  let d item 1 pr
  let me-who who

  ;; 1) BAJADA: pasajeros a bordo cuyo destino es esta estacion
  let bajan pasajeros with [ estado = "viajando" and cabina-asignada = me-who and estacion-destino = s ]
  let nb count bajan
  if nb > 0 [
    ask bajan [
      set tiempo-viaje (ticks - t-board)
      registrar-estadisticas
      set estado "saliendo"
      set cabina-asignada -1
      show-turtle
      ;; reaparece en el anden de esta estacion y camina hacia la salida (este)
      setxy ([ xcor ] of myself) (anden-y d)
      set tx (centro-x s) + 7
      set ty (anden-y d)
    ]
    set capacidad-actual capacidad-actual - nb
  ]

  ;; 2) SUBIDA: aborda quien espera en este sentido (disciplina FIFO por antiguedad)
  let cupo (capacidad-cabina - capacidad-actual)
  if cupo > 0 [
    let cola (pasajeros with [ estado = "en-fila-anden" and estacion-origen = s and sentido = d ])
    let suben min (list cupo (count cola))
    if suben > 0 [
      ask min-n-of suben cola [ t-inicio-anden ] [
        set tiempo-espera-anden (ticks - t-inicio-anden)
        set t-board ticks
        set estado "viajando"
        set cabina-asignada me-who
        move-to myself
        hide-turtle
      ]
      set capacidad-actual capacidad-actual + suben
    ]
  ]
end

;; Acumula los indicadores de un pasajero que llega a su destino (contexto: pasajero)
to registrar-estadisticas
  set suma-espera-caja   suma-espera-caja   + tiempo-espera-caja
  set suma-espera-anden  suma-espera-anden  + tiempo-espera-anden
  set suma-viaje         suma-viaje         + tiempo-viaje
  set suma-espera-total  suma-espera-total  + (tiempo-espera-caja + tiempo-espera-anden)
  set suma-total-sistema suma-total-sistema + (tiempo-espera-caja + tiempo-espera-anden + tiempo-viaje)
  set n-completados n-completados + 1
end

;; --- Asigna a cada pasajero su lugar ordenado en la fila correspondiente ---
to ordenar-colas
  foreach (list 0 1 2) [ s ->
    let cx centro-x s

    ;; Fila de las cajas: se reparte en tantos carriles como cajas abiertas (FIFO)
    let lista-caja sort-on [ t-inicio-caja ] (pasajeros with [ estado = "en-fila-caja" and estacion-origen = s ])
    let i 0
    foreach lista-caja [ p ->
      let carril (i mod cantidad-cajas-abiertas)
      let pos    (int (i / cantidad-cajas-abiertas))
      ask p [
        set tx (cx - 2 - pos * 1.1)
        set ty caja-y carril
      ]
      set i i + 1
    ]
    ;; Pasajeros siendo atendidos: se ubican justo en su caja
    ask pasajeros with [ estado = "en-caja" and estacion-origen = s ] [
      set tx cx
      set ty caja-y caja-asignada
    ]
    ;; Anden de SUBIDA y de BAJADA: se ordenan hacia su via (FIFO)
    ordenar-anden s "subida"
    ordenar-anden s "bajada"
  ]
end

;; Coloca en cuadricula a los que esperan en un anden (contexto: observer)
to ordenar-anden [ s snt ]
  let cx centro-x s
  let base (anden-y snt)
  let lista sort-on [ t-inicio-anden ] (pasajeros with [ estado = "en-fila-anden" and estacion-origen = s and sentido = snt ])
  let j 0
  foreach lista [ p ->
    ask p [
      set tx (cx - 3.5 + (j mod 8) * 1.0)
      ;; las filas se apilan alejandose de la via
      set ty (base - (int (j / 8)) * 1.0 * (ifelse-value (snt = "subida") [ 1 ] [ -1 ]))
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
      if estado = "saliendo" [ die ]   ;; llego a la salida: abandona el sistema
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

;; Distancia mas corta entre dos posiciones sobre el circuito cerrado
to-report dist-circular [ a b ]
  let dd (abs (a - b)) mod ruta-largo
  report min (list dd (ruta-largo - dd))
end

;; Devuelve la parada [estacion sentido dist] dentro de la zona de servicio, o false
to-report parada-cercana [ d ]
  let res false
  foreach paradas [ pr ->
    if res = false [
      if dist-circular d (item 2 pr) < 1.5 [ set res pr ]
    ]
  ]
  report res
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

to-report fila-caja-est [ s ]
  report count pasajeros with [ estado = "en-fila-caja" and estacion-origen = s ]
end

to-report fila-anden-est [ s ]
  report count pasajeros with [ estado = "en-fila-anden" and estacion-origen = s ]
end

;; personas dentro de la estacion s (en cualquier fila o en caja)
to-report cola-estacion [ s ]
  report count pasajeros with [ estacion-origen = s and
    (estado = "en-fila-caja" or estado = "en-caja" or estado = "en-fila-anden") ]
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

to-report viaje-promedio
  report ifelse-value (n-completados = 0) [ 0 ] [ suma-viaje / n-completados ]
end

;; tiempo total en el sistema (espera en caja + anden + viaje)
to-report tiempo-total-promedio
  report ifelse-value (n-completados = 0) [ 0 ] [ suma-total-sistema / n-completados ]
end

to-report pasajeros-en-transito
  report count pasajeros with [ estado = "viajando" ]
end

to-report pasajeros-en-estacion
  report count pasajeros with [ estado != "viajando" ]
end

to-report throughput-por-min
  report ifelse-value (ticks = 0) [ 0 ] [ n-completados / (ticks / 60) ]
end
@#$#@#$#@
GRAPHICS-WINDOW
235
10
792
315
-1
-1
9.0
1
10
1
1
1
0
1
1
1
-30
30
-16
16
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
225
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
225
88
tasa-llegada-usuarios
tasa-llegada-usuarios
0
120
70.0
1
1
usu/min
HORIZONTAL

SLIDER
10
90
225
123
cantidad-cajas-abiertas
cantidad-cajas-abiertas
1
4
2.0
1
1
cajas/estacion
HORIZONTAL

SLIDER
10
125
225
158
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
160
225
193
prob-tarjeta
prob-tarjeta
0
100
60.0
5
1
% con tarjeta
HORIZONTAL

SLIDER
10
195
225
228
numero-cabinas
numero-cabinas
3
24
18.0
1
1
cabinas
HORIZONTAL

SLIDER
10
230
225
263
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
270
117
319
Viajes completados
n-completados
0
1
12

MONITOR
118
270
225
319
Throughput (pas/min)
throughput-por-min
1
1
12

MONITOR
10
322
117
371
Espera total (s)
espera-promedio-total
1
1
12

MONITOR
118
322
225
371
Espera caja (s)
espera-promedio-caja
1
1
12

MONITOR
10
374
117
423
Espera anden (s)
espera-promedio-anden
1
1
12

MONITOR
118
374
225
423
Viaje prom. (s)
viaje-promedio
1
1
12

MONITOR
10
426
117
475
En transito
pasajeros-en-transito
0
1
12

MONITOR
118
426
225
475
En estacion
pasajeros-en-estacion
0
1
12

MONITOR
10
478
117
527
Fila caja (linea)
fila-caja
0
1
12

MONITOR
118
478
225
527
Fila anden (linea)
fila-anden
0
1
12

PLOT
235
320
792
472
Personas en cada estacion
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
"Central" 1.0 0 -13345367 true "" "plot cola-estacion 0"
"Cementerio" 1.0 0 -10899396 true "" "plot cola-estacion 1"
"16 de Julio" 1.0 0 -955883 true "" "plot cola-estacion 2"

PLOT
235
477
792
629
Tiempos promedio (s)
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
"Viaje" 1.0 0 -955883 true "" "plot viaje-promedio"

@#$#@#$#@
# Simulacion de la Linea Roja de "Mi Teleferico"

Modelo de **Modelado Basado en Agentes (ABM)** que reproduce el flujo de
pasajeros en la **Linea Roja** (La Paz - El Alto) durante la hora pico, con sus
**tres estaciones reales** (Estacion Central, Cementerio y 16 de Julio). Cada
pasajero llega a una estacion, elige un destino, paga (o usa tarjeta), espera en
el anden segun el sentido (subida/bajada), aborda una cabina, viaja por el cable
y baja en su estacion de destino.

## Como usar
1. Presiona **setup** para construir la linea (estaciones y cabinas).
2. Presiona **go** para correr la simulacion (1 tick = 1 segundo).
3. Activa la **vista 3D** con el boton "3D" de la esquina superior derecha de la
   vista para defender el modelo en un entorno tridimensional.
4. Ajusta los sliders para experimentar en vivo.

## Protocolo ODD (resumen)
- **Purpose:** estimar tiempos de espera, viaje y tamano de filas por estacion, y
  cuantificar el efecto de abrir mas cajas o aumentar el uso de tarjeta.
- **Entities:** patches (zonas y vias), pasajeros (con origen/destino) y cabinas.
- **State variables:** ver bloques `pasajeros-own` y `cabinas-own` del codigo.
- **Process overview:** generar-pasajeros -> gestionar-cajas -> ordenar-colas ->
  mover-cabinas (desembarque + embarque) -> mover-pasajeros -> tick.
- **Stochasticity:** llegadas ~ Poisson(tasa/60); atencion en caja ~
  Exponencial(media = tiempo-atencion-caja); origen y destino aleatorios.

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
NetLogo 7.0.4
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
    <metric>viaje-promedio</metric>
    <metric>fila-caja</metric>
    <metric>fila-anden</metric>
    <metric>n-completados</metric>
    <metric>throughput-por-min</metric>
    <enumeratedValueSet variable="tasa-llegada-usuarios">
      <value value="70"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="cantidad-cajas-abiertas">
      <value value="2"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="prob-tarjeta">
      <value value="60"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="18"/>
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
      <value value="70"/>
    </enumeratedValueSet>
    <steppedValueSet variable="cantidad-cajas-abiertas" first="1" step="1" last="4"/>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="prob-tarjeta">
      <value value="60"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="18"/>
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
      <value value="70"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="cantidad-cajas-abiertas">
      <value value="2"/>
    </enumeratedValueSet>
    <enumeratedValueSet variable="tiempo-atencion-caja">
      <value value="10"/>
    </enumeratedValueSet>
    <steppedValueSet variable="prob-tarjeta" first="40" step="15" last="85"/>
    <enumeratedValueSet variable="numero-cabinas">
      <value value="18"/>
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
