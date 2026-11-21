import { describe, expect, it } from 'vitest'
import {
  addDays,
  careScore,
  chestStatus,
  CHEST_XP,
  deriveStreak,
  earnedBadges,
  emptyState,
  logTask,
  setRestDay,
  totalXp,
  undoTask,
  visibleTasks,
  weekKey,
  type GameState,
} from './engine'
import { glucoseAlert, symptomAlert } from './safety'
import { levelProgress } from './rewards'
import { buildPlan, type Profile, type Task } from './tasks'

const type2: Profile = {
  name: 'Test',
  condition: 'type2',
  monitorsGlucose: true,
  medsPerDay: 2,
  hypoRisk: true,
  footRisk: true,
  limitedMobility: false,
  weighIn: true,
}
const prediabetes: Profile = {
  ...type2,
  condition: 'prediabetes',
  monitorsGlucose: false,
  medsPerDay: 0,
  hypoRisk: false,
  footRisk: false,
}

const DAY = '2026-11-16' // A Monday
const plan = buildPlan(type2)
const task = (id: string, from: Task[] = plan) => from.find((t) => t.id === id)!
const start = (): GameState => ({ ...emptyState(), profile: type2 })
const showUp = (state: GameState, date: string) => logTask(state, plan, task('sleep'), date)

function showUpFor(state: GameState, first: string, days: number) {
  let next = state
  for (let i = 0; i < days; i += 1) next = showUp(next, addDays(first, i))
  return next
}

describe('personalised plan', () => {
  it('does not assign glucose or medication tasks unless prescribed', () => {
    const ids = buildPlan(prediabetes).map((t) => t.id)
    expect(ids).not.toContain('glucose')
    expect(ids.some((id) => id.startsWith('med-'))).toBe(false)
    expect(ids).not.toContain('w-med-supply')
  })

  it('makes prescribed care and at-risk foot checks essential', () => {
    for (const id of ['glucose', 'med-1', 'med-2', 'foot-inspect']) {
      expect(task(id).tier).toBe('essential')
    }
    expect(task('foot-inspect', buildPlan(prediabetes)).tier).toBe('optional')
  })

  it('adapts activity for limited mobility and warns about hypoglycaemia', () => {
    const adapted = buildPlan({ ...type2, limitedMobility: true })
    expect(task('walk', adapted).title).toBe('Gentle movement')
    expect(task('walk').safety).toMatch(/fast-acting sugar/)
  })
})

describe('XP and logging', () => {
  it('awards XP once and cannot be farmed by repeating a task', () => {
    let state = logTask(start(), plan, task('med-1'), DAY)
    state = logTask(state, plan, task('med-1'), DAY)
    expect(totalXp(state)).toBe(20)
  })

  it('awards counter XP only at the target', () => {
    let state = start()
    for (let i = 0; i < 5; i += 1) state = logTask(state, plan, task('water'), DAY)
    expect(totalXp(state)).toBe(0)
    state = logTask(state, plan, task('water'), DAY)
    expect(totalXp(state)).toBe(12)
  })

  it('gives the same XP for any glucose value', () => {
    const low = logTask(start(), plan, task('glucose'), DAY, { value: 3.2 })
    const high = logTask(start(), plan, task('glucose'), DAY, { value: 18 })
    const normal = logTask(start(), plan, task('glucose'), DAY, { value: 6 })
    expect(totalXp(low)).toBe(totalXp(normal))
    expect(totalXp(high)).toBe(totalXp(normal))
  })

  it('undo removes XP and the chest bonus', () => {
    let state = start()
    const needed = ['med-1', 'med-2', 'glucose', 'foot-inspect', 'sleep', 'relax', 'meal-lunch']
    for (const id of needed) state = logTask(state, plan, task(id), DAY)
    expect(chestStatus(plan, state, DAY).open).toBe(true)
    expect(state.days[DAY].bonus).toBe(CHEST_XP)
    state = undoTask(state, plan, task('med-1'), DAY)
    expect(state.days[DAY].bonus).toBe(0)
  })

  it('undo of a weekly task removes the record from the day it was logged', () => {
    let state = logTask(start(), plan, task('w-weight'), DAY, { kg: 70 })
    const later = addDays(DAY, 2)
    state = undoTask(state, plan, task('w-weight'), later)
    expect(state.days[DAY].entries).toHaveLength(0)
    expect(totalXp(state)).toBe(0)
  })

  it('undo that drops a level removes a cosmetic that is no longer unlocked', () => {
    let state: GameState = { ...start(), demoXp: 140, outfit: ['hibiscus'] }
    state = logTask(state, plan, task('med-1'), DAY)
    state = undoTask(state, plan, task('med-1'), DAY)
    expect(state.outfit).toEqual([])
  })

  it('needs every essential for the chest', () => {
    let state = start()
    for (const id of ['sleep', 'relax', 'meal-lunch', 'meal-dinner', 'walk']) {
      state = logTask(state, plan, task(id), DAY)
    }
    expect(chestStatus(plan, state, DAY).open).toBe(false)
  })

  it('weights essentials above habits and ignores optional tasks', () => {
    const essential = careScore(plan, logTask(start(), plan, task('med-1'), DAY), DAY)
    const habit = careScore(plan, logTask(start(), plan, task('sleep'), DAY), DAY)
    const optional = careScore(plan, logTask(start(), plan, task('label-check'), DAY), DAY)
    expect(essential).toBeGreaterThan(habit)
    expect(optional).toBe(0)
  })

  it('resets weekly tasks on Monday', () => {
    expect(weekKey('2026-11-22')).toBe(DAY)
    expect(weekKey('2026-11-23')).toBe('2026-11-23')
  })
})

describe('streaks never punish', () => {
  it('counts consecutive days', () => {
    expect(deriveStreak(showUpFor(start(), DAY, 4), addDays(DAY, 3)).current).toBe(4)
  })

  it('does not break before today is over', () => {
    expect(deriveStreak(showUpFor(start(), DAY, 3), addDays(DAY, 3)).current).toBe(3)
  })

  it('spends a grace day on a missed day', () => {
    let state = showUpFor(start(), DAY, 2)
    state = showUp(state, addDays(DAY, 3))
    const streak = deriveStreak(state, addDays(DAY, 3))
    expect(streak.current).toBe(3)
    expect(streak.grace).toBe(1)
  })

  it('keeps the best streak and records a comeback after a long break', () => {
    let state = showUpFor(start(), DAY, 5)
    state = showUp(state, addDays(DAY, 10))
    const streak = deriveStreak(state, addDays(DAY, 10))
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(5)
    expect(streak.comebacks).toBe(1)
    expect(earnedBadges(state, addDays(DAY, 10))).toContain('comeback')
  })

  it('rest days protect the streak without spending grace', () => {
    let state = showUpFor(start(), DAY, 2)
    state = setRestDay(state, plan, addDays(DAY, 2), true)
    state = showUp(state, addDays(DAY, 3))
    const streak = deriveStreak(state, addDays(DAY, 3))
    expect(streak.current).toBe(3)
    expect(streak.grace).toBe(2)
  })

  it('rest days hide exercise but keep medication', () => {
    const state = setRestDay(start(), plan, DAY, true)
    const ids = visibleTasks(plan, state, DAY).map((t) => t.id)
    expect(ids).not.toContain('walk')
    expect(ids).toContain('med-1')
  })

  it('earns a grace day every 7 days up to the cap', () => {
    const streak = deriveStreak(showUpFor(start(), DAY, 21), addDays(DAY, 20))
    expect(streak.grace).toBe(3)
  })
})

describe('levels', () => {
  it('maps XP to levels at the boundaries', () => {
    expect(levelProgress(149).current.level).toBe(1)
    expect(levelProgress(150).current.level).toBe(2)
    expect(levelProgress(99999).current.level).toBe(10)
    expect(levelProgress(99999).next).toBeNull()
  })
})

describe('safety alerts', () => {
  it('flags glucose at the thresholds', () => {
    expect(glucoseAlert(2.9)?.level).toBe('urgent')
    expect(glucoseAlert(3.8)?.level).toBe('caution')
    expect(glucoseAlert(3.9)).toBeNull()
    expect(glucoseAlert(16.6)).toBeNull()
    expect(glucoseAlert(16.7)?.title).toMatch(/high/)
  })

  it('escalates red-flag symptoms over milder ones', () => {
    expect(symptomAlert(['thirsty', 'chest'])?.level).toBe('urgent')
    expect(symptomAlert(['none'])).toBeNull()
  })
})
