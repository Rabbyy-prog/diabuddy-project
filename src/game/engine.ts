import { BADGES, COSMETICS, levelProgress, type BadgeStats } from './rewards'
import type { Profile, Task } from './tasks'

export const START_GRACE = 2
export const MAX_GRACE = 3
export const CHEST_XP = 25
const STORAGE_KEY = 'diabuddy.v1'

export interface Entry {
  taskId: string
  at: string
  data: Record<string, string | number | boolean | string[]>
}

export interface PeriodLog {
  counts: Record<string, number>
  xp: Record<string, number>
}

export interface DayLog extends PeriodLog {
  bonus: number
  rest: boolean
  entries: Entry[]
}

export interface GameState {
  version: 1
  profile: Profile | null
  days: Record<string, DayLog>
  weeks: Record<string, PeriodLog>
  outfit: string[]
  dayOffset: number
  demoXp: number
}

export const emptyState = (): GameState => ({
  version: 1,
  profile: null,
  days: {},
  weeks: {},
  outfit: [],
  dayOffset: 0,
  demoXp: 0,
})

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as GameState
    return parsed.version === 1 ? { ...emptyState(), ...parsed } : emptyState()
  } catch {
    return emptyState()
  }
}

export function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private browsing. The session still works.
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
}

/* Dates are local calendar keys (YYYY-MM-DD), so a day ends at the user's midnight. */

const pad = (n: number) => String(n).padStart(2, '0')

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(key: string, n: number) {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

/** Monday of the week containing the date. */
export function weekKey(key: string) {
  const offset = (parseKey(key).getDay() + 6) % 7
  return addDays(key, -offset)
}

export const weekDates = (key: string) => {
  const monday = weekKey(key)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export const todayKey = (state: GameState, now = new Date()) => addDays(dateKey(now), state.dayOffset)

const emptyDay = (): DayLog => ({ counts: {}, xp: {}, bonus: 0, rest: false, entries: [] })

export const isActive = (day?: DayLog) =>
  !!day && (Object.values(day.counts).some((c) => c > 0) || day.entries.length > 0)

export function taskCount(state: GameState, task: Task, today: string) {
  const log = task.period === 'day' ? state.days[today] : state.weeks[weekKey(today)]
  return log?.counts[task.id] ?? 0
}

export const isDone = (state: GameState, task: Task, today: string) =>
  taskCount(state, task, today) >= task.target

/** Tasks shown today. Rest days hide exercise but keep medication, glucose and foot care. */
export function visibleTasks(plan: Task[], state: GameState, today: string) {
  const rest = state.days[today]?.rest
  return plan.filter((t) => !(rest && t.period === 'day' && t.category === 'Exercise'))
}

export interface ChestStatus {
  done: number
  needed: number
  open: boolean
}

/** The daily chest needs every essential plus up to three healthy habits. */
export function chestStatus(plan: Task[], state: GameState, today: string): ChestStatus {
  const daily = visibleTasks(plan, state, today).filter((t) => t.period === 'day')
  const essentials = daily.filter((t) => t.tier === 'essential')
  const habits = daily.filter((t) => t.tier === 'recommended')
  const habitGoal = Math.min(3, habits.length)
  const essentialsDone = essentials.filter((t) => isDone(state, t, today)).length
  const habitsDone = Math.min(habitGoal, habits.filter((t) => isDone(state, t, today)).length)
  const needed = essentials.length + habitGoal
  const done = essentialsDone + habitsDone
  return { done, needed, open: needed > 0 && done >= needed }
}

/** Weighted so essentials count three times as much. Optional tasks never lower the score. */
export function careScore(plan: Task[], state: GameState, today: string) {
  const daily = visibleTasks(plan, state, today).filter((t) => t.period === 'day' && t.tier !== 'optional')
  const weight = (t: Task) => (t.tier === 'essential' ? 3 : 1)
  const total = daily.reduce((sum, t) => sum + weight(t), 0)
  if (!total) return 0
  const earned = daily.reduce(
    (sum, t) => sum + weight(t) * Math.min(1, taskCount(state, t, today) / t.target),
    0,
  )
  return Math.round((earned / total) * 100)
}

function refreshChest(plan: Task[], state: GameState, today: string) {
  const day = state.days[today]
  if (day) day.bonus = chestStatus(plan, state, today).open ? CHEST_XP : 0
}

export function logTask(
  state: GameState,
  plan: Task[],
  task: Task,
  today: string,
  data: Entry['data'] = {},
  now = new Date(),
): GameState {
  const next = structuredClone(state)
  next.days[today] ??= emptyDay()
  const log = task.period === 'day' ? next.days[today] : (next.weeks[weekKey(today)] ??= { counts: {}, xp: {} })
  const count = log.counts[task.id] ?? 0
  if (count >= task.target) return state
  log.counts[task.id] = count + 1
  if (count + 1 >= task.target) log.xp[task.id] = task.xp
  next.days[today].entries.push({ taskId: task.id, at: now.toISOString(), data })
  refreshChest(plan, next, today)
  return next
}

/** Records something without completing it, such as a missed dose. Earns no XP. */
export function addNote(state: GameState, taskId: string, today: string, data: Entry['data'], now = new Date()) {
  const next = structuredClone(state)
  next.days[today] ??= emptyDay()
  next.days[today].entries.push({ taskId, at: now.toISOString(), data })
  return next
}

export function undoTask(state: GameState, plan: Task[], task: Task, today: string): GameState {
  const next = structuredClone(state)
  const log = task.period === 'day' ? next.days[today] : next.weeks[weekKey(today)]
  if (!log || !log.counts[task.id]) return state
  log.counts[task.id] -= 1
  if (log.counts[task.id] <= 0) delete log.counts[task.id]
  delete log.xp[task.id]
  // A weekly task may have been logged on an earlier day of the same week.
  const searchDates = task.period === 'day' ? [today] : weekDates(today).filter((d) => d <= today).reverse()
  for (const date of searchDates) {
    const entries = next.days[date]?.entries ?? []
    const index = entries.findLastIndex((e) => e.taskId === task.id && e.data.missed !== true)
    if (index >= 0) {
      entries.splice(index, 1)
      break
    }
  }
  refreshChest(plan, next, today)
  const level = levelProgress(totalXp(next)).current.level
  next.outfit = next.outfit.filter((id) => (COSMETICS.find((c) => c.id === id)?.level ?? 1) <= level)
  return next
}

export function setRestDay(state: GameState, plan: Task[], today: string, rest: boolean) {
  const next = structuredClone(state)
  next.days[today] ??= emptyDay()
  next.days[today].rest = rest
  refreshChest(plan, next, today)
  return next
}

export function totalXp(state: GameState) {
  const sum = (log: PeriodLog) => Object.values(log.xp).reduce((a, b) => a + b, 0)
  const dayXp = Object.values(state.days).reduce((a, d) => a + sum(d) + d.bonus, 0)
  const weekXp = Object.values(state.weeks).reduce((a, w) => a + sum(w), 0)
  return dayXp + weekXp + state.demoXp
}

export interface StreakInfo {
  current: number
  best: number
  grace: number
  comebacks: number
  graceDates: string[]
}

/**
 * Replayed from the log rather than stored, so undo and date changes can't corrupt it.
 * Missed days spend a grace day. Rest days neither extend nor break a streak.
 */
export function deriveStreak(state: GameState, today: string): StreakInfo {
  const active = Object.keys(state.days)
    .filter((k) => k <= today && isActive(state.days[k]))
    .sort()
  const result: StreakInfo = { current: 0, best: 0, grace: START_GRACE, comebacks: 0, graceDates: [] }
  if (!active.length) return result
  let broken = false
  for (let d = active[0]; d <= today; d = addDays(d, 1)) {
    const day = state.days[d]
    if (isActive(day)) {
      if (broken) {
        result.comebacks += 1
        broken = false
      }
      result.current += 1
      result.best = Math.max(result.best, result.current)
      if (result.current % 7 === 0) result.grace = Math.min(MAX_GRACE, result.grace + 1)
    } else if (day?.rest || d === today) {
      continue
    } else if (result.current > 0 && result.grace > 0) {
      result.grace -= 1
      result.graceDates.push(d)
    } else if (result.current > 0) {
      result.current = 0
      broken = true
    }
  }
  return result
}

export function badgeStats(state: GameState, today: string): BadgeStats {
  const days = Object.values(state.days)
  const completed = (id: string) => days.filter((d) => d.xp[id] !== undefined).length
  const streak = deriveStreak(state, today)
  return {
    activeDays: days.filter(isActive).length,
    bestStreak: streak.best,
    comebacks: streak.comebacks,
    chests: days.filter((d) => d.bonus > 0).length,
    footChecks: completed('foot-inspect'),
    breathing: completed('relax'),
    glucoseLogs: completed('glucose'),
    walks: completed('walk'),
    waterDays: completed('water'),
    strength: Object.values(state.weeks).filter((w) => w.xp['w-strength'] !== undefined).length,
  }
}

export const earnedBadges = (state: GameState, today: string) => {
  const stats = badgeStats(state, today)
  return BADGES.filter((b) => b.earned(stats)).map((b) => b.id)
}

export function toggleOutfit(state: GameState, id: string): GameState {
  const item = COSMETICS.find((c) => c.id === id)
  if (!item || levelProgress(totalXp(state)).current.level < item.level) return state
  const worn = state.outfit.includes(id)
  const others = state.outfit.filter((o) => COSMETICS.find((c) => c.id === o)?.slot !== item.slot)
  return { ...state, outfit: worn ? others : [...others, id] }
}
