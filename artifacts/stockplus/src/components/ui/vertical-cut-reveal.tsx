'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { motion, type Transition } from "framer-motion"
import { cn } from "@/lib/utils"

interface VerticalCutRevealProps {
  children: React.ReactNode
  reverse?: boolean
  transition?: Transition
  splitBy?: "words" | "characters" | "lines" | string
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | "random" | number
  containerClassName?: string
  wordLevelClassName?: string
  elementLevelClassName?: string
  onClick?: () => void
  onStart?: () => void
  onComplete?: () => void
  autoStart?: boolean
}

export interface VerticalCutRevealRef {
  startAnimation: () => void
  reset: () => void
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, VerticalCutRevealProps>(
  (
    {
      children,
      reverse = false,
      transition = {
        type: "spring",
        stiffness: 190,
        damping: 22,
      },
      splitBy = "words",
      staggerDuration = 0.2,
      staggerFrom = "first",
      containerClassName,
      wordLevelClassName,
      elementLevelClassName,
      onClick,
      onStart,
      onComplete,
      autoStart = true,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLSpanElement>(null)
    const text = typeof children === "string" ? children : children?.toString() || ""
    const [isAnimating, setIsAnimating] = useState(false)

    const elements = useMemo(() => {
      if (splitBy === "words") return text.split(" ")
      if (splitBy === "characters") return Array.from(text)
      if (splitBy === "lines") return text.split("\n")
      return text.split(splitBy)
    }, [text, splitBy])

    const getStaggerDelay = useCallback(
      (index: number) => {
        const total = elements.length
        if (staggerFrom === "first") return index * staggerDuration
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [elements.length, staggerFrom, staggerDuration]
    )

    const startAnimation = useCallback(() => {
      setIsAnimating(true)
      onStart?.()
    }, [onStart])

    useImperativeHandle(ref, () => ({
      startAnimation,
      reset: () => setIsAnimating(false),
    }))

    useEffect(() => {
      if (autoStart) startAnimation()
    }, [autoStart])

    const variants = {
      hidden: { y: reverse ? "-100%" : "100%" },
      visible: (i: number) => ({
        y: 0,
        transition: {
          ...transition,
          delay: ((transition?.delay as number) || 0) + getStaggerDelay(i),
        },
      }),
    }

    return (
      <span
        className={cn(
          containerClassName,
          "flex flex-wrap whitespace-pre-wrap",
          splitBy === "lines" && "flex-col"
        )}
        onClick={onClick}
        ref={containerRef}
      >
        <span className="sr-only">{text}</span>
        {(elements as string[]).map((el, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn("inline-flex overflow-hidden", wordLevelClassName)}
          >
            <span className={cn(elementLevelClassName, "whitespace-pre-wrap relative")}>
              <motion.span
                custom={i}
                initial="hidden"
                animate={isAnimating ? "visible" : "hidden"}
                variants={variants}
                onAnimationComplete={i === elements.length - 1 ? onComplete : undefined}
                className="inline-block"
              >
                {el}
              </motion.span>
              {i < elements.length - 1 && <span> </span>}
            </span>
          </span>
        ))}
      </span>
    )
  }
)

VerticalCutReveal.displayName = "VerticalCutReveal"

export { VerticalCutReveal }