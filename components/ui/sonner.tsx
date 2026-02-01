"use client"

import {
  CircleAlert,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      closeButton
      duration={4000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-zinc-700/80 !bg-zinc-900 !py-2 !px-3 !shadow-lg !text-zinc-100",
          error: "!rounded-md !border-zinc-700/80 !bg-zinc-900 !text-zinc-100",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500 shrink-0" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <CircleAlert className="size-4 text-red-500 shrink-0" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
