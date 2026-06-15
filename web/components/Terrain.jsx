"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { terrainY } from "../lib/simulation";

// ===========================================================================
//  Paisaje de la LINEA ROJA (La Paz -> El Alto), con sus hitos reales:
//   - Estacion Central: el teleferico se alza SOBRE una estacion de TREN.
//   - Cementerio: un CEMENTERIO (nichos, mausoleos, cipreses) junto a la estacion.
//   - 16 de Julio: EL ALTO, una meseta mucho mas alta, con su famosa FERIA.
//  Se anade dinamismo: un tren y trafico en movimiento.
// ===========================================================================

const X_MIN = -55;
const X_MAX = 305;
const Z_MAX = 120;
const SLOPE1 = 0.1684; // pendiente del valle de La Paz (x < 95)
const ANG1 = Math.atan(SLOPE1);

function noise2(x, z) {
  return (
    Math.sin(x * 0.08) * 1.0 +
    Math.sin(z * 0.07 - x * 0.03) * 1.1 +
    Math.sin(x * 0.21 + z * 0.13) * 0.45
  );
}

function groundHeight(x, z) {
  const base = terrainY(x);
  const d = Math.abs(z);
  // El Alto es el ALTIPLANO: terreno PLANO. El relieve lateral del valle de
  // La Paz se desvanece al subir la ceja, dejando la meseta totalmente llana.
  const valley = x <= 150 ? 1 : x >= 185 ? 0 : (185 - x) / 35;
  const lateral = d <= 6 ? 0 : 0.24 * (d - 6) * valley;
  const amp = Math.min(1, Math.max(0, (d - 5) / 30)) * valley;
  return base + lateral + noise2(x, z) * amp;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInstanced(geo, mat, items, { color = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(items.length, 1));
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    dummy.position.set(it.p[0], it.p[1], it.p[2]);
    dummy.scale.set(it.s[0], it.s[1], it.s[2]);
    dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    if (color) {
      col.set(it.c);
      im.setColorAt(i, col);
    }
  });
  im.count = items.length;
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  if (color && im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

// ----------------------------- texturas ------------------------------------
function makeTex(draw, repeat) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  draw(c.getContext("2d"));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

const facadeTex = () =>
  makeTex((g) => {
    g.fillStyle = "#e6e1d6";
    g.fillRect(0, 0, 128, 128);
    const cols = 4,
      rows = 5,
      m = 9,
      cw = (128 - m) / cols,
      ch = (128 - m) / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const s = Math.random() > 0.85 ? 165 : 72 + Math.floor(Math.random() * 16);
        g.fillStyle = `rgb(${s},${s + 8},${s + 20})`;
        g.fillRect(m + c * cw, m + r * ch, cw - m, ch - m);
        g.strokeStyle = "#b6b0a4";
        g.lineWidth = 2;
        g.strokeRect(m + c * cw, m + r * ch, cw - m, ch - m);
      }
  }, [1.3, 2.4]);

const glassTex = () =>
  makeTex((g) => {
    g.fillStyle = "#a8c2d4";
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 11) {
      g.fillStyle = "#7d99ac";
      g.fillRect(0, y, 128, 3);
    }
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(0, 0, 40, 128);
  }, [1.2, 4]);

const nicheTex = () =>
  makeTex((g) => {
    g.fillStyle = "#d8cfbd";
    g.fillRect(0, 0, 128, 128);
    const cols = 5,
      rows = 6,
      m = 4,
      cw = 128 / cols,
      ch = 128 / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        g.fillStyle = "#7d7062";
        g.fillRect(c * cw + m, r * ch + m, cw - 2 * m, ch - 2 * m);
        g.fillStyle = "#cdbf8f";
        g.fillRect(c * cw + m + 2, r * ch + m + 2, cw - 2 * m - 4, 3);
      }
  }, [3, 2]);

// ---------------------------------------------------------------------------
//  Suelo del valle
// ---------------------------------------------------------------------------
function Ground() {
  const geom = useMemo(() => {
    const nx = 150,
      nz = 100,
      pos = [],
      colArr = [],
      idx = [];
    const cLow = new THREE.Color("#84895f"),
      cHigh = new THREE.Color("#a8916a"),
      cTop = new THREE.Color("#988f80"),
      cDry = new THREE.Color("#b3a17a"), // altiplano seco (El Alto)
      tmp = new THREE.Color();
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = X_MIN + (i / nx) * (X_MAX - X_MIN);
        const z = -Z_MAX + (j / nz) * (2 * Z_MAX);
        const y = groundHeight(x, z);
        pos.push(x, y, z);
        const t = Math.min(1, (y - terrainY(x)) / 25);
        if (t < 0.5) tmp.copy(cLow).lerp(cHigh, t / 0.5);
        else tmp.copy(cHigh).lerp(cTop, (t - 0.5) / 0.5);
        if (x > 160) tmp.lerp(cDry, Math.min(1, (x - 160) / 45)); // meseta de El Alto
        colArr.push(tmp.r, tmp.g, tmp.b);
      }
    const w = nx + 1;
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * w + i;
        idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
//  Calles que siguen el relieve (cintas)
// ---------------------------------------------------------------------------
function ribbon(fn, steps, halfWidth, lift) {
  const pos = [],
    idx = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, z] = fn(t);
    const [xa, za] = fn(Math.min(1, t + 0.5 / steps));
    const [xb, zb] = fn(Math.max(0, t - 0.5 / steps));
    let dx = xa - xb,
      dz = za - zb;
    const L = Math.hypot(dx, dz) || 1;
    const px = -dz / L,
      pz = dx / L;
    const lx = x + px * halfWidth,
      lz = z + pz * halfWidth;
    const rx = x - px * halfWidth,
      rz = z - pz * halfWidth;
    pos.push(lx, groundHeight(lx, lz) + lift, lz);
    pos.push(rx, groundHeight(rx, rz) + lift, rz);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const AVE_Z = [10, 24, 38, 52];
const ROW_Z = [17, 31, 45];
const CROSS_X = [];
for (let x = -38; x <= 150; x += 18) CROSS_X.push(x);
const Z_BUILT = 56;
const CEM = { x0: 60, x1: 92, z0: 16, z1: 50 }; // recinto del cementerio
const inCem = (x, z) => x >= CEM.x0 - 4 && x <= CEM.x1 + 4 && z >= CEM.z0 - 4 && z <= CEM.z1 + 4;
// zona reservada para la estacion de tren (lado -z junto a la Central)
const inTrain = (x, z) => x > -46 && x < 34 && z < -8 && z > -24;

function Roads() {
  const { asphalt, sidewalk, lines } = useMemo(() => {
    const asphalt = [],
      sidewalk = [],
      lines = [];
    const lanes = [];
    AVE_Z.forEach((z) => {
      lanes.push(z);
      lanes.push(-z);
    });
    const laPazEnd = 165; // las avenidas de La Paz no cruzan a El Alto
    lanes.forEach((z) => {
      const fn = (t) => [X_MIN + t * (laPazEnd - X_MIN), z];
      sidewalk.push(ribbon(fn, 110, 3.6, 0.08));
      asphalt.push(ribbon(fn, 110, 2.7, 0.14));
      lines.push(ribbon(fn, 110, 0.12, 0.2));
    });
    CROSS_X.forEach((x) => {
      const fn = (t) => [x, -Z_BUILT + t * 2 * Z_BUILT];
      sidewalk.push(ribbon(fn, 70, 3.0, 0.07));
      asphalt.push(ribbon(fn, 70, 2.2, 0.13));
    });
    return { asphalt, sidewalk, lines };
  }, []);
  return (
    <group>
      {sidewalk.map((g, i) => (
        <mesh key={`s${i}`} geometry={g} receiveShadow>
          <meshStandardMaterial color="#bfc2c6" roughness={0.95} />
        </mesh>
      ))}
      {asphalt.map((g, i) => (
        <mesh key={`a${i}`} geometry={g} receiveShadow>
          <meshStandardMaterial color="#43464b" roughness={0.9} />
        </mesh>
      ))}
      {lines.map((g, i) => (
        <mesh key={`l${i}`} geometry={g}>
          <meshStandardMaterial color="#e8c24a" emissive="#5a4400" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Centro de La Paz (manzanas con fachadas) + fondo de laderas
// ---------------------------------------------------------------------------
const FACADE = ["#e3ddcf", "#d9cab0", "#cfd2cf", "#dcd3c0", "#c9c0ad", "#e0d6c2", "#cdb79a", "#d6cbb6", "#bcc4c7", "#e5dccb", "#c7b9a0", "#d2c4ad"];
const BRICK = ["#b06a45", "#a85a37", "#bd7048"];
const BACKDROP = ["#b3683f", "#a85a37", "#bd7048", "#c47a4f", "#cdb98f", "#9c5232"];

function LaPaz() {
  const facade = useMemo(facadeTex, []);
  const glass = useMemo(glassTex, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const data = useMemo(() => {
    const rnd = mulberry32(23);
    const plaster = [],
      brick = [],
      glassB = [],
      roofTops = [],
      backdrop = [];
    const rowZc = [];
    ROW_Z.forEach((z) => {
      rowZc.push(z);
      rowZc.push(-z);
    });
    const blockXc = [];
    for (let i = 0; i < CROSS_X.length - 1; i++) blockXc.push((CROSS_X[i] + CROSS_X[i + 1]) / 2);

    blockXc.forEach((xc) => {
      rowZc.forEach((zc) => {
        if (inCem(xc, zc) || inTrain(xc, zc)) return; // cementerio / estacion de tren
        const hub = xc < 110 && Math.abs(zc) < 40;
        for (let lot = -1; lot <= 1; lot += 2) {
          if (rnd() < 0.12) continue;
          const bx = xc + lot * 3.4 + (rnd() - 0.5) * 0.8;
          const bz = zc + (rnd() - 0.5) * 1.2;
          const gy = groundHeight(bx, bz);
          const w = 5.2 + rnd() * 1.4,
            d = 6.2 + rnd() * 1.6,
            jit = (rnd() - 0.5) * 0.12;
          if (hub && rnd() > 0.84) {
            const h = 20 + rnd() * 22;
            glassB.push({ p: [bx, gy + h / 2 - 0.3, bz], s: [w + 0.6, h, d + 0.6], ry: jit, c: "#cfe0ea" });
            continue;
          }
          const h = hub ? 9 + rnd() * 14 : 6 + rnd() * 8;
          const tgt = rnd() < 0.16 ? brick : plaster;
          tgt.push({ p: [bx, gy + h / 2 - 0.3, bz], s: [w, h, d], ry: jit, c: tgt === brick ? BRICK[(rnd() * BRICK.length) | 0] : FACADE[(rnd() * FACADE.length) | 0] });
          if (rnd() > 0.5) {
            const ts = 0.8 + rnd() * 1.2;
            roofTops.push({ p: [bx + (rnd() - 0.5) * (w - ts), gy + h - 0.3 + ts / 2, bz + (rnd() - 0.5) * (d - ts)], s: [ts, ts, ts], ry: jit, c: rnd() > 0.5 ? "#9aa0a6" : "#5a5f65" });
          }
        }
      });
    });

    for (let k = 0; k < 280; k++) {
      const x = X_MIN + 6 + rnd() * (150 - X_MIN);
      const side = rnd() > 0.5 ? 1 : -1;
      const z = side * (Z_BUILT + 6 + Math.pow(rnd(), 0.8) * (Z_MAX - Z_BUILT - 12));
      const gy = groundHeight(x, z);
      const w = 3 + rnd() * 2.5,
        h = 3 + rnd() * 3.5;
      backdrop.push({ p: [x, gy + h / 2 - 0.4, z], s: [w, h, 3 + rnd() * 2.5], ry: rnd() * Math.PI, c: BACKDROP[(rnd() * BACKDROP.length) | 0] });
    }
    return { plaster, brick, glassB, roofTops, backdrop };
  }, []);

  const plasterMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.9, map: facade || undefined }), data.plaster, { color: true }), [box, data, facade]);
  const brickMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.95, map: facade || undefined }), data.brick, { color: true }), [box, data, facade]);
  const glassMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.5, map: glass || undefined, color: "#cfe0ea" }), data.glassB, { color: true }), [box, data, glass]);
  const roofMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.8 }), data.roofTops, { color: true }), [box, data]);
  const backMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.97 }), data.backdrop, { color: true }), [box, data]);

  return (
    <group>
      <primitive object={plasterMesh} />
      <primitive object={brickMesh} />
      <primitive object={glassMesh} />
      <primitive object={roofMesh} />
      <primitive object={backMesh} />
    </group>
  );
}

// ---------------------------------------------------------------------------
//  EL ALTO: meseta alta (16 de Julio) con manzanas bajas, cholets y la feria
// ---------------------------------------------------------------------------
const ELALTO_COL = ["#b3683f", "#a85a37", "#bd7048", "#c47a4f", "#c43d6e", "#2f86b0", "#37a05a", "#d8a32a", "#7a3fa0", "#d8d2c4"];
const STALL_COL = ["#d23b3b", "#2f6fb0", "#3a8f54", "#e0b020", "#c43d8c", "#e07a20", "#7a3fa0"];

// El Alto: una ciudad VASTA y PLANA sobre el altiplano (terrainY=69), en
// cuadricula densa. Empieza en x=190 (borde de la meseta, donde esta la ceja).
const EA = { X0: 190, X1: 302, Z0: -110, Z1: 110, Y: 69, STEP: 6.5, BLOCK: 5 };
// la feria 16 de Julio ocupa unas manzanas junto a la estacion
const inFeria = (x, z) => x >= 192 && x <= 222 && Math.abs(z) >= 11 && Math.abs(z) <= 34;

function ElAlto() {
  const facade = useMemo(facadeTex, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const data = useMemo(() => {
    const rnd = mulberry32(57);
    const blds = [],
      roofTops = [],
      roads = [],
      booths = [],
      canopies = [];
    const { X0, X1, Z0, Z1, Y, STEP, BLOCK } = EA;
    const nxi = Math.round((X1 - X0) / STEP);
    const nzi = Math.round((Z1 - Z0) / STEP);

    // --- calles de la cuadricula (cada BLOCK celdas hay una calle) ---
    for (let i = 0; i <= nxi; i++)
      if (i % BLOCK === BLOCK - 1) {
        const x = X0 + i * STEP;
        roads.push({ p: [x, Y + 0.06, 0], s: [5, 0.12, Z1 - Z0] }); // calle longitudinal
      }
    for (let j = 0; j <= nzi; j++)
      if (j % BLOCK === BLOCK - 1) {
        const z = Z0 + j * STEP;
        roads.push({ p: [(X0 + X1) / 2, Y + 0.06, z], s: [X1 - X0, 0.12, 5] }); // calle transversal
      }

    // --- manzanas repletas de casas medianas (2-4 plantas) ---
    for (let i = 0; i <= nxi; i++)
      for (let j = 0; j <= nzi; j++) {
        if (i % BLOCK === BLOCK - 1 || j % BLOCK === BLOCK - 1) continue; // calle
        const x = X0 + i * STEP + (rnd() - 0.5) * 1.2;
        const z = Z0 + j * STEP + (rnd() - 0.5) * 1.2;
        if (Math.abs(z) < 9) continue; // corredor del teleferico
        if (inFeria(x, z)) continue; // ahi va la feria
        if (rnd() < 0.05) continue; // algun lote vacio
        const h = 4 + rnd() * 5; // ~4 a 9 m (sin edificios grandes)
        const w = 5.2 + rnd() * 1.2,
          d = 5.2 + rnd() * 1.2;
        const painted = rnd() > 0.78;
        blds.push({
          p: [x, Y + h / 2 - 0.3, z],
          s: [w, h, d],
          c: painted ? ELALTO_COL[(rnd() * ELALTO_COL.length) | 0] : rnd() > 0.35 ? BRICK[(rnd() * BRICK.length) | 0] : FACADE[(rnd() * FACADE.length) | 0],
        });
        if (rnd() > 0.6) {
          const ts = 0.7 + rnd() * 0.9;
          roofTops.push({ p: [x, Y + h - 0.3 + ts / 2, z], s: [ts, ts, ts], c: "#8a8f94" });
        }
      }

    // --- FERIA 16 de Julio: puestos reales (caseta + toldo), en hileras ---
    for (let side = -1; side <= 1; side += 2)
      for (let x = 194; x <= 220; x += 3.0)
        for (let r = 0; r < 7; r++) {
          const z = side * (13 + r * 3.0);
          if (rnd() < 0.12) continue;
          booths.push({ p: [x, Y + 0.75, z], s: [2.4, 1.5, 2.4], c: "#d8d2c4" }); // caseta
          canopies.push({ p: [x, Y + 1.7, z], s: [2.8, 0.16, 2.8], c: STALL_COL[(rnd() * STALL_COL.length) | 0] }); // toldo
        }

    return { blds, roofTops, roads, booths, canopies };
  }, []);

  const bldMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.93, map: facade || undefined }), data.blds, { color: true }), [box, data, facade]);
  const roofMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.8 }), data.roofTops, { color: true }), [box, data]);
  const roadMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ color: "#45474b", roughness: 0.95 }), data.roads), [box, data]);
  const boothMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.8 }), data.booths, { color: true }), [box, data]);
  const canopyMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.6 }), data.canopies, { color: true }), [box, data]);

  return (
    <group>
      <primitive object={roadMesh} />
      <primitive object={bldMesh} />
      <primitive object={roofMesh} />
      <primitive object={boothMesh} />
      <primitive object={canopyMesh} />
    </group>
  );
}

// ---------------------------------------------------------------------------
//  CEMENTERIO junto a la estacion Cementerio (nichos, mausoleos, cipreses)
// ---------------------------------------------------------------------------
function Cemetery() {
  const niche = useMemo(nicheTex, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const data = useMemo(() => {
    const rnd = mulberry32(91);
    const walls = [],
      mauso = [],
      crosses = [],
      cypress = [],
      cypTop = [];
    // muros de nichos en hileras (cada bloque sobre el terreno -> aterrazado)
    for (const z of [CEM.z0 + 6, CEM.z0 + 16, CEM.z0 + 26]) {
      for (let x = CEM.x0 + 3; x <= CEM.x1 - 3; x += 4.4) {
        const y = groundHeight(x, z);
        walls.push({ p: [x, y + 2.2, z], s: [4.2, 4.4, 1.4], c: "#d8cfbd" });
      }
    }
    // mausoleos y cruces dispersos
    for (let k = 0; k < 26; k++) {
      const x = CEM.x0 + 2 + rnd() * (CEM.x1 - CEM.x0 - 4);
      const z = CEM.z0 + 2 + rnd() * (CEM.z1 - CEM.z0 - 4);
      const y = groundHeight(x, z);
      const w = 1.4 + rnd() * 1.2;
      mauso.push({ p: [x, y + 1.0, z], s: [w, 2.0, w], c: rnd() > 0.5 ? "#eae6dc" : "#cfc7b5" });
      crosses.push({ p: [x, y + 2.4, z], s: [0.16, 0.9, 0.16], c: "#9a9388" });
    }
    // cipreses bordeando el recinto
    for (let x = CEM.x0; x <= CEM.x1; x += 5) {
      [CEM.z0 - 1, CEM.z1 + 1].forEach((z) => {
        const y = groundHeight(x, z);
        cypress.push({ p: [x, y + 1.0, z], s: [1, 1, 1] });
        cypTop.push({ p: [x, y + 3.6, z], s: [1, 1, 1] });
      });
    }
    return { walls, mauso, crosses, cypress, cypTop };
  }, []);

  const wallMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.95, map: niche || undefined, color: "#d8cfbd" }), data.walls, { color: true }), [box, data, niche]);
  const mausoMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 0.9 }), data.mauso, { color: true }), [box, data]);
  const crossMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ color: "#9a9388", roughness: 0.9 }), data.crosses), [box, data]);
  const cypMesh = useMemo(() => buildInstanced(new THREE.CylinderGeometry(0.18, 0.22, 2, 6), new THREE.MeshStandardMaterial({ color: "#5a4628", roughness: 1 }), data.cypress), [data]);
  const cypTopMesh = useMemo(() => buildInstanced(new THREE.ConeGeometry(0.9, 4, 7), new THREE.MeshStandardMaterial({ color: "#2f5a32", roughness: 1 }), data.cypTop), [data]);

  return (
    <group>
      <primitive object={wallMesh} />
      <primitive object={mausoMesh} />
      <primitive object={crossMesh} />
      <primitive object={cypMesh} />
      <primitive object={cypTopMesh} />
    </group>
  );
}

// ---------------------------------------------------------------------------
//  ESTACION DE TREN bajo la Estacion Central (vias, anden, edificio) + TREN
// ---------------------------------------------------------------------------
const TRACK_Z = [-3.2, -6.6]; // dos vias bajo la estructura del teleferico
const RAIL_X0 = -50;
const RAIL_X1 = 36;

function railRibbonY(x) {
  return terrainY(x) + 0.25;
}

function TrainStation() {
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const midX = (RAIL_X0 + RAIL_X1) / 2;
  const len = (RAIL_X1 - RAIL_X0) / Math.cos(ANG1);
  const midY = railRibbonY(midX);

  // durmientes (traviesas) instanciados a lo largo de cada via
  const ties = useMemo(() => {
    const arr = [];
    for (const z of TRACK_Z)
      for (let x = RAIL_X0; x <= RAIL_X1; x += 1.6) {
        arr.push({ p: [x, railRibbonY(x) - 0.05, z], s: [0.5, 0.12, 2.2], rz: ANG1, c: "#5a4632" });
      }
    return arr;
  }, []);
  const tieMesh = useMemo(() => buildInstanced(box, new THREE.MeshStandardMaterial({ roughness: 1 }), ties, { color: true }), [box, ties]);

  return (
    <group>
      {/* balasto + rieles por via */}
      {TRACK_Z.map((z, i) => (
        <group key={i}>
          <mesh position={[midX, midY - 0.12, z]} rotation={[0, 0, ANG1]} receiveShadow>
            <boxGeometry args={[len, 0.18, 2.6]} />
            <meshStandardMaterial color="#6b6258" roughness={1} />
          </mesh>
          {[-0.75, 0.75].map((dz) => (
            <mesh key={dz} position={[midX, midY + 0.05, z + dz]} rotation={[0, 0, ANG1]} castShadow>
              <boxGeometry args={[len, 0.12, 0.12]} />
              <meshStandardMaterial color="#3a3d42" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      <primitive object={tieMesh} />

      {/* anden entre las vias */}
      <mesh position={[midX, midY + 0.25, -4.9]} rotation={[0, 0, ANG1]} receiveShadow castShadow>
        <boxGeometry args={[len * 0.7, 0.5, 1.4]} />
        <meshStandardMaterial color="#c2bcb0" roughness={0.95} />
      </mesh>

      {/* edificio historico de la estacion (al costado del corredor) */}
      <group position={[10, railRibbonY(10), -15]} rotation={[0, 0, ANG1]}>
        <mesh position={[0, 4, 0]} castShadow receiveShadow>
          <boxGeometry args={[30, 8, 11]} />
          <meshStandardMaterial color="#e3d8c0" roughness={0.85} />
        </mesh>
        {/* techo a dos aguas */}
        <mesh position={[0, 8.7, 0]} rotation={[Math.PI / 4, 0, 0]} castShadow>
          <boxGeometry args={[30.4, 7.8, 0.5]} />
          <meshStandardMaterial color="#8a4a3a" roughness={0.8} />
        </mesh>
        {/* torre del reloj */}
        <mesh position={[-12, 9.5, 0]} castShadow>
          <boxGeometry args={[4, 11, 4]} />
          <meshStandardMaterial color="#d8ccae" roughness={0.85} />
        </mesh>
        <mesh position={[-12, 15.6, 0]} castShadow>
          <coneGeometry args={[3, 3, 4]} />
          <meshStandardMaterial color="#7a1f1f" roughness={0.7} />
        </mesh>
        <mesh position={[-12, 13.5, 2.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.2, 16]} />
          <meshStandardMaterial color="#f4f0e2" emissive="#222" />
        </mesh>
      </group>
    </group>
  );
}

function Train() {
  const wagons = [
    { c: "#c0392b", loco: true },
    { c: "#2f5fa0" },
    { c: "#2f7a4f" },
    { c: "#b8902a" },
  ];
  // tren estatico, siempre detenido en la Estacion Central
  const x0 = 0;
  return (
    <group position={[x0, railRibbonY(x0) + 0.95, TRACK_Z[0]]} rotation={[0, 0, ANG1]}>
      {wagons.map((w, i) => {
        const lx = (i - 1.5) * 6.6;
        return (
          <group key={i} position={[lx, 0, 0]}>
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[6, 2.4, 2.6]} />
              <meshStandardMaterial color={w.c} metalness={0.4} roughness={0.5} />
            </mesh>
            {/* franja de ventanas */}
            <mesh position={[0, 0.5, 1.32]}>
              <boxGeometry args={[5, 0.9, 0.05]} />
              <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.5, -1.32]}>
              <boxGeometry args={[5, 0.9, 0.05]} />
              <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.2} />
            </mesh>
            {w.loco && (
              <mesh castShadow position={[0, 1.5, 0]}>
                <boxGeometry args={[2.4, 0.9, 2]} />
                <meshStandardMaterial color={w.c} roughness={0.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Arboles y farolas a lo largo de las avenidas (La Paz)
// ---------------------------------------------------------------------------
function StreetFurniture() {
  const data = useMemo(() => {
    const rnd = mulberry32(200);
    const trees = [],
      foliage = [],
      poles = [],
      heads = [];
    const lanes = [];
    AVE_Z.forEach((z) => {
      lanes.push(z + 3.4);
      lanes.push(-(z + 3.4));
    });
    for (let x = X_MIN + 6; x <= 150; x += 6)
      lanes.forEach((z) => {
        if (inCem(x, z) || inTrain(x, z)) return;
        if (rnd() > 0.5) {
          const ts = 0.7 + rnd() * 0.4;
          trees.push({ p: [x, groundHeight(x, z) + 0.9 * ts, z], s: [ts, ts, ts] });
          foliage.push({ p: [x, groundHeight(x, z) + 2.3 * ts, z], s: [ts, ts, ts] });
        } else {
          poles.push({ p: [x, groundHeight(x, z) + 2, z], s: [1, 1, 1] });
          heads.push({ p: [x, groundHeight(x, z) + 4, z], s: [1, 1, 1] });
        }
      });
    return { trees, foliage, poles, heads };
  }, []);

  const trunk = useMemo(() => buildInstanced(new THREE.CylinderGeometry(0.14, 0.2, 1.8, 6), new THREE.MeshStandardMaterial({ color: "#6b4a2b", roughness: 1 }), data.trees), [data]);
  const fol = useMemo(() => buildInstanced(new THREE.SphereGeometry(1.1, 7, 6), new THREE.MeshStandardMaterial({ color: "#4d7a3e", roughness: 1 }), data.foliage), [data]);
  const pole = useMemo(() => buildInstanced(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), new THREE.MeshStandardMaterial({ color: "#4a4f57", metalness: 0.4, roughness: 0.6 }), data.poles), [data]);
  const head = useMemo(() => buildInstanced(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: "#fff4cf", emissive: "#ffdf8a", emissiveIntensity: 0.7 }), data.heads), [data]);

  return (
    <group>
      <primitive object={trunk} />
      <primitive object={fol} />
      <primitive object={pole} />
      <primitive object={head} />
    </group>
  );
}

export default function Terrain() {
  return (
    <group>
      <Ground />
      <Roads />
      <LaPaz />
      <ElAlto />
      <Cemetery />
      <TrainStation />
      <Train />
      <StreetFurniture />
    </group>
  );
}
