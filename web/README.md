# Mi Teleférico — Línea Roja 3D (simulación web)

Simulación **3D, interactiva y realista** de la **Línea Roja** de Mi Teleférico
(La Paz – El Alto), construida con **Next.js + React Three Fiber (Three.js)**.
Reproduce el flujo completo de un sistema de góndolas monocable con **tres
estaciones reales**, donde cada pasajero **elige su destino**, aborda, **viaja
por el cable y se baja en su estación**.

## Estaciones (nombres reales de la Línea Roja)

| # | Estación | Nombre aymara | Ubicación |
|---|---|---|---|
| 0 | **Estación Central** | Taypi Uta | La Paz (abajo) |
| 1 | **Cementerio** | Ajayuni | intermedia |
| 2 | **16 de Julio** | Jach'a Qhathu | El Alto (arriba) |

## Flujo realista modelado

1. El pasajero **llega** a una estación (origen) y **elige un destino** distinto.
2. Si no tiene tarjeta, hace fila y **compra boleto** en boletería; si la tiene,
   pasa directo.
3. Va al **andén correcto** según el sentido de su viaje (subida o bajada).
4. **Aborda** una cabina que va en su sentido y tiene cupo (máx. 10).
5. **Viaja** por el cable (las cabinas suben y bajan por las pilonas).
6. **Se baja** exactamente en su estación de destino — libera el asiento.
7. Camina a la salida y **abandona** el sistema.

Las cabinas circulan en un **bucle cerrado continuo** (dos vías: subida y
bajada, con giros en las terminales) y **desaceleran al entrar a cada estación**
para el embarque/desembarque, como el sistema real (desembrague).

## Tecnologías

| Capa | Tecnología | Rol |
|---|---|---|
| Framework | **Next.js 14** (App Router) | estructura y dev server |
| UI | **React 18** | HUD, controles y estadísticas |
| Render 3D | **Three.js** + **@react-three/fiber** | escena, cámara, luces, sombras |
| Helpers | **@react-three/drei** | `OrbitControls`, `Sky`, `Html` |
| Motor | JavaScript puro (`lib/simulation.js`) | simulación agnóstica a la vista |

Rendimiento: los **pasajeros** y los **edificios de la ciudad** se dibujan con
`InstancedMesh` (cientos/miles de objetos sin caída de FPS); el motor avanza una
sola vez por frame con `useFrame` y subdivide el paso para mantener estabilidad.

## Cómo ejecutar

Requisitos: **Node.js 18.18+**.

```bash
cd web
npm install
npm run dev      # abre http://localhost:3000
```

Producción: `npm run build && npm start`.

## Controles e indicadores

- **Controles** (izquierda): tasa de llegada de la red, cajas abiertas por
  estación, tiempo de atención, % con tarjeta, número y velocidad de cabinas, y
  velocidad de la simulación.
- **Indicadores en vivo** (derecha): filas por estación (caja / andén),
  pasajeros en cabinas y en estación, viajes completados, throughput y tiempos
  promedio de espera, viaje y total.

## Estructura

```
web/
├── app/                    # layout, página (carga el lienzo sin SSR), estilos
├── components/
│   ├── App3D.jsx           # estado, motor (ref), Canvas y HUD
│   ├── Scene.jsx           # luces, cielo, cámara, etiquetas y orquestación
│   ├── Terrain.jsx         # ladera La Paz–El Alto + ciudad (instanced)
│   ├── Stations.jsx        # 3 estaciones (andén, techo, boleterías, pilares)
│   ├── Cable.jsx           # cable (tubo del bucle) y pilonas
│   ├── Cabins.jsx          # góndolas 3D que recorren el cable
│   ├── Passengers.jsx      # agentes con InstancedMesh
│   └── HUD.jsx             # controles e indicadores
└── lib/
    └── simulation.js       # motor: Poisson, M/M/c, ruteo origen→destino, bucle
```

## Relación con el modelo académico (NetLogo)

El modelo **NetLogo** (`../modelo/MiTeleferico.nlogo`) es el artefacto académico
**validado estadísticamente** (una estación, teoría de colas, BehaviorSpace,
prueba t). Esta web es una **extensión de demostración** que lleva ese mismo
sistema a una **línea completa de 3 estaciones** con ruteo origen–destino, para
una defensa visualmente potente. Comparten los principios (llegadas Poisson,
colas M/M/c, embarque por capacidad), pero la web añade el viaje multi-estación.
