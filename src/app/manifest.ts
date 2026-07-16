import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Data Pro',
    short_name: 'DataPro',
    description: 'Sistema de planificación semanal profesional para gestión de producción.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/ico.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
