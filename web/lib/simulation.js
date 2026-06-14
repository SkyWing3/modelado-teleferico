// =====================================================================
//  Motor de simulacion de la LINEA ROJA de "Mi Teleferico" (La Paz - El Alto)
//  Sistema de gondolas monocable desmontable (MDG) con 3 estaciones reales:
//    0) Estacion Central (Taypi Uta)  - La Paz   (abajo)
//    1) Cementerio       (Ajayuni)    - intermedia
//    2) 16 de Julio      (Jach'a Qhathu) - El Alto (arriba)
//
//  Flujo realista: el pasajero llega a una estacion, compra boleto (o usa
//  tarjeta), elige un DESTINO, espera en el anden correcto (sentido subida o
//  bajada), aborda una cabina, VIAJA por el cable y SE BAJA en su estacion,
//  liberando el asiento. Las cabinas circulan en un bucle continuo cerrado.
// =====================================================================

export const STATIONS = [
  { name: "Estación Central", nick: "Taypi Uta", base: [0, 0, 0] },
  { name: "Cementerio", nick: "Ajayuni", base: [95, 16, 0] },
  { name: "16 de Julio", nick: "Jach'a Qhathu", base: [190, 32, 0] },
];

// Puntos clave del flujo dentro de una estacion (relativos a la base)
export const FLOW = {
  entranceX: -13, // ENTRADA (oeste): aqui aparecen los usuarios
  exitX: 13, // SALIDA (este): por aqui se retiran los que llegan
  cajaFrontX: -7,
  cajaBoothX: -4,
  boothZ: [-2.4, -0.8, 0.8, 2.4],
  platUpZ: -5.0, // anden de SUBIDA (sur)
  platDownZ: 5.0, // anden de BAJADA (norte)
};

const PY = 3.0; // altura del cable/cabina sobre la base de la estacion (anden)
const ZT = 3.5; // separacion de las dos vias (subida z<0, bajada z>0)
const TOWER = 14; // altura extra del cable en las pilonas entre estaciones
const ZONE = 6.0; // ventana de arco (m) para considerar a la cabina "en estacion"
const CAP = 10; // capacidad de la cabina
const WALK = 4.2; // velocidad a pie (m/s)
const PALETTE = ["#e85d5d", "#5db1e8", "#7bd17b", "#e8c95d", "#c98ce0", "#e8945d", "#6ee0c0"];

let _nextId = 1;

function expo(mean) {
  return -mean * Math.log(1 - Math.random());
}
function dist2(ax, az, bx, bz) {
  const dx = ax - bx,
    dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
function dist3(a, b) {
  const dx = a.x - b.x,
    dy = a.y - b.y,
    dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function circDist(a, b, L) {
  let d = Math.abs(a - b) % L;
  return Math.min(d, L - d);
}

// Altura del terreno (ladera La Paz -> El Alto) en funcion de x
export function terrainY(x) {
  return -1 + 0.168 * x;
}

// --- Construccion del bucle cerrado del cable (geometria estatica) ---
function buildLoop() {
  const P = [];
  const add = (x, y, z, meta) => P.push({ x, y, z, ...(meta || {}) });
  const S = STATIONS.map((s) => s.base);
  const yU = (by) => by + PY;
  const mid = (a, b) => (a + b) / 2;

  // Via de SUBIDA (z = -ZT)
  add(S[0][0], yU(S[0][1]), -ZT, { stop: { station: 0, dir: "up" } });
  add(mid(S[0][0], S[1][0]), Math.max(S[0][1], S[1][1]) + TOWER, -ZT, { tower: true });
  add(S[1][0], yU(S[1][1]), -ZT, { stop: { station: 1, dir: "up" } });
  add(mid(S[1][0], S[2][0]), Math.max(S[1][1], S[2][1]) + TOWER, -ZT, { tower: true });
  add(S[2][0], yU(S[2][1]), -ZT, { stop: { station: 2, dir: "up" } });
  // Giro superior (16 de Julio)
  add(S[2][0] + 12, yU(S[2][1]), -ZT);
  add(S[2][0] + 17, yU(S[2][1]), 0);
  add(S[2][0] + 12, yU(S[2][1]), ZT);
  // Via de BAJADA (z = +ZT)
  add(S[2][0], yU(S[2][1]), ZT, { stop: { station: 2, dir: "down" } });
  add(mid(S[1][0], S[2][0]), Math.max(S[1][1], S[2][1]) + TOWER, ZT, { tower: true });
  add(S[1][0], yU(S[1][1]), ZT, { stop: { station: 1, dir: "down" } });
  add(mid(S[0][0], S[1][0]), Math.max(S[0][1], S[1][1]) + TOWER, ZT, { tower: true });
  add(S[0][0], yU(S[0][1]), ZT, { stop: { station: 0, dir: "down" } });
  // Giro inferior (Estacion Central)
  add(S[0][0] - 12, yU(S[0][1]), ZT);
  add(S[0][0] - 17, yU(S[0][1]), 0);
  add(S[0][0] - 12, yU(S[0][1]), -ZT);

  let length = 0;
  const cum = [0];
  for (let i = 0; i < P.length; i++) {
    length += dist3(P[i], P[(i + 1) % P.length]);
    cum.push(length);
  }
  const stops = [];
  P.forEach((p, i) => p.stop && stops.push({ ...p.stop, d: cum[i] }));
  const towers = P.filter((p) => p.tower).map((p) => ({ x: p.x, y: p.y, z: p.z }));
  return { points: P, cum, length, stops, towers };
}

export const LOOP = buildLoop();

export function pointOnLoop(d) {
  const L = LOOP.length;
  let dd = ((d % L) + L) % L;
  const { points: P, cum } = LOOP;
  for (let i = 0; i < P.length; i++) {
    const segLen = cum[i + 1] - cum[i];
    if (dd <= segLen) {
      const a = P[i],
        b = P[(i + 1) % P.length];
      const f = segLen ? dd / segLen : 0;
      return {
        x: a.x + f * (b.x - a.x),
        y: a.y + f * (b.y - a.y),
        z: a.z + f * (b.z - a.z),
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    dd -= segLen;
  }
  const a = P[0];
  return { x: a.x, y: a.y, z: a.z, yaw: 0 };
}

export class Simulation {
  constructor(params) {
    this.params = {
      tasaLlegada: 70, // usuarios/min en toda la linea
      cajasAbiertas: 2, // por estacion (1..4)
      tiempoAtencion: 10, // s
      probTarjeta: 60, // %
      numeroCabinas: 18,
      velocidadCabinas: 8, // m/s
      ...params,
    };
    this.reset();
  }

  reset() {
    this.t = 0;
    this.passengers = [];
    this._byId = new Map();
    this.stations = STATIONS.map(() => ({
      cajaQueue: [],
      platUp: [],
      platDown: [],
      cajas: Array.from({ length: 4 }, () => ({ busy: false, until: 0, curId: null })),
    }));
    this.nCompletados = 0;
    this.sumEsperaCaja = 0;
    this.sumEsperaAnden = 0;
    this.sumViaje = 0;
    this.sumTotal = 0;
    this.arrivalTimer = 0;
    this._needCleanup = false;
    this._buildCabins(this.params.numeroCabinas, false);
  }

  setParams(p) {
    const prev = this.params;
    this.params = { ...prev, ...p };
    if (p.numeroCabinas != null && p.numeroCabinas !== prev.numeroCabinas) {
      this._buildCabins(this.params.numeroCabinas, true);
    }
  }

  _buildCabins(n, killRiders) {
    if (killRiders && this.passengers) {
      for (const p of this.passengers) if (p.state === "boarded") p.state = "dead";
    }
    this.cabins = [];
    for (let i = 0; i < n; i++) {
      const d = (i * LOOP.length) / n;
      const pt = pointOnLoop(d);
      this.cabins.push({ d, pos: { x: pt.x, y: pt.y, z: pt.z }, yaw: pt.yaw, pax: [] });
    }
  }

  _weightedOrigin() {
    // Demanda repartida entre las TRES estaciones (los terminales algo mas).
    const r = Math.random();
    return r < 0.38 ? 0 : r < 0.68 ? 1 : 2; // Central 38% | Cementerio 30% | 16 de Julio 32%
  }

  _spawn() {
    if (this.passengers.length > 700) return;
    const origin = this._weightedOrigin();
    let dest = origin;
    while (dest === origin) dest = Math.floor(Math.random() * 3);
    const dir = dest > origin ? "up" : "down";
    const b = STATIONS[origin].base;
    const id = _nextId++;
    const p = {
      id,
      origin,
      dest,
      dir,
      hasCard: Math.random() * 100 < this.params.probTarjeta,
      state: "fila-caja",
      pos: { x: b[0] + FLOW.entranceX + Math.random() * 1.6, y: b[1], z: -1.5 + Math.random() * 3 },
      target: { x: b[0] + FLOW.entranceX, y: b[1], z: 0 },
      color: PALETTE[id % PALETTE.length],
      tLlegada: this.t,
      tInicioCaja: this.t,
      tInicioAnden: 0,
      tBoard: 0,
      tEsperaCaja: 0,
      tEsperaAnden: 0,
      cajaAsignada: -1,
      cabinRef: null,
      seat: 0,
    };
    p.target = { ...p.pos };
    this.passengers.push(p);
    this._byId.set(id, p);
    const st = this.stations[origin];
    if (p.hasCard) {
      p.state = "fila-anden";
      p.tInicioAnden = this.t;
      (dir === "up" ? st.platUp : st.platDown).push(id);
    } else {
      st.cajaQueue.push(id);
    }
  }

  update(dt) {
    let rem = dt;
    while (rem > 0) {
      const step = Math.min(rem, 0.1);
      this._step(step);
      rem -= step;
    }
  }

  _step(dt) {
    this.t += dt;
    const P = this.params;

    // 1) Llegadas (Poisson)
    if (P.tasaLlegada > 0) {
      this.arrivalTimer -= dt;
      let guard = 0;
      while (this.arrivalTimer <= 0 && guard < 80) {
        this._spawn();
        this.arrivalTimer += expo(60 / P.tasaLlegada);
        guard++;
      }
    }

    // 2) Cajas por estacion
    for (let i = 0; i < 3; i++) this._gestionarCajas(i);

    // 3) Cabinas: mover + servir estaciones (bajar y subir pasajeros)
    for (const c of this.cabins) {
      let v = P.velocidadCabinas;
      let active = null;
      for (const s of LOOP.stops) {
        if (circDist(c.d, s.d, LOOP.length) < ZONE) {
          active = s;
          break;
        }
      }
      if (active) v *= 0.4; // desacelera en estacion (desembrague)
      c.d += v * dt;
      const pt = pointOnLoop(c.d);
      c.pos.x = pt.x;
      c.pos.y = pt.y;
      c.pos.z = pt.z;
      c.yaw = pt.yaw;
      if (active) this._service(c, active);
    }

    // 4) Posiciones ordenadas y movimiento
    this._ordenarColas();
    this._mover(dt);

    // 5) Limpieza
    if (this._needCleanup) {
      this.passengers = this.passengers.filter((p) => {
        if (p.state === "dead") {
          this._byId.delete(p.id);
          return false;
        }
        return true;
      });
      this._needCleanup = false;
    }
  }

  _gestionarCajas(i) {
    const st = this.stations[i];
    const b = STATIONS[i].base;
    // terminar atenciones
    for (let k = 0; k < 4; k++) {
      const c = st.cajas[k];
      if (c.busy && this.t >= c.until) {
        const p = this._byId.get(c.curId);
        if (p) {
          p.tEsperaCaja = this.t - p.tInicioCaja;
          p.state = "fila-anden";
          p.tInicioAnden = this.t;
          (p.dir === "up" ? st.platUp : st.platDown).push(p.id);
        }
        c.busy = false;
        c.curId = null;
      }
    }
    // asignar cajas libres al frente de la fila
    const frontX = b[0] + FLOW.cajaFrontX;
    for (let k = 0; k < this.params.cajasAbiertas; k++) {
      const c = st.cajas[k];
      if (c.busy) continue;
      const hid = st.cajaQueue[0];
      if (hid == null) break;
      const h = this._byId.get(hid);
      if (!h) {
        st.cajaQueue.shift();
        continue;
      }
      if (dist2(h.pos.x, h.pos.z, frontX, 0) < 2.6) {
        st.cajaQueue.shift();
        h.state = "en-caja";
        h.cajaAsignada = k;
        h.target = { x: b[0] + FLOW.cajaBoothX, y: b[1], z: FLOW.boothZ[k] };
        c.busy = true;
        c.curId = h.id;
        c.until = this.t + Math.max(1, expo(this.params.tiempoAtencion));
      }
    }
  }

  _service(c, stop) {
    const st = this.stations[stop.station];
    const b = STATIONS[stop.station].base;
    // BAJADA: pasajeros cuyo destino es esta estacion
    for (let qi = c.pax.length - 1; qi >= 0; qi--) {
      const p = this._byId.get(c.pax[qi]);
      if (!p) {
        c.pax.splice(qi, 1);
        continue;
      }
      if (p.dest === stop.station) {
        p.state = "saliendo";
        p.cabinRef = null;
        // baja al anden correspondiente y camina hacia la SALIDA (este)
        p.pos = { x: c.pos.x, y: b[1], z: stop.dir === "up" ? FLOW.platUpZ : FLOW.platDownZ };
        p.target = { x: b[0] + FLOW.exitX, y: b[1], z: 0 };
        this._recordTrip(p);
        c.pax.splice(qi, 1);
      }
    }
    // SUBIDA: aborda quien va en este sentido y ya espera en el anden
    const queue = stop.dir === "up" ? st.platUp : st.platDown;
    while (c.pax.length < CAP && queue.length) {
      const h = this._byId.get(queue[0]);
      if (!h) {
        queue.shift();
        continue;
      }
      const ready =
        h.state === "fila-anden" &&
        dist2(h.pos.x, h.pos.z, h.target.x, h.target.z) < 3.5;
      if (!ready) break;
      queue.shift();
      h.state = "boarded";
      h.cabinRef = c;
      h.seat = c.pax.length;
      h.tBoard = this.t;
      h.tEsperaAnden = this.t - h.tInicioAnden;
      c.pax.push(h.id);
    }
  }

  _recordTrip(p) {
    this.nCompletados++;
    this.sumEsperaCaja += p.tEsperaCaja;
    this.sumEsperaAnden += p.tEsperaAnden;
    this.sumViaje += this.t - p.tBoard;
    this.sumTotal += this.t - p.tLlegada;
  }

  _ordenarColas() {
    for (let i = 0; i < 3; i++) {
      const st = this.stations[i];
      const b = STATIONS[i].base;
      for (let k = 0; k < st.cajaQueue.length; k++) {
        const p = this._byId.get(st.cajaQueue[k]);
        if (p) p.target = { x: b[0] + FLOW.cajaFrontX - k * 1.2, y: b[1], z: 0 };
      }
      for (let k = 0; k < st.platUp.length; k++) {
        const p = this._byId.get(st.platUp[k]);
        if (p)
          p.target = {
            x: b[0] - 5 + (k % 10) * 1.0,
            y: b[1],
            z: FLOW.platUpZ - Math.floor(k / 10) * 1.0,
          };
      }
      for (let k = 0; k < st.platDown.length; k++) {
        const p = this._byId.get(st.platDown[k]);
        if (p)
          p.target = {
            x: b[0] - 5 + (k % 10) * 1.0,
            y: b[1],
            z: FLOW.platDownZ + Math.floor(k / 10) * 1.0,
          };
      }
    }
  }

  _mover(dt) {
    const max = WALK * dt;
    for (const p of this.passengers) {
      if (p.state === "dead") {
        this._needCleanup = true;
        continue;
      }
      if (p.state === "boarded") {
        const c = p.cabinRef;
        if (c) {
          const ox = ((p.seat % 3) - 1) * 0.62;
          const oz = (Math.floor(p.seat / 3) - 1) * 0.62;
          const a = Math.min(1, dt * 8);
          p.pos.x += (c.pos.x + ox - p.pos.x) * a;
          p.pos.y += (c.pos.y - 2.7 - p.pos.y) * a; // dentro del cuerpo de la gondola
          p.pos.z += (c.pos.z + oz - p.pos.z) * a;
        }
        continue;
      }
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const dy = p.target.y - p.pos.y;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.05) {
        const s = Math.min(max, d);
        p.pos.x += (dx / d) * s;
        p.pos.z += (dz / d) * s;
      }
      p.pos.y += dy * Math.min(1, dt * 3);
      if (p.state === "saliendo" && d < 0.6) {
        p.state = "dead";
        this._needCleanup = true;
      }
    }
  }

  getStats() {
    const n = this.nCompletados || 1;
    return {
      simTime: this.t,
      perStation: this.stations.map((st, i) => ({
        name: STATIONS[i].name,
        caja: st.cajaQueue.length,
        anden: st.platUp.length + st.platDown.length,
      })),
      enTransito: this.cabins.reduce((a, c) => a + c.pax.length, 0),
      enEstacion: this.passengers.filter(
        (p) => p.state !== "boarded" && p.state !== "dead"
      ).length,
      viajes: this.nCompletados,
      esperaProm: this.nCompletados ? (this.sumEsperaCaja + this.sumEsperaAnden) / n : 0,
      viajeProm: this.nCompletados ? this.sumViaje / n : 0,
      totalProm: this.nCompletados ? this.sumTotal / n : 0,
      throughput: this.t > 0 ? this.nCompletados / (this.t / 60) : 0,
    };
  }
}

export { CAP, ZT, PY };
