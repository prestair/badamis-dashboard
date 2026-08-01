import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthProvider } from "@/context/AuthContext";
import { QuotationProvider } from "@/context/QuotationContext";
import AuthGuard from "@/components/AuthGuard";
import PwaInstall from "@/components/PwaInstall";

export const metadata: Metadata = {
  title: "Prestair Systems – Quotation Dashboard",
  description: "Quotation Management System | Prestair Systems LLP",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prestair Dashboard",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <AuthGuard>
            <QuotationProvider>
              <DashboardProvider>{children}</DashboardProvider>
            </QuotationProvider>
          </AuthGuard>
          <PwaInstall />
        </AuthProvider>
      </body>
    </html>
  );
}
