import { Check, ChevronRight } from 'lucide-react'
import type { Task } from '../game/tasks'
import { CategoryIcon } from './icons'

export function TaskCard({ task, count, onOpen }: { task: Task; count: number; onOpen: () => void }) {
  const done = count >= task.target
  return (
    <button className={`task ${done ? 'done' : ''}`} onClick={onOpen}>
      <span className={`task-icon ${task.tier}`}>{done ? <Check size={21} /> : <CategoryIcon category={task.category} />}</span>
      <span className="task-text">
        <b>{task.title}</b>
        <small>
          {task.target > 1 ? `${count}/${task.target} ${task.unit} · ` : ''}{task.minutes}
        </small>
      </span>
      <span className="task-xp">{done ? 'Done' : `+${task.xp}`}</span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}
