/**
 * Safety messages and thresholds. A clinical partner must review this file before
 * any patient use. Readings are in mmol/L, the unit used in Malaysia.
 */

export interface SafetyAlert {
  level: 'urgent' | 'caution'
  title: string
  body: string[]
}

export const GLUCOSE = { min: 1, max: 35, veryLow: 3.0, low: 3.9, veryHigh: 16.7 }

const EMERGENCY = 'Call 999 or go to the nearest emergency department'

export function glucoseAlert(value: number): SafetyAlert | null {
  if (value < GLUCOSE.low) {
    return {
      level: value < GLUCOSE.veryLow ? 'urgent' : 'caution',
      title: 'This reading is low',
      body: [
        'Follow your hypo plan now. If you do not have one, take 15 g of fast-acting sugar, such as 3 teaspoons of sugar in water, and recheck in 15 minutes.',
        `${EMERGENCY} if you feel confused, faint or cannot swallow. Someone with you should make the call.`,
        'Tell your care team about this low reading.',
      ],
    }
  }
  if (value >= GLUCOSE.veryHigh) {
    return {
      level: 'caution',
      title: 'This reading is high',
      body: [
        'Follow your care plan and contact your care team today.',
        `${EMERGENCY} if you are vomiting, have stomach pain, are breathing fast, or feel very drowsy or confused.`,
      ],
    }
  }
  return null
}

export const SYMPTOMS = [
  { id: 'none', label: 'Feeling fine' },
  { id: 'shaky', label: 'Shaky or sweaty' },
  { id: 'dizzy', label: 'Dizzy' },
  { id: 'thirsty', label: 'Very thirsty' },
  { id: 'vision', label: 'Blurred vision' },
  { id: 'numb', label: 'Numb or tingling feet' },
  { id: 'wound', label: 'Slow-healing wound' },
  { id: 'chest', label: 'Chest pain' },
  { id: 'breath', label: 'Trouble breathing' },
  { id: 'confused', label: 'Confused or faint' },
] as const

export function symptomAlert(selected: string[]): SafetyAlert | null {
  if (selected.some((s) => ['chest', 'breath', 'confused'].includes(s))) {
    return {
      level: 'urgent',
      title: 'Please get help now',
      body: [`${EMERGENCY}. Do not drive yourself.`],
    }
  }
  if (selected.includes('shaky') || selected.includes('dizzy')) {
    return {
      level: 'caution',
      title: 'This could be low blood sugar',
      body: [
        'If you have a meter, check your glucose now and follow your hypo plan.',
        `${EMERGENCY} if you get worse, feel confused or faint.`,
      ],
    }
  }
  if (selected.includes('wound')) return footAlert()
  if (selected.some((s) => s !== 'none')) {
    return {
      level: 'caution',
      title: 'Worth mentioning',
      body: ['Tell your care team if this continues or gets worse.'],
    }
  }
  return null
}

export function footAlert(): SafetyAlert {
  return {
    level: 'caution',
    title: 'Let’s get that looked at',
    body: [
      'Contact your clinic today about any wound, blister or redness. Foot problems can worsen quickly with diabetes.',
      'Keep weight off the area if you can, and avoid treating it yourself.',
      'Go to the emergency department if you see spreading redness, pus or black skin, or you have a fever.',
    ],
  }
}

export const MISSED_DOSE_ADVICE =
  'That’s okay, thanks for being honest. Please don’t double your next dose. Ask your pharmacist or doctor what to do if you’re unsure.'
