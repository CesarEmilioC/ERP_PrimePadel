import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Prime Padel ERP",
  description: "Sistema de inventario y ventas — Prime Padel Club, Cali.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <ToastProvider>
          <Nav />
          <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 sm:py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
