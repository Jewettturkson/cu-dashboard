import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CU Dashboard',
    short_name: 'CU Dashboard',
    description: 'Credit union manager — collections, withdrawals, reconciliation',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3182f6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
