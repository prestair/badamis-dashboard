import type { Metadata } from "next";
import "./globals.css";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthProvider } from "@/context/AuthContext";
import { QuotationProvider } from "@/context/QuotationContext";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Prestair Systems – Quotation Dashboard",
  description: "Quotation Management System | Prestair Systems LLP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <AuthProvider>
          <AuthGuard>
            <QuotationProvider>
              <DashboardProvider>{children}</DashboardProvider>
            </QuotationProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
