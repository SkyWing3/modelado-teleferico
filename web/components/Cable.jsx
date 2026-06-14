"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { LOOP, terrainY, ZT } from "../lib/simulation";

export default function Cable() {
  const tube = useMemo(() => {
    const pts = LOOP.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.1);
    return new THREE.TubeGeometry(curve, 700, 0.16, 6, true);
  }, []);

  // pilonas: una por cada posicion X de torre (sostienen ambas vias)
  const towers = useMemo(() => {
    const byX = new Map();
    LOOP.towers.forEach((t) => {
      const key = Math.round(t.x);
      if (!byX.has(key)) byX.set(key, t.y);
      else byX.set(key, Math.max(byX.get(key), t.y));
    });
    return Array.from(byX.entries()).map(([x, y]) => ({ x, y }));
  }, []);

  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color="#23272e" metalness={0.7} roughness={0.4} />
      </mesh>

      {towers.map((t, i) => {
        const baseY = terrainY(t.x) - 1;
        const h = t.y - baseY;
        return (
          <group key={i} position={[t.x, 0, 0]}>
            <mesh position={[0, baseY + h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.8, h, 12]} />
              <meshStandardMaterial color="#d23b3b" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[0, t.y + 0.4, 0]} castShadow>
              <boxGeometry args={[1.2, 0.5, 2 * ZT + 2.4]} />
              <meshStandardMaterial color="#9a9ea3" metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
