import "../Styles/globals.css";
import { AuthProvider } from "../Context/AuthContext";
import { FleetProvider } from "../Context/FleetContext";
import { ThemeProvider } from "../Context/ThemeContext";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css"

export const metadata = {
  title: "App",
  description: "Proyecto generado desde Figma adaptado a Next.js",
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
