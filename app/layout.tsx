import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NemMad',
  description: 'Dansk madlavnings-app: opskrifter, cooking mode med timer og indkøbsliste. Importér opskrifter gratis fra et link.',
  applicationName: 'NemMad',
  appleWebApp: {
    capable: true,
    title: 'NemMad',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#2E5D3A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
