import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { PWAProvider } from 'next-pwa-pack';

export const metadata: Metadata = {
  title: 'Mythic Pets',
  description: 'Turn your pet into a legend with AI-powered personas and stories.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-body antialiased">
        <PWAProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </PWAProvider>
        <Toaster />
      </body>
    </html>
  );
}
