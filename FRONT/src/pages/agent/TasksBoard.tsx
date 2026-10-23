import { BadgeCheck, CalendarDays, Plus, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { ConfirmMorph } from '@/components/arc/confirm-morph/confirm-morph'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Input } from '@/components/arc/input/input'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Select } from '@/components/arc/select/select'
import { Textarea } from '@/components/arc/textarea/textarea'
import { ahead, D, H } from '@/data/seed-utils'
import type { Task, TaskStatus } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', in_progress: 'In progress', waiting: 'Waiting for you', done: 'Done' }
const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'done']
const DUE = [
  { value: '4h', label: 'Today', minutes: 4 * H },
  { value: '1d', label: 'Tomorrow', minutes: D },
  { value: '3d', label: 'In 3 days', minutes: 3 * D },
  { value: '7d', label: 'Next week', minutes: 7 * D },
]

interface Draft {
  title: string
  description: string
  priority: Task['priority']
  status: TaskStatus
  due: string
}

function TaskDialog({ agentId, task, open, onOpenChange }: { agentId: string; task?: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const addTask = useKrew((s) => s.addTask)
  const updateTask = useKrew((s) => s.updateTask)
  const deleteTask = useKrew((s) => s.deleteTask)
  const [draft, setDraft] = useState<Draft>(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'normal',
    status: task?.status ?? 'todo',
    due: task ? 'keep' : '3d',
  }))
  const [error, setError] = useState<string>()

  const save = () => {
    if (!draft.title.trim()) {
      setError('Give the task a short title')
      return
    }
    const dueMinutes = DUE.find((d) => d.value === draft.due)?.minutes ?? 3 * D
    if (task) {
      updateTask(task.id, { title: draft.title.trim(), description: draft.description.trim(), priority: draft.priority, status: draft.status, dueAt: draft.due === 'keep' ? task.dueAt : ahead(dueMinutes) })
      toast('Task updated')
    } else {
      addTask({ agentId, title: draft.title.trim(), description: draft.description.trim(), priority: draft.priority, status: draft.status, dueAt: ahead(dueMinutes), createdBy: 'user' })
      toast('Task assigned', 'The agent will pick it up on its next run.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={task ? 'Edit task' : 'Assign a task'} description={task ? undefined : 'Describe the outcome you want. The agent plans the steps.'}>
        <div className="flex flex-col gap-4">
          <Input label="Title" value={draft.title} onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setError(undefined) }} error={error} placeholder="For example: compare October refunds by reason" autoFocus />
          <Textarea label="Details" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div>
            <p className="mb-1.5 text-[13px] text-ink-2">Priority</p>
            <SegmentedControl
              label="Priority"
              value={draft.priority}
              onValueChange={(v) => setDraft({ ...draft, priority: v as Task['priority'] })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Status" value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })} options={COLUMNS.map((c) => ({ value: c, label: STATUS_LABEL[c] }))} />
            <Select label="Due" value={draft.due} onValueChange={(v) => setDraft({ ...draft, due: v })} options={[...(task ? [{ value: 'keep', label: `Keep (${relativeTime(task.dueAt)})` }] : []), ...DUE]} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {task ? (
              <ConfirmMorph
                label="Delete task"
                prompt="Delete this task?"
                onConfirm={async () => {
                  await new Promise((r) => setTimeout(r, 400))
                  deleteTask(task.id)
                  onOpenChange(false)
                  toast('Task deleted')
                }}
              />
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={save}>{task ? 'Save task' : 'Assign task'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TasksBoard({ agentId }: { agentId: string }) {
  const ws = useWorkspace()
  const updateTask = useKrew((s) => s.updateTask)
  const tasks = ws.tasks.filter((t) => t.agentId === agentId)
  const [editing, setEditing] = useState<Task | undefined>()
  const [dialogKey, setDialogKey] = useState(0)
  const [open, setOpen] = useState(false)

  const openDialog = (task?: Task) => {
    setEditing(task)
    setDialogKey((k) => k + 1)
    setOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-2">
          {tasks.filter((t) => t.status !== 'done').length} open · {tasks.filter((t) => t.status === 'done').length} done
        </p>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="size-4" strokeWidth={1.75} /> Assign a task
        </Button>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col)
          return (
            <section key={col} className="flex w-[78vw] shrink-0 snap-start flex-col rounded-[var(--radius-panel)] bg-sunken p-2 sm:w-[300px] lg:w-auto" aria-label={STATUS_LABEL[col]}>
              <header className="flex items-center justify-between px-2 pb-2 pt-1">
                <span className="text-[13px] font-medium text-ink">{STATUS_LABEL[col]}</span>
                <span className="tabular rounded-full bg-panel px-2 text-[11.5px] leading-5 text-ink-3">{items.length}</span>
              </header>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <article key={t.id} className="group rounded-[12px] border border-line bg-panel p-3 shadow-[var(--shadow-resting)] transition-colors hover:border-line-strong">
                    <button type="button" onClick={() => openDialog(t)} className="w-full text-left">
                      <div className="flex items-start gap-2">
                        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', t.priority === 'high' ? 'bg-bad' : t.priority === 'normal' ? 'bg-ink-3' : 'bg-line-strong')} aria-label={`${t.priority} priority`} />
                        <p className={cn('text-[13.5px] leading-snug text-ink', t.status === 'done' && 'text-ink-3 line-through decoration-line-strong')}>{t.title}</p>
                      </div>
                      {t.description && <p className="mt-1.5 line-clamp-2 pl-3.5 text-[12.5px] text-ink-3">{t.description}</p>}
                    </button>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3.5 text-[11.5px] text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" strokeWidth={1.75} />
                        {t.status === 'done' ? 'Done' : `Due ${relativeTime(t.dueAt)}`}
                      </span>
                      {t.createdBy === 'user' && (
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3" strokeWidth={1.75} /> You asked
                        </span>
                      )}
                      {t.linkedApprovalId && (
                        <Link to={`/approvals/${t.linkedApprovalId}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                          <BadgeCheck className="size-3" strokeWidth={1.75} /> Approval
                        </Link>
                      )}
                    </div>
                    {col !== 'done' && col !== 'waiting' && (
                      <div className="mt-2.5 flex gap-1 pl-3 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        {col === 'todo' && (
                          <button type="button" onClick={() => updateTask(t.id, { status: 'in_progress' })} className="rounded-full px-2 py-0.5 text-[11.5px] text-ink-2 hover:bg-sunken hover:text-ink">
                            Start
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            updateTask(t.id, { status: 'done' })
                            toast('Task completed', t.title)
                          }}
                          className="rounded-full px-2 py-0.5 text-[11.5px] text-ink-2 hover:bg-sunken hover:text-ink"
                        >
                          Mark done
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {items.length === 0 && <p className="rounded-[12px] border border-dashed border-line-strong px-3 py-5 text-center text-[12px] text-ink-3">Nothing here</p>}
              </div>
            </section>
          )
        })}
      </div>
      <TaskDialog key={dialogKey} agentId={agentId} task={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
