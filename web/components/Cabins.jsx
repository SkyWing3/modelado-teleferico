"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

function Gondola() {
  return (
    <group>
      {/* pinza sobre el cable */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#2b2f36" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* brazo colgante */}
      <mesh position={[0, -0.7, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#444a52" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* cuerpo */}
      <mesh position={[0, -2.0, 0]} castShadow>
        <boxGeometry args={[2.4, 2.2, 2.4]} />
        <meshStandardMaterial color="#e23b3b" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* techo */}
      <mesh position={[0, -0.85, 0]} castShadow>
        <boxGeometry args={[2.7, 0.24, 2.7]} />
        <meshStandardMaterial color="#b51f1f" />
      </mesh>
      {/* franja de ventanas */}
      <mesh position={[0, -1.7, 0]}>
        <boxGeometry args={[2.46, 1.0, 2.46]} />
        <meshStandardMaterial
          color="#bfe6ff"
          transparent
          opacity={0.5}
          metalness={0.1}
          roughness={0.05}
        />
      </mesh>
      {/* piso */}
      <mesh position={[0, -3.05, 0]}>
        <boxGeometry args={[2.4, 0.18, 2.4]} />
        <meshStandardMaterial color="#7a1414" />
      </mesh>
    </group>
  );
}

export default function Cabins({ engineRef, numeroCabinas }) {
  const refs = useRef([]);

  useFrame(() => {
    const e = engineRef.current;
    if (!e) return;
    for (let i = 0; i < e.cabins.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const c = e.cabins[i];
      g.position.set(c.pos.x, c.pos.y, c.pos.z);
      g.rotation.y = c.yaw || 0;
    }
  });

  return (
    <group>
      {Array.from({ length: numeroCabinas }).map((_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <Gondola />
        </group>
      ))}
    </group>
  );
}
