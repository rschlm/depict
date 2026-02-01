"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import to avoid SSR issues with Ketcher
export const KetcherEditor = dynamic(
    () => import("./KetcherWrapper").then((mod) => ({ default: mod.KetcherWrapper })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <div className="text-muted-foreground">Loading molecule editor...</div>
            </div>
        ),
    }
);
