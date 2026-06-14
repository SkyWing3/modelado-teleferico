import "./globals.css";

export const metadata = {
  title: "Mi Teleférico 3D — Simulación ABM",
  description:
    "Simulación 3D interactiva de una estación de Mi Teleférico (La Paz) basada en agentes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
