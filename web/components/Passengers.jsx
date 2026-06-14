"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const MAX = 600; // capacidad maxima de agentes renderizados

export default function Passengers({ engineRef }) {
  const bodyRef = useRef();
  const headRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const e = engineRef.current;
    if (!e || !bodyRef.current || !headRef.current) return;
    const ps = e.passengers;
    let n = 0;
    for (let i = 0; i < ps.length && n < MAX; i++) {
      const p = ps[i];
      if (p.state === "dead") continue;

      // cuerpo
      dummy.position.set(p.pos.x, p.pos.y + 0.7, p.pos.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bodyRef.current.setMatrixAt(n, dummy.matrix);
      bodyRef.current.setColorAt(n, color.set(p.color));

      // cabeza
      dummy.position.set(p.pos.x, p.pos.y + 1.5, p.pos.z);
      dummy.updateMatrix();
      headRef.current.setMatrixAt(n, dummy.matrix);

      n++;
    }
    bodyRef.current.count = n;
    headRef.current.count = n;
    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor)
      bodyRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, MAX]}
        castShadow
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.28, 0.7, 4, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, MAX]}
        castShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color="#f0c9a0" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
