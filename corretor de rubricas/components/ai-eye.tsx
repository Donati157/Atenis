"use client"

import { useEffect, useRef } from "react"

interface AIEyeProps {
  isAnalyzing?: boolean
  size?: number
}

export function AIEye({ isAnalyzing = false, size = 120 }: AIEyeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const angleRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.5,
        centerX,
        centerY,
        radius * 1.2
      )
      glowGradient.addColorStop(0, "rgba(139, 92, 246, 0.3)")
      glowGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.1)")
      glowGradient.addColorStop(1, "rgba(139, 92, 246, 0)")
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()

      // Outer ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      const ringGradient = ctx.createLinearGradient(
        0,
        0,
        size,
        size
      )
      ringGradient.addColorStop(0, "#8b5cf6")
      ringGradient.addColorStop(0.5, "#a78bfa")
      ringGradient.addColorStop(1, "#7c3aed")
      ctx.strokeStyle = ringGradient
      ctx.lineWidth = 3
      ctx.stroke()

      // Inner circle (iris)
      const irisRadius = radius * 0.6
      const irisGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        irisRadius
      )
      irisGradient.addColorStop(0, "#1e1b4b")
      irisGradient.addColorStop(0.7, "#312e81")
      irisGradient.addColorStop(1, "#4c1d95")
      ctx.beginPath()
      ctx.arc(centerX, centerY, irisRadius, 0, Math.PI * 2)
      ctx.fillStyle = irisGradient
      ctx.fill()

      // Pupil
      const pupilRadius = radius * 0.25
      ctx.beginPath()
      ctx.arc(centerX, centerY, pupilRadius, 0, Math.PI * 2)
      ctx.fillStyle = "#030014"
      ctx.fill()

      // Light reflection
      ctx.beginPath()
      ctx.arc(centerX - pupilRadius * 0.5, centerY - pupilRadius * 0.5, pupilRadius * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.fill()

      // Scanning effect when analyzing
      if (isAnalyzing) {
        angleRef.current += 0.05
        
        // Rotating scan line
        const scanAngle = angleRef.current
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(scanAngle)
        
        const scanGradient = ctx.createLinearGradient(0, 0, radius, 0)
        scanGradient.addColorStop(0, "rgba(139, 92, 246, 0)")
        scanGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.8)")
        scanGradient.addColorStop(1, "rgba(139, 92, 246, 0)")
        
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(radius, 0)
        ctx.strokeStyle = scanGradient
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()

        // Pulsing ring
        const pulseRadius = radius * (0.8 + Math.sin(angleRef.current * 2) * 0.1)
        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 + Math.sin(angleRef.current * 2) * 0.2})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isAnalyzing, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
    />
  )
}
