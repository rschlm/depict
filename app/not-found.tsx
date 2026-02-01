"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import AppLogo from "@/app/AppLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Subtle background pattern - hexagonal / molecular motif */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="hex-pattern"
                x="0"
                y="0"
                width="60"
                height="52"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M30 0L60 15v30L30 60L0 45V15z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-pattern)" />
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mb-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <AppLogo className="h-6 w-auto" aria-hidden />
            <span className="font-semibold text-xl tracking-tight">epict</span>
          </Link>

          {/* 404 */}
          <p
            className="text-8xl sm:text-9xl font-bold tracking-tighter text-primary/20 dark:text-primary/30 select-none"
            aria-hidden
          >
            404
          </p>

          <h1 className="text-xl font-semibold text-foreground mt-4 -mb-1">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mt-2">
            The structure you&apos;re looking for doesn&apos;t exist or has moved.
            Head back to the dashboard to continue.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go to dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center">
        <Link
          href="/help"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          User Guide
        </Link>
      </footer>
    </div>
  );
}
