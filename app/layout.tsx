import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMS - Property Management System",
  description: "Hotel Property Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
