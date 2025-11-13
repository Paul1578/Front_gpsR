import "./globals.css";
import { AuthProvider } from "../Context/AuthContext";
import { FleetProvider } from "../Context/FleetContext";

export const metadata = {
  title: "App",
  description: "Proyecto generado desde Figma adaptado a Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <FleetProvider>{children}</FleetProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
