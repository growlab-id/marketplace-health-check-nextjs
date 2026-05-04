import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketplace Health Check - Growlab Tools",
  description: "Dapatkan skor kesehatan toko Anda secara cepat dan akurat berdasarkan performa toko Anda",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
