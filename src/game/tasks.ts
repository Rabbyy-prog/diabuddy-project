export type Tier = 'essential' | 'recommended' | 'optional'
export type Slot = 'morning' | 'afternoon' | 'evening' | 'bedtime'
export type Period = 'day' | 'week'
export type Category =
  | 'Nutrition'
  | 'Exercise'
  | 'Glucose'
  | 'Medication'
  | 'Foot care'
  | 'Mental health'
  | 'Sleep'
  | 'Weight'
  | 'General health'
export type Interaction =
  | 'check'
  | 'meal'
  | 'glucose'
  | 'counter'
  | 'sleep'
  | 'breathe'
  | 'foot'
  | 'symptom'
  | 'weight'
  | 'medication'

export interface Profile {
  name: string
  condition: 'prediabetes' | 'type2'
  monitorsGlucose: boolean
  medsPerDay: 0 | 1 | 2 | 3
  /** Uses insulin or a sulfonylurea, so exercise carries a hypoglycaemia risk. */
  hypoRisk: boolean
  footRisk: boolean
  limitedMobility: boolean
  weighIn: boolean
}

export interface Task {
  id: string
  title: string
  detail: string
  minutes: string
  category: Category
  tier: Tier
  period: Period
  slot?: Slot
  kind: Interaction
  /** Times to log before the task counts as complete. */
  target: number
  unit?: string
  xp: number
  safety?: string
}

export const XP_BY_TIER: Record<Period, Record<Tier, number>> = {
  day: { essential: 20, recommended: 12, optional: 6 },
  week: { essential: 40, recommended: 30, optional: 15 },
}

export const TIER_LABEL: Record<Tier, string> = {
  essential: 'Care essentials',
  recommended: 'Healthy habits',
  optional: 'Bonus wellness',
}

export const SLOT_INFO: Record<Slot, { label: string; hours: string }> = {
  morning: { label: 'Morning', hours: '7–9 AM' },
  afternoon: { label: 'Afternoon', hours: '12–2 PM' },
  evening: { label: 'Evening', hours: '5–8 PM' },
  bedtime: { label: 'Bedtime', hours: '9–11 PM' },
}

export const SLOTS: Slot[] = ['morning', 'afternoon', 'evening', 'bedtime']

export function slotForHour(hour: number): Slot {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'bedtime'
}

type Draft = Omit<Task, 'xp' | 'target' | 'period'> & { target?: number }

const HYPO_NOTE =
  'You use insulin or a sulfonylurea: carry fast-acting sugar, and follow your care team’s advice on checking glucose around exercise.'

function medicationTasks(profile: Profile): Draft[] {
  const slots: Slot[][] = [[], ['morning'], ['morning', 'evening'], ['morning', 'afternoon', 'evening']]
  const doses = slots[profile.medsPerDay]
  return doses.map((slot, index) => ({
    id: `med-${index + 1}`,
    title: doses.length > 1 ? `Medication, dose ${index + 1}` : 'Take your medication',
    detail: 'Take it the way your doctor or pharmacist prescribed.',
    minutes: '1–3 min',
    category: 'Medication',
    tier: 'essential',
    slot,
    kind: 'medication',
  }))
}

function dailyDrafts(p: Profile): Draft[] {
  const moveNote = p.hypoRisk ? HYPO_NOTE : undefined
  const tasks: Draft[] = [
    ...medicationTasks(p),
    { id: 'sleep', title: 'Sleep check-in', detail: 'How long and how well did you sleep?', minutes: '1–2 min', category: 'Sleep', tier: 'recommended', slot: 'morning', kind: 'sleep' },
    { id: 'meal-breakfast', title: 'Log breakfast', detail: 'A quick note of what you ate.', minutes: '2–5 min', category: 'Nutrition', tier: 'recommended', slot: 'morning', kind: 'meal' },
    { id: 'meal-plan', title: 'Plan today’s meals', detail: 'Think through meals and carbohydrate portions.', minutes: '5–10 min', category: 'Nutrition', tier: 'recommended', slot: 'morning', kind: 'check' },
    { id: 'meal-lunch', title: 'Log lunch', detail: 'Include a quick portion review.', minutes: '2–5 min', category: 'Nutrition', tier: 'recommended', slot: 'afternoon', kind: 'meal' },
    { id: 'water', title: 'Track your water', detail: 'Tap once per glass. If you have a fluid limit, follow your doctor’s advice instead.', minutes: '1–2 min', category: 'Nutrition', tier: 'recommended', slot: 'afternoon', kind: 'counter', target: 6, unit: 'glasses' },
    { id: 'move-break', title: 'Movement breaks', detail: 'Stand or stroll for 2–5 minutes every 30–60 minutes of sitting.', minutes: '2–5 min', category: 'Exercise', tier: 'recommended', slot: 'afternoon', kind: 'counter', target: 3, unit: 'breaks', safety: moveNote },
    { id: 'label-check', title: 'Check a food label', detail: 'Compare sugar and carbohydrate when buying packaged food.', minutes: '1–3 min', category: 'Nutrition', tier: 'optional', slot: 'afternoon', kind: 'check' },
    {
      id: 'walk',
      title: p.limitedMobility ? 'Gentle movement' : 'Brisk walk',
      detail: p.limitedMobility
        ? 'Move in a way that is comfortable and agreed with your care team. Aim for 5 days a week.'
        : '30 minutes of brisk walking or similar activity. Aim for 5 days a week.',
      minutes: p.limitedMobility ? '10–15 min' : '30 min',
      category: 'Exercise',
      tier: 'recommended',
      slot: 'evening',
      kind: 'check',
      safety: moveNote,
    },
    { id: 'meal-dinner', title: 'Log dinner', detail: 'A quick note of what you ate.', minutes: '2–5 min', category: 'Nutrition', tier: 'recommended', slot: 'evening', kind: 'meal' },
    { id: 'record-steps', title: 'Record your activity', detail: 'Note your steps or exercise for today.', minutes: '1–2 min', category: 'Exercise', tier: 'optional', slot: 'evening', kind: 'check' },
    { id: 'foot-inspect', title: 'Foot check', detail: 'Look for wounds, blisters or redness.', minutes: '2–3 min', category: 'Foot care', tier: p.footRisk ? 'essential' : 'optional', slot: 'bedtime', kind: 'foot' },
    { id: 'foot-care', title: 'Wash, dry, moisturise', detail: 'Dry between the toes. Keep moisturiser off that area.', minutes: '3–5 min', category: 'Foot care', tier: p.footRisk ? 'recommended' : 'optional', slot: 'bedtime', kind: 'check' },
    { id: 'relax', title: 'Breathe with Buddy', detail: 'A short, calm breathing session.', minutes: '5–10 min', category: 'Mental health', tier: 'recommended', slot: 'bedtime', kind: 'breathe' },
    { id: 'symptoms', title: 'How is your body?', detail: 'Record any symptoms or health concerns.', minutes: '1–2 min', category: 'General health', tier: 'optional', slot: 'bedtime', kind: 'symptom' },
  ]
  if (p.monitorsGlucose) {
    tasks.push({ id: 'glucose', title: 'Check and record glucose', detail: 'Test as prescribed, then log the reading.', minutes: '2–4 min', category: 'Glucose', tier: 'essential', slot: 'morning', kind: 'glucose' })
  }
  if (p.medsPerDay > 0) {
    tasks.push({ id: 'med-effects', title: 'Note any side effects', detail: 'Only if you noticed something after your medication.', minutes: '1–2 min', category: 'Medication', tier: 'optional', slot: 'bedtime', kind: 'check' })
  }
  return tasks
}

function weeklyDrafts(p: Profile): Draft[] {
  const tasks: Draft[] = [
    { id: 'w-meal-plan', title: 'Prepare a weekly meal plan', detail: 'Sketch out the week’s meals.', minutes: '20–30 min', category: 'Nutrition', tier: 'recommended', kind: 'check' },
    { id: 'w-grocery', title: 'Shop for healthy foods', detail: 'Use your meal plan as your list.', minutes: '30–60 min', category: 'Nutrition', tier: 'recommended', kind: 'check' },
    { id: 'w-food-review', title: 'Review your food diary', detail: 'Spot one pattern you would like to change.', minutes: '10–15 min', category: 'Nutrition', tier: 'optional', kind: 'check' },
    {
      id: 'w-strength',
      title: p.limitedMobility ? 'Seated strength session' : 'Resistance training',
      detail: p.limitedMobility ? 'Chair-based moves agreed with your care team. Aim for 2 this week.' : 'Bands, weights or bodyweight. Aim for 2–3 this week.',
      minutes: '20–30 min',
      category: 'Exercise',
      tier: 'recommended',
      kind: 'counter',
      target: 2,
      unit: 'sessions',
      safety: p.hypoRisk ? HYPO_NOTE : undefined,
    },
    { id: 'w-activity-review', title: 'Review steps and exercise', detail: 'See how your week of movement went.', minutes: '5–10 min', category: 'Exercise', tier: 'optional', kind: 'check' },
    { id: 'w-stress', title: 'Reflect on stress', detail: 'What made self-care harder this week?', minutes: '10–15 min', category: 'Mental health', tier: 'recommended', kind: 'check' },
    { id: 'w-sleep', title: 'Review sleep patterns', detail: 'Notice what helped you rest.', minutes: '5–10 min', category: 'Sleep', tier: 'optional', kind: 'check' },
    { id: 'w-goals', title: 'Set next week’s goals', detail: 'Pick one or two small, doable goals.', minutes: '10–15 min', category: 'General health', tier: 'recommended', kind: 'check' },
  ]
  if (p.weighIn) {
    tasks.push({ id: 'w-weight', title: 'Weekly weigh-in', detail: 'Same time of day, same scale.', minutes: '2–3 min', category: 'Weight', tier: 'recommended', kind: 'weight' })
  }
  if (p.monitorsGlucose) {
    tasks.push({ id: 'w-glucose', title: 'Review glucose trends', detail: 'Note anything to raise with your care team.', minutes: '10–15 min', category: 'Glucose', tier: 'recommended', kind: 'check' })
  }
  if (p.medsPerDay > 0) {
    tasks.push({ id: 'w-med-supply', title: 'Check medication supply', detail: 'Arrange a refill before you run low.', minutes: '5 min', category: 'Medication', tier: 'essential', kind: 'check' })
    tasks.push({ id: 'w-pill-box', title: 'Fill your pill organiser', detail: 'If you use one.', minutes: '5–10 min', category: 'Medication', tier: 'optional', kind: 'check' })
  }
  return tasks
}

export function buildPlan(profile: Profile): Task[] {
  const finish = (period: Period) => (draft: Draft): Task => ({
    ...draft,
    period,
    target: draft.target ?? 1,
    xp: XP_BY_TIER[period][draft.tier],
  })
  return [...dailyDrafts(profile).map(finish('day')), ...weeklyDrafts(profile).map(finish('week'))]
}
