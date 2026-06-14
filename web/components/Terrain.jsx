"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { terrainY } from "../lib/simulation";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ladera inclinada (valle de La Paz que sube hacia El Alto)
function Slope() {
  const geom = useMemo(() => {
    const x0 = -45,
      x1 = 240,
      z0 = -75,
      z1 = 75;
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array([
      x0, terrainY(x0), z0,
      x1, terrainY(x1), z0,
      x1, terrainY(x1), z1,
      x0, terrainY(x0), z1,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial color="#7d8a6a" roughness={1} />
    </mesh>
  );
}

// Ciudad: cientos de edificios de ladrillo a ambos lados de la linea
function Buildings() {
  const ref = useMemo(() => ({ current: null }), []);
  const data = useMemo(() => {
    const rnd = mulberry32(2024);
    const items = [];
    for (let i = 0; i < 220; i++) {
      const x = -30 + rnd() * 250;
      const side = rnd() > 0.5 ? 1 : -1;
      const z = side * (12 + rnd() * 58);
      const h = 2 + rnd() * 9;
      const w = 2 + rnd() * 3;
      const d = 2 + rnd() * 3;
      items.push({ x, y: terrainY(x) + h / 2, z, w, h, d, c: 0.45 + rnd() * 0.4 });
    }
    return items;
  }, []);

  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
    const im = new THREE.InstancedMesh(geo, mat, data.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    data.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      col.setRGB(b.c * 0.75 + 0.18, b.c * 0.5 + 0.12, b.c * 0.38 + 0.08); // tonos ladrillo
      im.setColorAt(i, col);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false; // las instancias se extienden por toda la ladera
    return im;
  }, [data]);

  return <primitive object={mesh} ref={ref} />;
}

export default function Terrain() {
  return (
    <group>
      <Slope />
      <Buildings />
    </group>
  );
}
