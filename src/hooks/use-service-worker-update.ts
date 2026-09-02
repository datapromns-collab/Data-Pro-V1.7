"use client"

import { useEffect, useState } from "react"

const POLL_INTERVAL = 60_000

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let mounted = true

    const checkVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return

        const remoteVersion = data.build || data.version
        if (currentVersion === null) {
          setCurrentVersion(remoteVersion)
          return
        }

        if (remoteVersion && remoteVersion !== currentVersion) {
          setUpdateAvailable(true)
        }
      } catch {
        // Silenciar errores de red para no molestar al usuario
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, POLL_INTERVAL)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [currentVersion])

  const applyUpdate = () => {
    window.location.reload()
  }

  return { updateAvailable, applyUpdate }
}
