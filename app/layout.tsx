import type { ReactNode } from "react";
import "@fontsource-variable/literata";
import "@fontsource-variable/golos-text";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
