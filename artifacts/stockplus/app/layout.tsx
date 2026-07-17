import type { Metadata } from 'next'
import Providers from '@/components/providers'
import '@/index.css'

export const metadata: Metadata = {
  title: 'StockPlus — Gestion de boutique',
  description: 'Gérez votre inventaire, vos ventes et votre boutique avec StockPlus.',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
