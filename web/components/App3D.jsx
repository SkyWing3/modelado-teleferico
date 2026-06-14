"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Simulation } from "../lib/simulation";
import Scene from "./Scene";
import HUD from "./HUD";

const PARAMS_INICIALES = {
  tasaLlegada: 70,
  cajasAbiertas: 2,
  tiempoAtencion: 10,
  probTarjeta: 60,
  numeroCabinas: 18,
  velocidadCabinas: 8,
};

export default function App3D() {
  const [params, setParams] = useState(PARAMS_INICIALES);
  const [velocidadSim, setVelocidadSim] = useState(3); // multiplicador de tiempo
  const [stats, setStats] = useState(null);

  // El motor vive en un ref: no provoca re-render en cada frame.
  const engineRef = useRef(null);
  if (engineRef.current === null) {
    engineRef.current = new Simulation(PARAMS_INICIALES);
  }
  const speedRef = useRef(velocidadSim);

  // Sincroniza parametros -> motor
  useEffect(() => {
    engineRef.current.setParams(params);
  }, [params]);

  useEffect(() => {
    speedRef.current = velocidadSim;
  }, [velocidadSim]);

  // Sondeo de estadisticas a ~5 Hz (sin sobrecargar React)
  useEffect(() => {
    const id = setInterval(() => {
      if (engineRef.current) setStats(engineRef.current.getStats());
    }, 200);
    return () => clearInterval(id);
  }, []);

  const reset = () => {
    engineRef.current.reset();
    setStats(engineRef.current.getStats());
  };

  const updateParam = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  const camaraInicial = useMemo(() => [55, 52, 155], []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: camaraInicial, fov: 45, near: 0.1, far: 600 }}
        gl={{ antialias: true }}
      >
        <Scene engineRef={engineRef} speedRef={speedRef} numeroCabinas={params.numeroCabinas} />
      </Canvas>

      <HUD
        params={params}
        updateParam={updateParam}
        velocidadSim={velocidadSim}
        setVelocidadSim={setVelocidadSim}
        stats={stats}
        onReset={reset}
      />
    </>
  );
}
