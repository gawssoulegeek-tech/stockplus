'use client'

import { motion, type Variants } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TimelineContentProps {
  children: React.ReactNode
  as?: "div" | "p" | "span" | "article" | "section"
  animationNum?: number
  timelineRef?: React.RefObject<HTMLDivElement | null>
  customVariants?: Variants
  className?: string
}

export function TimelineContent({
  children,
  as: Tag = "div",
  animationNum = 0,
  timelineRef,
  customVariants,
  className,
}: TimelineContentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
  }

  const variants = customVariants || defaultVariants

  return (
    <motion.div
      ref={ref}
      custom={animationNum}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      <Tag>{children}</Tag>
    </motion.div>
  )
}