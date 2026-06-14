"use client";

import { LAYOUT } from "../lib/simulation";

// Waypoints del circuito del cable (coherentes con lib/simulation.js)
const WP = [
  [14, 12],
  [14, 0],
  [14, -12],
  [22, -12],
  [22, 12],
];
const H = LAYOUT.cableHeight;

function Cable({ a, b }) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const ry = Math.atan2(-dz, dx);
  return (
    <mesh position={[mx, H, mz]} rotation={[0, ry, 0]} castShadow>
      <boxGeometry args={[len, 0.12, 0.12]} />
      <meshStandardMaterial color="#22272e" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

function Pylon({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, H, 12]} />
        <meshStandardMaterial color="#9b9ea3" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, H + 0.3, 0]} castShadow>
        <boxGeometry args={[3.2, 0.4, 0.4]} />
        <meshStandardMaterial color="#d23b3b" />
      </mesh>
    </group>
  );
}

function Booth({ x, z, color }) {
  return (
    <group position={[x, 0, z]}>
      {/* cuerpo del mostrador */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1.5, 2.4]} />
        <meshStandardMaterial color="#eef2f6" />
      </mesh>
      {/* techo de color (identifica la caja) */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[2.3, 0.25, 2.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* ventanilla */}
      <mesh position={[-1.02, 0.9, 0]}>
        <boxGeometry args={[0.06, 0.7, 1.6]} />
        <meshStandardMaterial color="#3a4a63" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  );
}

export default function Station() {
  const boothColors = ["#e85d5d", "#5db1e8", "#7bd17b", "#e8c95d"];

  return (
    <group>
      {/* mostradores de las 4 cajas */}
      {LAYOUT.cajaLanesZ.map((z, i) => (
        <Booth key={i} x={LAYOUT.cajaX} z={z} color={boothColors[i]} />
      ))}

      {/* plataforma de embarque (anden) */}
      <mesh position={[LAYOUT.andenFrontX + 1.5, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.5, 12]} />
        <meshStandardMaterial color="#b7bcc2" />
      </mesh>
      <mesh position={[LAYOUT.boarding.x - 0.5, 0.55, 0]}>
        <boxGeometry args={[1.4, 0.06, 11]} />
        <meshStandardMaterial color="#f29d3c" emissive="#7a4400" emissiveIntensity={0.3} />
      </mesh>

      {/* pilonas en las esquinas del circuito */}
      <Pylon x={14} z={12} />
      <Pylon x={14} z={-12} />
      <Pylon x={22} z={12} />
      <Pylon x={22} z={-12} />

      {/* cables aereos a lo largo del circuito */}
      {WP.map((a, i) => (
        <Cable key={i} a={a} b={WP[(i + 1) % WP.length]} />
      ))}
    </group>
  );
}
