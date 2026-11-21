import { useState } from 'react'
import { Award, BedDouble, Check, ChevronDown, Flame, Gift, Lock, Shield, Sparkles } from 'lucide-react'
import {
  careScore,
  chestStatus,
  CHEST_XP,
  deriveStreak,
  earnedBadges,
  isActive,
  isDone,
  MAX_GRACE,
  taskCount,
  totalXp,
  visibleTasks,
  weekDates,
  type GameState,
} from '../game/engine'
import { BADGES, COSMETICS, LEVELS, levelProgress } from '../game/rewards'
import { SLOT_INFO, SLOTS, slotForHour, TIER_LABEL, type Slot, type Task, type Tier } from '../game/tasks'
import type { Mood } from '../three/buddy'
import { BuddyStage } from './BuddyStage'
import { TaskCard } from './TaskCard'

interface Shared {
  state: GameState
  plan: Task[]
  today: string
  mood: Mood
  cheer: number
  bigCheer: boolean
  speech: string
  onOpen: (task: Task) => void
}

function LevelBar({ xp }: { xp: number }) {
  const p = levelProgress(xp)
  return (
    <div className="level-bar">
      <div className="level-row">
        <b>Level {p.current.level} · {p.current.name}</b>
        <span>{p.next ? `${p.intoLevel} / ${p.needed} XP` : `${xp} XP`}</span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(p.ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
        <div style={{ width: `${Math.max(3, p.ratio * 100)}%` }} />
      </div>
    </div>
  )
}

export function TodayScreen({ state, plan, today, mood, cheer, bigCheer, speech, onOpen, onRest }: Shared & { onRest: (rest: boolean) => void }) {
  const [slot, setSlot] = useState<Slot>(() => slotForHour(new Date().getHours()))
  const [showBonus, setShowBonus] = useState(false)
  const xp = totalXp(state)
  const level = levelProgress(xp).current.level
  const streak = deriveStreak(state, today)
  const chest = chestStatus(plan, state, today)
  const score = careScore(plan, state, today)
  const rest = !!state.days[today]?.rest
  const daily = visibleTasks(plan, state, today).filter((t) => t.period === 'day')
  const inSlot = daily.filter((t) => t.slot === slot)
  const byTier = (tier: Tier) => inSlot.filter((t) => t.tier === tier)
  const bonus = byTier('optional')

  const renderTasks = (tasks: Task[]) => tasks.map((t) => <TaskCard key={t.id} task={t} count={taskCount(state, t, today)} onOpen={() => onOpen(t)} />)

  return (
    <>
      <header className="top">
        <div>
          <small>Hi, {state.profile?.name}</small>
          <h1>Today’s missions</h1>
        </div>
        <div className="pills">
          <span className="pill streak" title="Day streak"><Flame size={17} /> {streak.current}</span>
          <span className="pill grace" title="Grace days"><Shield size={16} /> {streak.grace}</span>
        </div>
      </header>

      <section className="hero-card">
        <BuddyStage level={level} outfit={state.outfit} mood={mood} cheer={cheer} bigCheer={bigCheer} height={236} />
        <p className="speech" aria-live="polite">{speech}</p>
        <LevelBar xp={xp} />
      </section>

      <section className={`chest ${chest.open ? 'open' : ''}`}>
        <span className="chest-icon"><Gift size={24} /></span>
        <div>
          <b>{chest.open ? `Chest opened! +${CHEST_XP} XP` : 'Daily care chest'}</b>
          <div className="bar small"><div style={{ width: `${chest.needed ? (chest.done / chest.needed) * 100 : 0}%` }} /></div>
        </div>
        <span className="chest-count">{chest.done}/{chest.needed}</span>
      </section>

      <nav className="slot-tabs" aria-label="Time of day">
        {SLOTS.map((s) => {
          const tasks = daily.filter((t) => t.slot === s && t.tier !== 'optional')
          const finished = tasks.filter((t) => isDone(state, t, today)).length
          return (
            <button key={s} className={slot === s ? 'selected' : ''} aria-pressed={slot === s} onClick={() => setSlot(s)}>
              {SLOT_INFO[s].label}
              <small>{finished}/{tasks.length}</small>
            </button>
          )
        })}
      </nav>

      {(['essential', 'recommended'] as Tier[]).map((tier) => byTier(tier).length > 0 && (
        <section key={tier} className="task-group">
          <h2 className={tier}>{TIER_LABEL[tier]}</h2>
          {renderTasks(byTier(tier))}
        </section>
      ))}

      {bonus.length > 0 && (
        <section className="task-group">
          <button className="bonus-toggle" aria-expanded={showBonus} onClick={() => setShowBonus(!showBonus)}>
            <Sparkles size={17} /> {TIER_LABEL.optional} ({bonus.length})
            <ChevronDown size={18} className={showBonus ? 'flip' : ''} />
          </button>
          {showBonus && renderTasks(bonus)}
        </section>
      )}

      <div className="today-foot">
        <span>Today’s care score <b>{score}%</b></span>
        <button className="text-btn" onClick={() => onRest(!rest)}>
          <BedDouble size={17} /> {rest ? 'End rest day' : 'Not feeling well? Take a rest day'}
        </button>
      </div>
    </>
  )
}

export function JourneyScreen({ state, today }: { state: GameState; today: string }) {
  const xp = totalXp(state)
  const current = levelProgress(xp).current.level
  const streak = deriveStreak(state, today)
  const earned = new Set(earnedBadges(state, today))
  return (
    <>
      <header className="top"><div><small>{xp} XP earned</small><h1>Your journey</h1></div></header>
      <LevelBar xp={xp} />
      <div className="stat-row">
        <div><strong>{streak.current}</strong><span>Day streak</span></div>
        <div><strong>{streak.best}</strong><span>Best streak</span></div>
        <div><strong>{streak.grace}/{MAX_GRACE}</strong><span>Grace days</span></div>
      </div>
      <h2 className="section-title">Levels</h2>
      <ol className="path">
        {LEVELS.map((l) => {
          const status = l.level < current ? 'past' : l.level === current ? 'now' : 'locked'
          const cosmetic = COSMETICS.find((c) => c.id === l.cosmetic)
          return (
            <li key={l.level} className={status}>
              <span className="node">{status === 'past' ? <Check size={19} /> : status === 'locked' ? <Lock size={16} /> : l.level}</span>
              <div>
                <b>{l.name}</b>
                <small>{l.world}{cosmetic ? ` + ${cosmetic.name}` : ''}</small>
              </div>
              <span className="path-xp">{l.xp} XP</span>
            </li>
          )
        })}
      </ol>
      <h2 className="section-title">Badges <small>{earned.size}/{BADGES.length}</small></h2>
      <div className="badges">
        {BADGES.map((b) => (
          <div key={b.id} className={`badge ${earned.has(b.id) ? 'earned' : ''}`}>
            <span>{earned.has(b.id) ? <Award size={24} /> : <Lock size={18} />}</span>
            <b>{b.name}</b>
            <small>{b.hint}</small>
          </div>
        ))}
      </div>
    </>
  )
}

export function WeekScreen({ state, plan, today, onOpen }: Pick<Shared, 'state' | 'plan' | 'today' | 'onOpen'>) {
  const dates = weekDates(today)
  const streak = deriveStreak(state, today)
  const weekly = plan.filter((t) => t.period === 'week')
  const finished = weekly.filter((t) => isDone(state, t, today)).length
  const shownUp = dates.filter((d) => isActive(state.days[d])).length
  const walks = dates.filter((d) => state.days[d]?.xp.walk !== undefined).length
  const tiers: Tier[] = ['essential', 'recommended', 'optional']
  return (
    <>
      <header className="top"><div><small>{finished} of {weekly.length} quests done</small><h1>This week</h1></div></header>
      <div className="week-strip" aria-label="Days this week">
        {dates.map((d, i) => {
          const day = state.days[d]
          const status = isActive(day) ? 'done' : day?.rest ? 'rest' : streak.graceDates.includes(d) ? 'grace' : ''
          return (
            <div key={d} className={`${status} ${d === today ? 'today' : ''}`}>
              <small>{'MTWTFSS'[i]}</small>
              <span>{status === 'done' ? <Check size={17} /> : status === 'grace' ? <Shield size={15} /> : status === 'rest' ? <BedDouble size={15} /> : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="stat-row">
        <div><strong>{shownUp}</strong><span>Days you showed up</span></div>
        <div><strong>{walks}/5</strong><span>Activity days</span></div>
        <div><strong>{finished}</strong><span>Weekly quests</span></div>
      </div>
      {tiers.map((tier) => {
        const tasks = weekly.filter((t) => t.tier === tier)
        return tasks.length > 0 && (
          <section key={tier} className="task-group">
            <h2 className={tier}>{TIER_LABEL[tier]}</h2>
            {tasks.map((t) => <TaskCard key={t.id} task={t} count={taskCount(state, t, today)} onOpen={() => onOpen(t)} />)}
          </section>
        )
      })}
    </>
  )
}

interface BuddyProps extends Pick<Shared, 'state' | 'mood' | 'cheer' | 'bigCheer'> {
  demo: boolean
  onWear: (id: string) => void
  onEditPlan: () => void
  onReset: () => void
  onNextDay: () => void
  onDemoXp: () => void
}

export function BuddyScreen({ state, mood, cheer, bigCheer, demo, onWear, onEditPlan, onReset, onNextDay, onDemoXp }: BuddyProps) {
  const level = levelProgress(totalXp(state)).current.level
  return (
    <>
      <header className="top"><div><small>Level {level}</small><h1>Your buddy</h1></div></header>
      <section className="hero-card">
        <BuddyStage level={level} outfit={state.outfit} mood={mood} cheer={cheer} bigCheer={bigCheer} height={320} />
      </section>
      <h2 className="section-title">Wardrobe</h2>
      <div className="wardrobe">
        {COSMETICS.map((c) => {
          const unlocked = level >= c.level
          const worn = state.outfit.includes(c.id)
          return (
            <button key={c.id} className={worn ? 'selected' : ''} disabled={!unlocked} aria-pressed={worn} onClick={() => onWear(c.id)}>
              <b>{c.name}</b>
              <small>{unlocked ? (worn ? 'Wearing' : 'Tap to wear') : `Unlocks at level ${c.level}`}</small>
            </button>
          )
        })}
      </div>
      <h2 className="section-title">Settings</h2>
      <div className="settings">
        <button className="ghost wide" onClick={onEditPlan}>Edit my care plan</button>
        <button className="ghost wide danger" onClick={onReset}>Delete all my data</button>
      </div>
      {demo && (
        <div className="settings demo">
          <h2 className="section-title">Demo tools</h2>
          <button className="ghost wide" onClick={onNextDay}>Skip to next day</button>
          <button className="ghost wide" onClick={onDemoXp}>Add 500 XP</button>
        </div>
      )}
      <p className="fine disclaimer">Diabuddy is a concept prototype. It supports daily routines and doesn’t diagnose, treat or replace advice from your care team. In an emergency, call 999.</p>
    </>
  )
}
