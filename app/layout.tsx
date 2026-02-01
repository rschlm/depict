import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Depict - Molecular Visualization & Analysis",
  description: "High-performance cheminformatics dashboard for visualizing molecules, analyzing reactions, and exploring chemical properties. Supports SMILES, MOL, SDF files with interactive 2D/3D rendering.",
  keywords: ["cheminformatics", "molecule visualization", "SMILES", "chemical structure", "molecular properties", "reaction viewer", "drug discovery", "chemistry"],
  authors: [{ name: "Depict" }],
  openGraph: {
    title: "Depict - Molecular Visualization & Analysis",
    description: "High-performance cheminformatics dashboard for visualizing molecules and analyzing reactions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Depict - Molecular Visualization & Analysis",
    description: "High-performance cheminformatics dashboard for visualizing molecules and analyzing reactions",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
            <SonnerToaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
