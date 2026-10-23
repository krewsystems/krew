import { ArrowUpRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveAgent } from '@/components/agent/use-agent'
import { AiChatBox, type AiChatMessage, type AiChatModel } from '@/components/ui/ai-chat-box'
import { composeReply } from '@/lib/responder'
import { useKrew, useWorkspace } from '@/store/krew'
import { KrewMark } from './KrewLogo'

const REPLY_PREFIX = 'reply:'

/**
 * Floating quick-ask (the "Ask Addy" pattern from the references), built on skecher's AI chat box.
 * The model picker becomes an agent picker; every exchange is mirrored into Messages.
 */
export function AskKrew() {
  const [open, setOpen] = useState(false)
  const ws = useWorkspace()
  const sendMessage = useKrew((s) => s.sendMessage)
  const addAgentMessage = useKrew((s) => s.addAgentMessage)
  const ensureConversation = useKrew((s) => s.ensureConversation)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [agentId, setAgentId] = useState('manager')
  const panelRef = useRef<HTMLDivElement>(null)

  const models: AiChatModel[] = useMemo(
    () =>
      ws.hires
        .filter((h) => h.status === 'active')
        .map((h) => {
          const a = resolveAgent(h.agentId, ws.hires)
          return { id: a.id, name: a.displayName.replace(' Agent', ''), description: a.role, capability: a.role.split(' ')[0] }
        }),
    [ws.hires],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // The Messages page has its own composer.
  if (pathname.startsWith('/messages')) return null

  const handleSend = async (message: AiChatMessage, model?: AiChatModel) => {
    const target = model?.id ?? agentId
    const convo = target === 'manager' ? 'manager' : ensureConversation(target)
    sendMessage(convo, message.text)
    setSending(true)
    const reply = composeReply(ws, target, message.text)
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700))
    addAgentMessage(convo, reply.author, reply.text, reply.attachment)
    setMessages((m) => [...m, { id: `${REPLY_PREFIX}${reply.author}:${Date.now()}`, text: reply.text }])
    setSending(false)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Ask KREW"
            className="fixed bottom-[88px] right-4 z-50 hidden w-[380px] md:block lg:right-6"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="overflow-hidden rounded-[22px] border border-line bg-sunken shadow-[var(--shadow-floating)]">
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-[13px] text-ink-2">Ask your Krew</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      navigate(`/messages/${agentId === 'manager' ? 'manager' : agentId}`)
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] text-ink-2 hover:bg-panel hover:text-ink"
                  >
                    Open in Messages
                    <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-panel hover:text-ink">
                    <X className="size-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <AiChatBox
                className="h-[440px] max-h-none max-w-none rounded-none bg-sunken"
                models={models}
                selectedModelId={agentId}
                onSelectedModelChange={setAgentId}
                messages={messages}
                onMessagesChange={setMessages}
                onSend={handleSend}
                isSending={sending}
                actions={[]}
                labels={{ input: 'Ask about sales, customers, campaigns…', modelPicker: 'Choose an agent', empty: 'What do you need to know?' }}
                renderMessage={(m) => {
                  if (!m.id.startsWith(REPLY_PREFIX)) return <p className="whitespace-pre-wrap">{m.text}</p>
                  const author = m.id.slice(REPLY_PREFIX.length).split(':')[0]
                  const a = resolveAgent(author, ws.hires)
                  return (
                    <div>
                      <p className="mb-0.5 text-[12px] text-ink-3">{a.displayName}</p>
                      <p className="whitespace-pre-wrap text-ink">{m.text}</p>
                    </div>
                  )
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-6 right-4 z-50 hidden h-11 items-center gap-2 rounded-full bg-inverse pl-3 pr-4 text-[14px] text-ink-inverse shadow-[var(--shadow-floating)] ring-1 ring-[color-mix(in_oklab,var(--surface)_18%,transparent)] transition-transform hover:-translate-y-px active:translate-y-0 md:inline-flex lg:right-6"
      >
        <KrewMark size={18} className="text-ink-inverse" />
        {open ? 'Close' : 'Ask KREW'}
      </button>
    </>
  )
}
