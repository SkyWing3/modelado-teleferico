"use client";

import { useFrame } from "@react-three/fiber";
import { OrbitControls, Sky, Html } from "@react-three/drei";
import { STATIONS } from "../lib/simulation";
import Terrain from "./Terrain";
import Stations from "./Stations";
import Cable from "./Cable";
import Cabins from "./Cabins";
import Passengers from "./Passengers";

// Avanza el motor una vez por frame (primer hijo con useFrame).
function Stepper({ engineRef, speedRef }) {
  useFrame((_, delta) => {
    const e = engineRef.current;
    if (!e) return;
    e.update(Math.min(delta, 0.05) * speedRef.current);
  });
  return null;
}

function StationLabel({ index }) {
  const [bx, by] = STATIONS[index].base;
  const s = STATIONS[index];
  return (
    <Html
      position={[bx, by + 10.5, 0]}
      center
      distanceFactor={120}
      zIndexRange={[10, 0]}
      pointerEvents="none"
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          padding: "6px 14px",
          borderRadius: 10,
          background: "rgba(180,30,30,0.92)",
          color: "#fff",
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: 1,
          whiteSpace: "nowrap",
          textAlign: "center",
          border: "2px solid #fff",
          boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
          pointerEvents: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {s.name}
        <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.92 }}>{s.nick}</div>
      </div>
    </Html>
  );
}

export default function Scene({ engineRef, speedRef, numeroCabinas }) {
  return (
    <>
      <color attach="background" args={["#aacdf0"]} />
      <fog attach="fog" args={["#bcd6ee", 180, 520]} />

      <Sky sunPosition={[120, 60, -80]} turbidity={5} rayleigh={1.4} />

      <hemisphereLight args={["#e6f1ff", "#5a6b4d", 0.75]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[120, 150, 60]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-near={1}
        shadow-camera-far={450}
        shadow-bias={-0.0004}
      />

      <Stepper engineRef={engineRef} speedRef={speedRef} />

      <Terrain />
      <Stations />
      <Cable />
      <Cabins engineRef={engineRef} numeroCabinas={numeroCabinas} />
      <Passengers engineRef={engineRef} />

      {STATIONS.map((_, i) => (
        <StationLabel key={i} index={i} />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.55}
        zoomSpeed={0.9}
        panSpeed={0.7}
        zoomToCursor
        screenSpacePanning
        target={[95, 16, 0]}
        minDistance={30}
        maxDistance={340}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}
