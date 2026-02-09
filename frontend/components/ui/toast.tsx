"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

interface ToastProps {
  message: string
  type?: "error" | "success" | "info"
  onClose: () => void
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    error: {
      bg: "bg-error/10 border-error/30",
      text: "text-error",
      icon: <XCircle className="h-4 w-4" />,
    },
    success: {
      bg: "bg-accent-bullish/10 border-accent-bullish/30",
      text: "text-accent-bullish",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    info: {
      bg: "bg-info/10 border-info/30",
      text: "text-info",
      icon: <AlertCircle className="h-4 w-4" />,
    },
  }[type]

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-md border shadow-lg min-w-[300px] max-w-md toast-enter",
        styles.bg
      )}
    >
      <div className={cn("mt-0.5 flex-shrink-0", styles.text)}>
        {styles.icon}
      </div>
      <p className={cn("text-sm flex-1", styles.text)}>{message}</p>
      <button
        onClick={onClose}
        className={cn("flex-shrink-0 hover:opacity-70 transition-opacity", styles.text)}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: "error" | "success" | "info" }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-14 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
