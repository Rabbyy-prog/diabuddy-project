import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { buildPlan, type Profile } from '../game/tasks'
import { BuddyStage } from './BuddyStage'

const DEFAULT: Profile = {
  name: '',
  condition: 'type2',
  monitorsGlucose: false,
  medsPerDay: 0,
  hypoRisk: false,
  footRisk: false,
  limitedMobility: false,
  weighIn: true,
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

const STEP_SPEECH = [
  'Hello! I’m Buddy. What should I call you?',
  'Which one fits you today?',
  'What has your care team asked you to do?',
  'Anything I should be gentle about?',
  'Here’s your plan. Small steps, every day.',
]

export function Onboarding({ initial, onDone, onCancel }: { initial: Profile | null; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>(initial ?? DEFAULT)
  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))
  const plan = useMemo(() => buildPlan(profile), [profile])
  const daily = plan.filter((t) => t.period === 'day')
  const count = (tier: string) => daily.filter((t) => t.tier === tier).length
  const canContinue = step !== 0 || profile.name.trim().length > 0

  const next = () => {
    if (step < 4) setStep(step + 1)
    else onDone({ ...profile, name: profile.name.trim(), hypoRisk: profile.medsPerDay > 0 && profile.hypoRisk })
  }

  return (
    <main className="onboarding">
      <div className="onboard-top">
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft size={22} /></button>
        ) : onCancel ? (
          <button className="icon-btn" onClick={onCancel} aria-label="Cancel"><ArrowLeft size={22} /></button>
        ) : <span className="brand">diabuddy<em>.</em></span>}
        <div className="dots" aria-label={`Step ${step + 1} of 5`}>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
      </div>

      <BuddyStage level={1} outfit={[]} mood="happy" height={230} />
      <p className="speech">{STEP_SPEECH[step]}</p>

      <section className="onboard-body">
        {step === 0 && (
          <label className="field">
            <span>Your name</span>
            <input autoFocus value={profile.name} maxLength={24} placeholder="e.g. Aina" onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && canContinue && next()} />
          </label>
        )}

        {step === 1 && (
          <div className="choice-list">
            {([['prediabetes', 'Prediabetes', 'Build habits that lower your risk'], ['type2', 'Type 2 diabetes', 'Day-to-day support between clinic visits']] as const).map(([id, label, hint]) => (
              <button key={id} className={`choice ${profile.condition === id ? 'selected' : ''}`} aria-pressed={profile.condition === id} onClick={() => set({ condition: id })}>
                <b>{label}</b><small>{hint}</small>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <>
            <Toggle label="I was told to check my glucose" hint="Not everyone needs to test daily" checked={profile.monitorsGlucose} onChange={(v) => set({ monitorsGlucose: v })} />
            <div className="field">
              <span>Diabetes medication, times per day</span>
              <div className="segmented">
                {([0, 1, 2, 3] as const).map((n) => (
                  <button key={n} className={profile.medsPerDay === n ? 'selected' : ''} aria-pressed={profile.medsPerDay === n} onClick={() => set({ medsPerDay: n })}>{n === 0 ? 'None' : n}</button>
                ))}
              </div>
            </div>
            {profile.medsPerDay > 0 && (
              <Toggle label="I use insulin or a sulfonylurea" hint="e.g. gliclazide, glibenclamide. Adds low-sugar safety tips" checked={profile.hypoRisk} onChange={(v) => set({ hypoRisk: v })} />
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Toggle label="My feet need extra care" hint="Numbness, past ulcers or poor circulation" checked={profile.footRisk} onChange={(v) => set({ footRisk: v })} />
            <Toggle label="I have limits on activity" hint="Heart condition, joint pain, foot ulcer or mobility issues" checked={profile.limitedMobility} onChange={(v) => set({ limitedMobility: v })} />
            <Toggle label="Include a weekly weigh-in" hint="Turn off if tracking weight isn’t right for you" checked={profile.weighIn} onChange={(v) => set({ weighIn: v })} />
          </>
        )}

        {step === 4 && (
          <>
            <div className="plan-summary">
              <div><strong>{count('essential')}</strong><span>Care essentials</span></div>
              <div><strong>{count('recommended')}</strong><span>Healthy habits</span></div>
              <div><strong>{count('optional')}</strong><span>Bonus wellness</span></div>
            </div>
            <p className="fine">Spread across your day, a few at a time. Diabuddy supports your routine and doesn’t replace advice from your doctor. Your data stays on this device.</p>
          </>
        )}
      </section>

      <button className="primary wide" disabled={!canContinue} onClick={next}>
        {step === 4 ? (initial ? 'Save my plan' : 'Start my journey') : 'Continue'}
      </button>
    </main>
  )
}
