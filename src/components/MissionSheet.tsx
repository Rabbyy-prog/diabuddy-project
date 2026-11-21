import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Clock, Minus, Phone, Plus, X } from 'lucide-react'
import type { Entry } from '../game/engine'
import { footAlert, glucoseAlert, GLUCOSE, MISSED_DOSE_ADVICE, symptomAlert, SYMPTOMS, type SafetyAlert } from '../game/safety'
import type { Task } from '../game/tasks'
import { CategoryIcon } from './icons'

export interface LogOptions {
  quiet?: boolean
}

interface Props {
  task: Task
  count: number
  onLog: (data: Entry['data'], options?: LogOptions) => void
  onMissedDose: () => void
  onUndo: () => void
  onClose: () => void
}

const FOOT_ZONES = ['Tops of feet', 'Soles', 'Heels', 'Between toes', 'Toenails']
const GLUCOSE_TIMES = ['Fasting', 'Before meal', 'After meal', 'Bedtime']
const BREATH_CYCLES = 3

function SafetyCard({ alert, onClose }: { alert: SafetyAlert; onClose: () => void }) {
  return (
    <div className={`safety ${alert.level}`} role="alert">
      <h3><AlertTriangle size={22} /> {alert.title}</h3>
      {alert.body.map((line) => <p key={line}>{line}</p>)}
      <a className="call-btn" href="tel:999"><Phone size={18} /> Call 999</a>
      <button className="primary wide" onClick={onClose}>I understand</button>
    </div>
  )
}

function Breathe({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const total = BREATH_CYCLES * 10
  useEffect(() => {
    if (!running || elapsed >= total) return
    const id = window.setTimeout(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearTimeout(id)
  }, [running, elapsed, total])
  const inCycle = elapsed % 10
  const inhale = inCycle < 4
  const finished = elapsed >= total
  return (
    <div className="breathe">
      <div className={`breath-ring ${running && !finished ? (inhale ? 'in' : 'out') : ''}`}>
        <span aria-live="polite">{finished ? 'Well done' : !running ? 'Ready?' : inhale ? 'Breathe in' : 'Breathe out'}</span>
      </div>
      {!running ? (
        <button className="primary wide" onClick={() => setRunning(true)}>Start breathing</button>
      ) : (
        <button className="primary wide" onClick={onDone}>{finished ? 'Finish' : 'I’m done'}</button>
      )}
    </div>
  )
}

export function MissionSheet({ task, count, onLog, onMissedDose, onUndo, onClose }: Props) {
  const [alert, setAlert] = useState<SafetyAlert | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [glucose, setGlucose] = useState('')
  const [glucoseTime, setGlucoseTime] = useState(GLUCOSE_TIMES[0])
  const [hours, setHours] = useState(7)
  const [quality, setQuality] = useState('Okay')
  const [zones, setZones] = useState<string[]>([])
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [weight, setWeight] = useState('')
  const done = count >= task.target

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const finish = (data: Entry['data'] = {}, safety: SafetyAlert | null = null) => {
    onLog(data, { quiet: !!safety })
    if (safety) setAlert(safety)
    else onClose()
  }

  const glucoseValue = Number(glucose)
  const glucoseValid = glucose !== '' && glucoseValue >= GLUCOSE.min && glucoseValue <= GLUCOSE.max
  const weightValue = Number(weight)
  const weightValid = weight !== '' && weightValue >= 20 && weightValue <= 300

  const toggleSymptom = (id: string) => {
    if (id === 'none') return setSymptoms(['none'])
    setSymptoms((list) => {
      const rest = list.filter((s) => s !== 'none')
      return rest.includes(id) ? rest.filter((s) => s !== id) : [...rest, id]
    })
  }

  const body = () => {
    if (alert) return <SafetyCard alert={alert} onClose={onClose} />
    if (note) return <><p className="note">{note}</p><button className="primary wide" onClick={onClose}>Okay</button></>
    if (done && task.kind !== 'counter') {
      return (
        <div className="done-state">
          <p><Check size={20} /> Done. Nice work.</p>
          <button className="ghost wide" onClick={() => { onUndo(); onClose() }}>Undo this</button>
        </div>
      )
    }
    switch (task.kind) {
      case 'medication':
        return (
          <>
            <p className="fine">Only log what you actually took. Please don’t change your dose to earn rewards.</p>
            <button className="primary wide" onClick={() => finish({ taken: true })}>I took it as prescribed</button>
            <button className="ghost wide" onClick={() => { onMissedDose(); setNote(MISSED_DOSE_ADVICE) }}>I missed this dose</button>
          </>
        )
      case 'glucose':
        return (
          <>
            <label className="field">
              <span>Reading (mmol/L)</span>
              <input inputMode="decimal" type="number" step="0.1" min={GLUCOSE.min} max={GLUCOSE.max} value={glucose} placeholder="e.g. 6.2" onChange={(e) => setGlucose(e.target.value)} />
            </label>
            {glucose !== '' && !glucoseValid && <p className="field-error">Enter a value between {GLUCOSE.min} and {GLUCOSE.max}.</p>}
            <div className="chips">
              {GLUCOSE_TIMES.map((t) => <button key={t} className={glucoseTime === t ? 'selected' : ''} aria-pressed={glucoseTime === t} onClick={() => setGlucoseTime(t)}>{t}</button>)}
            </div>
            <p className="fine">You earn the same XP for any number. Every honest reading helps.</p>
            <button className="primary wide" disabled={!glucoseValid} onClick={() => finish({ value: glucoseValue, timing: glucoseTime }, glucoseAlert(glucoseValue))}>Save reading</button>
          </>
        )
      case 'meal':
        return (
          <>
            <p className="fine">Did your plate look like <b>suku-suku separuh</b>? A quarter protein, a quarter carbs, half vegetables and fruit.</p>
            <div className="choice-list">
              {['Yes', 'Partly', 'Not this time'].map((answer) => <button key={answer} className="choice center" onClick={() => finish({ plate: answer })}>{answer}</button>)}
            </div>
          </>
        )
      case 'counter':
        return (
          <>
            <div className="counter">
              <button className="round" onClick={onUndo} disabled={count === 0} aria-label={`Remove one from ${task.unit}`}><Minus /></button>
              <div><strong>{count}</strong><span>of {task.target} {task.unit}</span></div>
              <button className="round primary" onClick={() => onLog({})} disabled={done} aria-label={`Add one to ${task.unit}`}><Plus /></button>
            </div>
            <button className="ghost wide" onClick={onClose}>{done ? 'Done' : 'Save for now'}</button>
          </>
        )
      case 'sleep':
        return (
          <>
            <div className="counter">
              <button className="round" onClick={() => setHours((h) => Math.max(0, h - 0.5))} aria-label="Fewer hours"><Minus /></button>
              <div><strong>{hours}</strong><span>hours</span></div>
              <button className="round" onClick={() => setHours((h) => Math.min(14, h + 0.5))} aria-label="More hours"><Plus /></button>
            </div>
            <div className="chips">
              {['Poor', 'Okay', 'Great'].map((q) => <button key={q} className={quality === q ? 'selected' : ''} aria-pressed={quality === q} onClick={() => setQuality(q)}>{q}</button>)}
            </div>
            <button className="primary wide" onClick={() => finish({ hours, quality })}>Save sleep</button>
          </>
        )
      case 'breathe':
        return <Breathe onDone={() => finish({ cycles: BREATH_CYCLES })} />
      case 'foot':
        return (
          <>
            <p className="fine">Check both feet. Use a mirror or ask someone to help if needed.</p>
            <div className="chips">
              {FOOT_ZONES.map((z) => <button key={z} className={zones.includes(z) ? 'selected' : ''} aria-pressed={zones.includes(z)} onClick={() => setZones((l) => (l.includes(z) ? l.filter((x) => x !== z) : [...l, z]))}>{z}</button>)}
            </div>
            <button className="primary wide" disabled={zones.length < FOOT_ZONES.length} onClick={() => finish({ found: false })}>All clear</button>
            <button className="ghost wide" onClick={() => finish({ found: true }, footAlert())}>I found a wound, blister or redness</button>
          </>
        )
      case 'symptom':
        return (
          <>
            <div className="chips">
              {SYMPTOMS.map((s) => <button key={s.id} className={symptoms.includes(s.id) ? 'selected' : ''} aria-pressed={symptoms.includes(s.id)} onClick={() => toggleSymptom(s.id)}>{s.label}</button>)}
            </div>
            <button className="primary wide" disabled={!symptoms.length} onClick={() => finish({ symptoms }, symptomAlert(symptoms))}>Save</button>
          </>
        )
      case 'weight':
        return (
          <>
            <label className="field">
              <span>Weight (kg)</span>
              <input inputMode="decimal" type="number" step="0.1" value={weight} placeholder="e.g. 72.5" onChange={(e) => setWeight(e.target.value)} />
            </label>
            {weight !== '' && !weightValid && <p className="field-error">Enter a weight between 20 and 300 kg.</p>}
            <button className="primary wide" disabled={!weightValid} onClick={() => finish({ kg: weightValue })}>Save weight</button>
          </>
        )
      default:
        return <button className="primary wide" onClick={() => finish()}>Mark as done</button>
    }
  }

  return (
    <div className="sheet-backdrop" onClick={alert ? undefined : onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={task.title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className={`task-icon ${task.tier}`}><CategoryIcon category={task.category} /></span>
          <div>
            <h2>{task.title}</h2>
            <small><Clock size={13} /> {task.minutes} · +{task.xp} XP</small>
          </div>
          {!alert && <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={22} /></button>}
        </div>
        {!alert && <p className="sheet-detail">{task.detail}</p>}
        {!alert && task.safety && !done && <p className="safety-note"><AlertTriangle size={17} /> {task.safety}</p>}
        <div className="sheet-body">{body()}</div>
      </div>
    </div>
  )
}
