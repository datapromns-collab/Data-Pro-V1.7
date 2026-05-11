
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plan Semanal Pro',
    short_name: 'PlannerPro',
    description: 'Sistema de planificación semanal profesional para gestión de producción.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: 'https://picsum.photos/seed/planner-icon/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/planner-icon-large/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
