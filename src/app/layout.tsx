import "./globals.css";
import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";

export const metadata: Metadata = {
  title: "UniPlatform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
