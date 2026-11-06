import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBT REI",
  description: "Raja Emas Indonesia Training Assessment",
  icons: { icon: "/logo-rei-2.png" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
