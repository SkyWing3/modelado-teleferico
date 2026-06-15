"use client";

import { CableCar, RotateCcw, FastForward, Mouse } from "lucide-react";

const panel = {
  position: "absolute",
  top: 16,
  background: "rgba(12,18,34,0.82)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(120,150,200,0.25)",
  borderRadius: 14,
  padding: "16px 18px",
  color: "#e9eef7",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12.5,
          marginBottom: 4,
          color: "#bcd0ee",
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: "#fff" }}>
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#e23b3b", cursor: "pointer" }}
      />
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 10,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 11, color: "#9fb3d4" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color || "#fff" }}>{value}</div>
    </div>
  );
}

export default function HUD({
  params,
  updateParam,
  velocidadSim,
  setVelocidadSim,
  stats,
  onReset,
}) {
  const fmt = (x, d = 1) => (x == null ? "—" : x.toFixed(d));

  return (
    <>
      {/* Titulo */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(12,18,34,0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(120,150,200,0.28)",
            borderRadius: 14,
            padding: "8px 22px",
            boxShadow: "0 8px 26px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1,
              color: "#f1f5fc",
              textShadow: "0 1px 3px rgba(0,0,0,0.7)",
            }}
          >
            <CableCar size={24} color="#ff5a5a" strokeWidth={2.4} />
            Mi Teleférico — Línea Roja 3D
          </div>
          <div style={{ fontSize: 12, color: "#cdddf5", marginTop: 2 }}>
            La Paz · El Alto — Central · Cementerio · 16 de Julio
          </div>
        </div>
      </div>

      {/* Controles */}
      <div style={{ ...panel, left: 16, width: 268 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#ff9d9d" }}>
          PARÁMETROS DEL SISTEMA
        </div>
        <Slider
          label="Tasa de llegada (red)"
          value={params.tasaLlegada}
          min={0}
          max={150}
          step={5}
          unit="usu/min"
          onChange={(v) => updateParam("tasaLlegada", v)}
        />
        <Slider
          label="Cajas abiertas / estación"
          value={params.cajasAbiertas}
          min={1}
          max={4}
          step={1}
          onChange={(v) => updateParam("cajasAbiertas", v)}
        />
        <Slider
          label="Tiempo de atención"
          value={params.tiempoAtencion}
          min={5}
          max={40}
          step={1}
          unit="s"
          onChange={(v) => updateParam("tiempoAtencion", v)}
        />
        <Slider
          label="% con tarjeta"
          value={params.probTarjeta}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => updateParam("probTarjeta", v)}
        />
        <Slider
          label="Número de cabinas"
          value={params.numeroCabinas}
          min={6}
          max={30}
          step={1}
          onChange={(v) => updateParam("numeroCabinas", v)}
        />
        <Slider
          label="Velocidad de cabinas"
          value={params.velocidadCabinas}
          min={4}
          max={16}
          step={1}
          unit="m/s"
          onChange={(v) => updateParam("velocidadCabinas", v)}
        />

        <div style={{ height: 1, background: "rgba(120,150,200,0.25)", margin: "10px 0" }} />
        <Slider
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FastForward size={13} /> Velocidad de simulación
            </span>
          }
          value={velocidadSim}
          min={1}
          max={12}
          step={1}
          unit="×"
          onChange={(v) => setVelocidadSim(v)}
        />
        <button
          onClick={onReset}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "9px 0",
            borderRadius: 10,
            border: "1px solid #e23b3b",
            background: "rgba(226,59,59,0.18)",
            color: "#ffd2d2",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <RotateCcw size={15} /> Reiniciar simulación
        </button>
      </div>

      {/* Resultados */}
      <div style={{ ...panel, right: 16, width: 248 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#ff9d9d" }}>
          INDICADORES EN VIVO
        </div>

        {/* Filas por estacion */}
        <div style={{ fontSize: 11, color: "#9fb3d4", marginBottom: 4 }}>
          Filas por estación (caja / andén)
        </div>
        <div style={{ marginBottom: 10 }}>
          {stats?.perStation?.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                padding: "3px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ color: "#dfe7f4" }}>{s.name}</span>
              <span style={{ fontWeight: 700 }}>
                <span style={{ color: "#5db1e8" }}>{s.caja}</span>
                {" / "}
                <span style={{ color: "#e8c95d" }}>{s.anden}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Stat label="En cabinas" value={stats ? stats.enTransito : "—"} color="#7bd17b" />
          <Stat label="En estación" value={stats ? stats.enEstacion : "—"} color="#e8945d" />
          <Stat label="Viajes hechos" value={stats ? stats.viajes : "—"} />
          <Stat label="Throughput" value={stats ? `${fmt(stats.throughput)}/min` : "—"} />
          <Stat label="Espera prom." value={stats ? `${fmt(stats.esperaProm)} s` : "—"} color="#5db1e8" />
          <Stat label="Viaje prom." value={stats ? `${fmt(stats.viajeProm)} s` : "—"} />
        </div>
        <div style={{ fontSize: 11, color: "#9fb3d4", marginTop: 10 }}>
          Tiempo total prom.: {stats ? `${fmt(stats.totalProm)} s` : "—"} · t ={" "}
          {stats ? `${fmt(stats.simTime, 0)} s` : "—"}
        </div>
      </div>

      {/* Ayuda */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11.5,
          color: "rgba(233,238,247,0.7)",
          background: "rgba(12,18,34,0.6)",
          padding: "6px 14px",
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        <Mouse size={14} style={{ flexShrink: 0 }} />
        Arrastra para rotar · rueda para zoom · clic derecho para desplazar · cada pasajero elige su estación de destino
      </div>
    </>
  );
}
