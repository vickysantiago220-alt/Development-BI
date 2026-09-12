import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import HideNextDevIndicator from "@/components/hide-next-dev-indicator";

export const metadata: Metadata = {
  title: "DEV MANAGEMENT BI",
  description: "Dashboard de gestão de desenvolvimento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f7f7f8] text-zinc-950 antialiased">
        <HideNextDevIndicator />
        <div className="flex min-h-screen">
          <Sidebar />

          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
