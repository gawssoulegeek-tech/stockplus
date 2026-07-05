"use client"

import { useEffect, useState } from "react"
import Lottie from "lottie-react"

interface LottieWrapperProps {
  src: string
  className?: string
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

export default function LottieWrapper({
  src,
  className = "",
  loop = true,
  autoplay = true,
  style,
}: LottieWrapperProps) {
  const [data, setData] = useState<unknown>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(false)
    fetch(`/lottie/${src}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Lottie "${src}" not found`)
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) { console.warn(e.message); setError(true) } })
    return () => { cancelled = true }
  }, [src])

  if (error || !data) return null

  return (
    <div className={className} style={style}>
      <Lottie animationData={data} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
