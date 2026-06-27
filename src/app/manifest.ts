
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StockPlus',
    short_name: 'StockPlus',
    description: 'Inventaire Intelligent & Point de Vente assisté par Awa IA. Solution par Keur\'Geek Digital.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF8800',
    icons: [
      {
        src: 'https://picsum.photos/seed/sena-icon/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/sena-icon/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
