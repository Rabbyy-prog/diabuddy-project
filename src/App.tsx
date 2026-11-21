import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { CalendarDays, House, Map as MapIcon, Smile } from 'lucide-react'
import { MissionSheet, type LogOptions } from './components/MissionSheet'
import { Onboarding } from './components/Onboarding'
import { BuddyScreen, JourneyScreen, TodayScreen, WeekScreen } from './components/Screens'
import {
  addNote,
  chestStatus,
  CHEST_XP,
  clearState,
  deriveStreak,
  earnedBadges,
  emptyState,
  loadState,
  logTask,
  saveState,
  setRestDay,
  taskCount,
  todayKey,
  toggleOutfit,
  totalXp,
  undoTask,
  type Entry,
  type GameState,
} from './game/engine'
import { BADGES, COSMETICS, levelProgress, type Level } from './game/rewards'
import { buildPlan, type Profile, type Task } from './game/tasks'
import type { Mood } from './three/buddy'

type Tab = 'today' | 'journey' | 'week' | 'buddy'

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'today', label: 'Today', Icon: House },
  { id: 'journey', label: 'Journey', Icon: MapIcon },
  { id: 'week', label: 'Week', Icon: CalendarDays },
  { id: 'buddy', label: 'Buddy', Icon: Smile },
]

const PRAISE = ['You showed up. That counts.', 'Small win! I’m proud of you.', 'One step at a time.', 'That’s care in action.', 'Nice. Your island is growing.']
const DEMO = new URLSearchParams(window.location.search).has('demo')

function openingLine(state: GameState, today: string) {
  const streak = deriveStreak(state, today)
  if (state.days[today]?.rest) return 'Rest is care too. Your streak is safe.'
  if (streak.comebacks > 0 && streak.current === 1) return 'Welcome back. One step today?'
  if (streak.current >= 2) return `${streak.current} days together. Shall we check in?`
  return 'One small step today. Shall we check in together?'
}

export default function App() {
  const [state, setState] = useState<GameState>(loadState)
  const [tab, setTab] = useState<Tab>('today')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [mood, setMood] = useState<Mood>('happy')
  const [cheer, setCheer] = useState(0)
  const [bigCheer, setBigCheer] = useState(false)
  const [speech, setSpeech] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<Level | null>(null)
  const moodTimer = useRef<number>(undefined)
  const toastTimer = useRef<number>(undefined)

  const [, refreshClock] = useReducer((n: number) => n + 1, 0)

  useEffect(() => saveState(state), [state])

  // Keeps "today" correct when the app is left open or resumed after midnight.
  useEffect(() => {
    const id = window.setInterval(refreshClock, 60_000)
    document.addEventListener('visibilitychange', refreshClock)
    window.addEventListener('focus', refreshClock)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', refreshClock)
      window.removeEventListener('focus', refreshClock)
    }
  }, [])

  const plan = useMemo(() => (state.profile ? buildPlan(state.profile) : []), [state.profile])
  const today = todayKey(state)
  const openTask = plan.find((t) => t.id === openId) ?? null

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const setTimedMood = useCallback((next: Mood, ms: number) => {
    setMood(next)
    window.clearTimeout(moodTimer.current)
    moodTimer.current = window.setTimeout(() => setMood('happy'), ms)
  }, [])

  /** Applies a change and announces any XP, level, badge or chest it earned. */
  const applyProgress = useCallback((next: GameState, quiet = false) => {
    const beforeXp = totalXp(state)
    const afterXp = totalXp(next)
    const beforeLevel = levelProgress(beforeXp).current
    const afterLevel = levelProgress(afterXp).current
    const beforeBadges = new Set(earnedBadges(state, today))
    const newBadge = BADGES.find((b) => earnedBadges(next, today).includes(b.id) && !beforeBadges.has(b.id))
    const chestOpened = !chestStatus(plan, state, today).open && chestStatus(plan, next, today).open
    const leveled = afterLevel.level > beforeLevel.level

    let result = next
    if (leveled && afterLevel.cosmetic) {
      const item = COSMETICS.find((c) => c.id === afterLevel.cosmetic)
      if (item) {
        const others = next.outfit.filter((o) => COSMETICS.find((c) => c.id === o)?.slot !== item.slot)
        result = { ...next, outfit: [...others, item.id] }
      }
    }
    setState(result)

    if (quiet) {
      setTimedMood('concerned', 9000)
      setSpeech('I’m here with you. Let’s look after this first.')
      if (leveled) setLevelUp(afterLevel)
      return
    }
    if (afterXp > beforeXp) {
      setBigCheer(leveled || chestOpened)
      setCheer((c) => c + 1)
      setTimedMood('celebrate', 2200)
      setSpeech(PRAISE[Math.floor(Math.random() * PRAISE.length)])
      const parts = [`+${afterXp - beforeXp - (chestOpened ? CHEST_XP : 0)} XP`]
      if (chestOpened) parts.push(`chest +${CHEST_XP}`)
      if (newBadge) parts.push(`badge: ${newBadge.name}`)
      showToast(parts.join(' · '))
    } else if (newBadge) {
      showToast(`Badge: ${newBadge.name}`)
    }
    if (leveled) setLevelUp(afterLevel)
  }, [plan, setTimedMood, showToast, state, today])

  const log = (task: Task, data: Entry['data'], options?: LogOptions) => {
    applyProgress(logTask(state, plan, task, today, data), options?.quiet)
  }

  const finishProfile = (profile: Profile) => {
    setState((s) => ({ ...s, profile }))
    setEditing(false)
  }

  const reset = () => {
    if (!window.confirm('Delete all your Diabuddy data from this device? This can’t be undone.')) return
    clearState()
    setState(emptyState())
    setTab('today')
    setSpeech(null)
  }

  if (!state.profile || editing) {
    return <Onboarding initial={state.profile} onDone={finishProfile} onCancel={editing ? () => setEditing(false) : undefined} />
  }

  const shared = { state, plan, today, mood, cheer, bigCheer, speech: speech ?? openingLine(state, today), onOpen: (t: Task) => setOpenId(t.id) }
  const reward = levelUp ? COSMETICS.find((c) => c.id === levelUp.cosmetic) : undefined

  return (
    <div className="app">
      <main className="screen">
        {tab === 'today' && (
          <TodayScreen
            {...shared}
            onRest={(rest) => {
              setState(setRestDay(state, plan, today, rest))
              setSpeech(rest ? 'Rest is care too. Your streak is safe. Keep up your medicines.' : 'Good to see you up and about.')
            }}
          />
        )}
        {tab === 'journey' && <JourneyScreen state={state} today={today} />}
        {tab === 'week' && <WeekScreen state={state} plan={plan} today={today} onOpen={shared.onOpen} />}
        {tab === 'buddy' && (
          <BuddyScreen
            state={state}
            mood={mood}
            cheer={cheer}
            bigCheer={bigCheer}
            demo={DEMO}
            onWear={(id) => setState(toggleOutfit(state, id))}
            onEditPlan={() => setEditing(true)}
            onReset={reset}
            onNextDay={() => {
              setState({ ...state, dayOffset: state.dayOffset + 1 })
              setSpeech(null)
              showToast('Moved to the next day')
            }}
            onDemoXp={() => applyProgress({ ...state, demoXp: state.demoXp + 500 })}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'selected' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon size={23} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}

      {openTask && (
        <MissionSheet
          key={openTask.id}
          task={openTask}
          count={taskCount(state, openTask, today)}
          onLog={(data, options) => log(openTask, data, options)}
          onMissedDose={() => setState(addNote(state, openTask.id, today, { missed: true }))}
          onUndo={() => setState(undoTask(state, plan, openTask, today))}
          onClose={() => setOpenId(null)}
        />
      )}

      {levelUp && (
        <div className="sheet-backdrop center">
          <div className="levelup" role="dialog" aria-modal="true" aria-label={`Level ${levelUp.level} reached`}>
            <small>LEVEL UP</small>
            <strong>{levelUp.level}</strong>
            <h2>{levelUp.name}</h2>
            <p>New on your island: <b>{levelUp.world}</b>{reward ? <> and Buddy is wearing a <b>{reward.name}</b></> : null}.</p>
            <button className="primary wide" onClick={() => { setLevelUp(null); setTab('today') }}>See my island</button>
          </div>
        </div>
      )}
    </div>
  )
}
