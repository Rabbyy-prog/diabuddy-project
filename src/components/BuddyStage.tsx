import { useEffect, useRef, useState } from 'react'
import type { Mood } from '../three/buddy'
import { BuddyWorld } from '../three/world'

interface Props {
  level: number
  outfit: string[]
  mood: Mood
  /** Increment to play a celebration. */
  cheer?: number
  bigCheer?: boolean
  height: number
}

export function BuddyStage({ level, outfit, mood, cheer = 0, bigCheer = false, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<BuddyWorld | null>(null)
  const firstLevel = useRef(true)
  const lastCheer = useRef(cheer)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    try {
      const world = new BuddyWorld(canvasRef.current)
      worldRef.current = world
      firstLevel.current = true
      return () => {
        world.dispose()
        worldRef.current = null
      }
    } catch (error) {
      console.warn('3D is unavailable on this device.', error)
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    worldRef.current?.setLevel(level, !firstLevel.current)
    firstLevel.current = false
  }, [level])

  useEffect(() => worldRef.current?.setOutfit(outfit), [outfit])
  useEffect(() => worldRef.current?.setMood(mood), [mood])

  useEffect(() => {
    if (cheer !== lastCheer.current) {
      lastCheer.current = cheer
      worldRef.current?.celebrate(bigCheer)
    }
  }, [cheer, bigCheer])

  return (
    <div className="stage" style={{ height }}>
      {failed ? (
        <div className="stage-fallback" role="img" aria-label="Buddy, a smiling mint-green character">
          <svg viewBox="0 0 120 130" width="130" height="140" aria-hidden="true">
            <path d="M60 22c-2-12 5-20 21-22 1 14-6 21-21 22z" fill="#f6eaa2" />
            <ellipse cx="60" cy="74" rx="46" ry="52" fill="#7ad9b1" />
            <ellipse cx="60" cy="56" rx="34" ry="24" fill="#e7fff0" />
            <ellipse cx="48" cy="54" rx="4" ry="7" fill="#163f38" />
            <ellipse cx="72" cy="54" rx="4" ry="7" fill="#163f38" />
            <path d="M52 66q8 7 16 0" fill="none" stroke="#163f38" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label="Buddy on their island. Drag to look around, tap to say hello." />
      )}
    </div>
  )
}
