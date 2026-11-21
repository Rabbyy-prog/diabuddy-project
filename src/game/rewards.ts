export type OutfitSlot = 'head' | 'face' | 'neck'

export interface Cosmetic {
  id: string
  name: string
  slot: OutfitSlot
  level: number
}

export const COSMETICS: Cosmetic[] = [
  { id: 'hibiscus', name: 'Bunga raya', slot: 'head', level: 2 },
  { id: 'specs', name: 'Round specs', slot: 'face', level: 3 },
  { id: 'scarf', name: 'Batik scarf', slot: 'neck', level: 5 },
  { id: 'hat', name: 'Sun hat', slot: 'head', level: 7 },
  { id: 'crown', name: 'Flower crown', slot: 'head', level: 9 },
]

export interface Level {
  level: number
  name: string
  xp: number
  world: string
  cosmetic?: string
}

/** Paced so a steady user reaches level 10 in roughly three months. */
export const LEVELS: Level[] = [
  { level: 1, name: 'Seedling', xp: 0, world: 'Your own little island' },
  { level: 2, name: 'Sprout', xp: 150, world: 'Wildflowers', cosmetic: 'hibiscus' },
  { level: 3, name: 'First Steps', xp: 400, world: 'Stepping stones', cosmetic: 'specs' },
  { level: 4, name: 'Steady Walker', xp: 800, world: 'A shady tree' },
  { level: 5, name: 'Habit Builder', xp: 1400, world: 'Coconut palm', cosmetic: 'scarf' },
  { level: 6, name: 'Balance Keeper', xp: 2200, world: 'Lily pond' },
  { level: 7, name: 'Kampung Keeper', xp: 3300, world: 'Kampung house', cosmetic: 'hat' },
  { level: 8, name: 'Care Champion', xp: 4800, world: 'Butterflies' },
  { level: 9, name: 'Garden Guardian', xp: 6800, world: 'Pelita lanterns', cosmetic: 'crown' },
  { level: 10, name: 'Diabuddy Legend', xp: 9500, world: 'A rainbow' },
]

export interface LevelProgress {
  current: Level
  next: Level | null
  intoLevel: number
  needed: number
  ratio: number
}

export function levelProgress(xp: number): LevelProgress {
  let index = 0
  LEVELS.forEach((level, i) => {
    if (xp >= level.xp) index = i
  })
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  if (!next) return { current, next, intoLevel: xp - current.xp, needed: 0, ratio: 1 }
  const needed = next.xp - current.xp
  const intoLevel = xp - current.xp
  return { current, next, intoLevel, needed, ratio: intoLevel / needed }
}

export interface BadgeStats {
  activeDays: number
  bestStreak: number
  comebacks: number
  chests: number
  footChecks: number
  breathing: number
  glucoseLogs: number
  walks: number
  waterDays: number
  strength: number
}

export interface Badge {
  id: string
  name: string
  hint: string
  earned: (stats: BadgeStats) => boolean
}

// Glucose badges reward the habit of logging. They never depend on the value.
export const BADGES: Badge[] = [
  { id: 'first', name: 'Showed Up', hint: 'Complete your first mission', earned: (s) => s.activeDays >= 1 },
  { id: 'streak3', name: 'Three in a Row', hint: 'Reach a 3-day streak', earned: (s) => s.bestStreak >= 3 },
  { id: 'streak7', name: 'Full Week', hint: 'Reach a 7-day streak', earned: (s) => s.bestStreak >= 7 },
  { id: 'streak30', name: 'Month of Care', hint: 'Reach a 30-day streak', earned: (s) => s.bestStreak >= 30 },
  { id: 'comeback', name: 'I’m Back', hint: 'Return after a break', earned: (s) => s.comebacks >= 1 },
  { id: 'chest', name: 'Treasure Keeper', hint: 'Open 5 daily chests', earned: (s) => s.chests >= 5 },
  { id: 'feet', name: 'Foot Guardian', hint: 'Do 7 foot checks', earned: (s) => s.footChecks >= 7 },
  { id: 'calm', name: 'Calm Mind', hint: 'Finish 7 breathing sessions', earned: (s) => s.breathing >= 7 },
  { id: 'logger', name: 'Honest Logger', hint: 'Log 10 glucose readings', earned: (s) => s.glucoseLogs >= 10 },
  { id: 'walker', name: 'Trailblazer', hint: 'Complete 10 walks', earned: (s) => s.walks >= 10 },
  { id: 'water', name: 'Hydration Hero', hint: 'Reach your water goal 5 times', earned: (s) => s.waterDays >= 5 },
  { id: 'strong', name: 'Stronger', hint: 'Finish 2 weeks of strength goals', earned: (s) => s.strength >= 2 },
]
