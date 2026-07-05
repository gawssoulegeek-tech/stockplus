import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  },
  allowedDevOrigins: ['*.riker.replit.dev', '*.replit.dev'],
  webpack: (config) => {
    config.resolve.alias['@assets'] = path.resolve(__dirname, '../../attached_assets')
    return config
  },
}

export default nextConfig
