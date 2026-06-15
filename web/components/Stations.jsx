"use client";

import { Text } from "@react-three/drei";
import { STATIONS, FLOW, terrainY } from "../lib/simulation";

// Flecha de flujo (chevron) sobre el piso, apuntando a una direccion
function Arrow({ x, y, z, dir = "x", color = "#39d98a" }) {
  const rot =
    dir === "x"
      ? [0, 0, -Math.PI / 2]
      : dir === "z"
      ? [Math.PI / 2, 0, 0]
      : dir === "-z"
      ? [-Math.PI / 2, 0, 0]
      : [0, 0, Math.PI / 2];
  return (
    <mesh position={[x, y, z]} rotation={rot}>
      <coneGeometry args={[0.55, 1.1, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  );
}

// Cartel 3D fisico dentro de la estacion: poste + panel de color + texto.
// rotY orienta la cara legible del panel (0 mira a +z, PI a -z, etc.).
function Sign({ x, y, z, text, sub, bg, rotY = 0, w = 3.2 }) {
  const panelH = sub ? 1.0 : 0.7;
  const poleH = 2.0;
  const panelY = poleH + panelH / 2;
  return (
    <group position={[x, y, z]}>
      {/* poste (simetrico, no necesita rotacion) */}
      <mesh position={[0, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, poleH, 8]} />
        <meshStandardMaterial color="#566072" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* panel orientable + texto */}
      <group rotation={[0, rotY, 0]}>
        <mesh position={[0, panelY, 0]} castShadow>
          <boxGeometry args={[w, panelH, 0.1]} />
          <meshStandardMaterial color={bg} emissive={bg} emissiveIntensity={0.25} />
        </mesh>
        {/* marco blanco delgado */}
        <mesh position={[0, panelY, -0.02]}>
          <boxGeometry args={[w + 0.14, panelH + 0.14, 0.08]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Text
          position={[0, panelY + (sub ? 0.18 : 0), 0.07]}
          fontSize={0.42}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.012}
          outlineColor="#000000"
        >
          {text}
        </Text>
        {sub && (
          <Text
            position={[0, panelY - 0.26, 0.07]}
            fontSize={0.24}
            color="#f3f3f3"
            anchorX="center"
            anchorY="middle"
          >
            {sub}
          </Text>
        )}
      </group>
    </group>
  );
}

function Booth({ x, y, z, color }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.4, 1.2]} />
        <meshStandardMaterial color="#eef2f6" />
      </mesh>
      <mesh position={[0, 1.48, 0]} castShadow>
        <boxGeometry args={[1.8, 0.2, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.78, 0.8, 0]}>
        <boxGeometry args={[0.05, 0.55, 0.8]} />
        <meshStandardMaterial color="#33445e" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Losa/decal delgado sobre el piso (zonas de color)
function Decal({ x, y, z, w, d, color, opacity = 1, emissive }) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={emissive || "#000000"}
        emissiveIntensity={emissive ? 0.25 : 0}
      />
    </mesh>
  );
}

function StationStruct({ index }) {
  const [bx, by] = STATIONS[index].base;
  const deckY = by - 0.25;
  const topDeck = by + 0.03;

  return (
    <group>
      {/* pilares de soporte cortos hasta el terreno */}
      {[
        [-12, -6],
        [12, -6],
        [-12, 6],
        [12, 6],
      ].map(([dx, dz], i) => {
        const baseY = terrainY(bx + dx) - 1;
        const h = deckY - baseY;
        return (
          <mesh key={i} position={[bx + dx, baseY + h / 2, dz]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, Math.max(h, 0.5), 10]} />
            <meshStandardMaterial color="#9a9ea3" roughness={0.7} />
          </mesh>
        );
      })}

      {/* losa principal del anden */}
      <mesh position={[bx, deckY, 0]} receiveShadow castShadow>
        <boxGeometry args={[28, 0.5, 15]} />
        <meshStandardMaterial color="#cfd3d8" roughness={0.92} />
      </mesh>

      {/* zonas de piso: entrada (verde), salida (azul), andenes */}
      <Decal x={bx + FLOW.entranceX} y={topDeck} z={0} w={4} d={7} color="#2f8f43" />
      <Decal x={bx + FLOW.exitX} y={topDeck} z={0} w={4} d={7} color="#2f6fb0" />
      <Decal x={bx} y={topDeck} z={FLOW.platUpZ} w={22} d={3} color="#e8c95d" opacity={0.85} />
      <Decal x={bx} y={topDeck} z={FLOW.platDownZ} w={22} d={3} color="#e8945d" opacity={0.85} />

      {/* lineas de seguridad junto a las vias */}
      {[-3.5, 3.5].map((z) => (
        <mesh key={z} position={[bx, topDeck + 0.02, z]}>
          <boxGeometry args={[24, 0.04, 0.5]} />
          <meshStandardMaterial color="#f0a93c" emissive="#5a3a00" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* flechas de flujo: entrada -> cajas -> andenes -> salida */}
      <Arrow x={bx - 10} y={topDeck + 0.1} z={0} dir="x" color="#39d98a" />
      <Arrow x={bx - 1.5} y={topDeck + 0.1} z={-2.6} dir="-z" color="#e8c95d" />
      <Arrow x={bx - 1.5} y={topDeck + 0.1} z={2.6} dir="z" color="#e8945d" />
      <Arrow x={bx + 8} y={topDeck + 0.1} z={-3.0} dir="x" color="#5db1e8" />
      <Arrow x={bx + 8} y={topDeck + 0.1} z={3.0} dir="x" color="#5db1e8" />

      {/* boleterias */}
      {FLOW.boothZ.map((z, i) => (
        <Booth
          key={i}
          x={bx + FLOW.cajaBoothX}
          y={by}
          z={z}
          color={["#e85d5d", "#5db1e8", "#7bd17b", "#e8c95d"][i]}
        />
      ))}

      {/* columnas + techo */}
      {[
        [-12, -7],
        [12, -7],
        [-12, 7],
        [12, 7],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[bx + dx, by + 4, dz]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 8, 8]} />
          <meshStandardMaterial color="#b9bdc2" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* techo translucido y elevado: no tapa la vista del anden */}
      <mesh position={[bx, by + 8, 0]} castShadow={false}>
        <boxGeometry args={[29, 0.4, 17]} />
        <meshStandardMaterial color="#d23b3b" roughness={0.6} transparent opacity={0.4} />
      </mesh>
      <mesh position={[bx, by + 8.3, 0]} castShadow={false}>
        <boxGeometry args={[29.3, 0.18, 17.3]} />
        <meshStandardMaterial color="#7a1414" transparent opacity={0.5} />
      </mesh>

      {/* carteles 3D de circulacion (poste + panel dentro de la estacion) */}
      <Sign x={bx + FLOW.entranceX} y={topDeck} z={0} text="ENTRADA" bg="#2f8f43" rotY={Math.PI / 2} w={2.8} />
      <Sign x={bx + FLOW.exitX} y={topDeck} z={0} text="SALIDA" bg="#2f6fb0" rotY={-Math.PI / 2} w={2.4} />
      <Sign
        x={bx}
        y={topDeck}
        z={FLOW.platUpZ - 2.2}
        text="SUBIDA"
        sub="hacia El Alto"
        bg="#b48c14"
        rotY={0}
        w={2.6}
      />
      <Sign
        x={bx}
        y={topDeck}
        z={FLOW.platDownZ + 2.2}
        text="BAJADA"
        sub="hacia La Paz"
        bg="#b45a28"
        rotY={Math.PI}
        w={2.6}
      />
    </group>
  );
}

export default function Stations() {
  return (
    <group>
      {STATIONS.map((_, i) => (
        <StationStruct key={i} index={i} />
      ))}
    </group>
  );
}
