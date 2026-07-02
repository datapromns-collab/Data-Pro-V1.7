import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { PlannerProvider } from '@/hooks/use-planner-store';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Data Pro - Planificación Eficiente',
  description: 'Sistema de planificación semanal profesional con monitoreo de turnos e IA.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <PlannerProvider>
            {children}
          </PlannerProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
