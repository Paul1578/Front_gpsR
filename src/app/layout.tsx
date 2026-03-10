import "../Styles/globals.css";
import { AuthProvider } from "../Context/AuthContext";
import { FleetProvider } from "../Context/FleetContext";
import { ThemeProvider } from "../Context/ThemeContext";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css"

export const metadata = {
  title: "FleetFlow",
  description: "Proyecto generado desde Figma adaptado a Next.js",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <FleetProvider>
              {children}
              <Toaster position="top-center" richColors />
            </FleetProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
