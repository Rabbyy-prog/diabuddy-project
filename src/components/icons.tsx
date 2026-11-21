import { Activity, Droplet, Footprints, Moon, Pill, Scale, Stethoscope, Utensils, Wind, type LucideIcon } from 'lucide-react'
import type { Category } from '../game/tasks'

const ICONS: Record<Category, LucideIcon> = {
  Nutrition: Utensils,
  Exercise: Activity,
  Glucose: Droplet,
  Medication: Pill,
  'Foot care': Footprints,
  'Mental health': Wind,
  Sleep: Moon,
  Weight: Scale,
  'General health': Stethoscope,
}

export function CategoryIcon({ category, size = 21 }: { category: Category; size?: number }) {
  const Icon = ICONS[category]
  return <Icon size={size} aria-hidden="true" />
}
