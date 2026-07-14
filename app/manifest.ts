import type { MetadataRoute } from 'next';

// PWA manifest — makes "Føj til hjemmeskærm" install NemMad as a standalone
// app with its own icon and splash, no browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NemMad',
    short_name: 'NemMad',
    description: 'Opskrifter, cooking mode og indkøbsliste. Importér opskrifter gratis fra et link.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF7F2',
    theme_color: '#FAF7F2',
    lang: 'da',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
