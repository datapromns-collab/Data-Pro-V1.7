"use client"

import { useEffect, useState } from "react"

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const handleControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

    const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateAvailable(true)
        }
      })
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setUpdateAvailable(true)
      }

      registration.addEventListener("updatefound", () => handleUpdateFound(registration))
    })

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [])

  const applyUpdate = () => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.ready.then((registration) => {
      const waitingWorker = registration.waiting
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" })
      } else {
        window.location.reload()
      }
    })
  }

  return { updateAvailable, applyUpdate }
}
