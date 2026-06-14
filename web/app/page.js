"use client";

import dynamic from "next/dynamic";

// El lienzo 3D requiere el navegador (Three.js): se carga sin SSR.
const App3D = dynamic(() => import("../components/App3D"), {
  ssr: false,
  loading: () => (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: 18,
        letterSpacing: 1,
      }}
    >
      Cargando simulación 3D…
    </main>
  ),
});

export default function Page() {
  return (
    <main>
      <App3D />
    </main>
  );
}
