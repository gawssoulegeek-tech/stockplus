export { default as Link } from 'next/link'
export { useSearchParams } from 'next/navigation'

import { useRouter, usePathname } from 'next/navigation'

export function useLocation(): [string, (path: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  return [pathname, (path: string) => router.push(path)]
}
