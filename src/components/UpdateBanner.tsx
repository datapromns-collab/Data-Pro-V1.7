"use client"

import { useServiceWorkerUpdate } from "@/hooks/use-service-worker-update"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate()
  const { toast } = useToast()

  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: "Actualización disponible",
        description: "Hay una nueva versión de Data Pro. Tocá Actualizar para aplicar los cambios.",
        duration: Infinity,
      })
    }
  }, [updateAvailable, toast])

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg">
        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        <p className="text-sm">Nueva versión disponible</p>
        <Button size="sm" onClick={applyUpdate}>
          Actualizar
        </Button>
      </div>
    </div>
  )
}
