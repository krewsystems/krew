import { getAgent } from '@/data/agents'
import type { MessageAttachment, WorkspaceData } from '@/data/types'
import { money } from './format'

export interface AgentReply {
  author: string
  text: string
  attachment?: MessageAttachment
  phases: string[]
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w))

/**
 * Mock conversational layer. Replaced by Hermes Agent later; the contract is
 * (workspace, agent, message) → reply with optional rich attachment.
 */
export function composeReply(ws: WorkspaceData, agentId: string, input: string, contextPostId?: string): AgentReply {
  const text = input.toLowerCase()
  const agent = getAgent(agentId)
  const pending = ws.approvals.filter((a) => a.status === 'pending')
  const post = contextPostId ? ws.posts.find((p) => p.id === contextPostId) : undefined
  const latestReport = ws.reports.filter((r) => r.agentId === agentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (post) {
    const metrics = post.embed?.kind === 'insight' ? post.embed.metrics : undefined
    return {
      author: agentId,
      phases: ['Re-reading the update', 'Checking the latest data', 'Writing'],
      text: `About “${post.title}”: ${post.details?.[0] ?? post.body.split('. ')[0]}. ${
        post.agentId === 'luna'
          ? 'Since I posted, 4 more customers on the same route have reached out. I’m watching hourly and will tell Ivy if it keeps rising.'
          : 'Nothing has changed materially since I posted. I can dig into any part of it for you.'
      }`,
      attachment: metrics ? { kind: 'metrics', title: post.embed?.kind === 'insight' ? post.embed.headline : post.title, metrics } : undefined,
    }
  }

  if (has(text, 'approve', 'approval', 'pending', 'decision', 'waiting')) {
    const mine = pending.find((a) => a.agentId === agentId) ?? pending[0]
    if (mine) {
      return {
        author: agentId,
        phases: ['Checking approvals'],
        text: pending.length === 1 ? 'One decision is waiting for you:' : `${pending.length} decisions are waiting. This one matters most right now:`,
        attachment: { kind: 'approval', approvalId: mine.id },
      }
    }
    return { author: agentId, phases: ['Checking approvals'], text: 'Nothing is waiting for your approval. The team is clear.' }
  }

  if (has(text, 'report', 'summary', 'brief') && latestReport) {
    return {
      author: agentId,
      phases: ['Pulling the latest report'],
      text: `Here’s my latest: ${latestReport.summary}`,
      attachment: { kind: 'report', reportId: latestReport.id },
    }
  }

  switch (agentId) {
    case 'luna':
      if (has(text, 'complain', 'delivery', 'courier', 'late')) {
        return {
          author: 'luna',
          phases: ['Reading recent conversations', 'Grouping by topic'],
          text: 'Delivery is still the top complaint today. The Riyadh route accounts for most of it. I’m not replying to customers, but I can draft talking points for your support team.',
          attachment: { kind: 'metrics', title: 'Complaints, last 48 hours', metrics: [{ label: 'Delivery', value: '37', change: '+42%', tone: 'bad' }, { label: 'Breakage', value: '6' }, { label: 'Wrong item', value: '2' }] },
        }
      }
      if (has(text, 'sentiment', 'feel', 'happy', 'mood')) {
        return { author: 'luna', phases: ['Scoring sentiment'], text: 'Sentiment is 78 this week, up 3. Customers love the packaging. Delivery is the one thing pulling it down.' }
      }
      if (has(text, 'question', 'faq', 'ask')) {
        return { author: 'luna', phases: ['Mining questions'], text: 'The top three questions this week: mug capacity (64), delivery time (41) and gift wrapping (28). Store Agent already staged answers for the first one.' }
      }
      break
    case 'tracker':
      if (has(text, 'revenue', 'sales', 'money', 'profit', 'margin')) {
        const last = ws.daily[ws.daily.length - 2]
        return {
          author: 'tracker',
          phases: ['Reconciling yesterday', 'Calculating margin'],
          text: `Yesterday’s revenue was ${money(last.revenue)} across ${last.orders} orders. Contribution margin is ${ws.kpis.roas > 3 ? '58%' : '41.2%'}.`,
          attachment: { kind: 'metrics', title: 'Yesterday', metrics: [{ label: 'Revenue', value: money(last.revenue) }, { label: 'Orders', value: String(last.orders) }, { label: 'Margin', value: ws.kpis.roas > 3 ? '58%' : '41.2%' }] },
        }
      }
      if (has(text, 'cost', 'expense', 'shipping')) {
        return { author: 'tracker', phases: ['Breaking down costs'], text: 'Shipping is the cost to watch: $6.90 per order, up $0.80 since the courier surcharge. That’s about $1,030 a month at current volume.' }
      }
      break
    case 'ivy':
      if (has(text, 'opportunit', 'grow', 'idea', 'next')) {
        return { author: 'ivy', phases: ['Ranking opportunities', 'Estimating impact'], text: 'Top three right now: the mug and coaster bundle ($2.4K a month), a free shipping threshold at $85 ($1.9K) and a gift wrap upsell ($1.6K). Want me to prepare a test plan for any of them?' }
      }
      break
    case 'ads':
      if (has(text, 'roas', 'campaign', 'ads', 'spend', 'cpa', 'budget')) {
        return {
          author: 'ads',
          phases: ['Pulling campaign data', 'Comparing ad sets'],
          text: `Blended ROAS is ${ws.kpis.roas}. Retargeting is the most efficient ad set. Broad prospecting is fatiguing, which is why I proposed the budget move.`,
          attachment: { kind: 'metrics', title: 'Last 7 days', metrics: [{ label: 'ROAS', value: String(ws.kpis.roas) }, { label: 'Spend', value: '$21.6K' }, { label: 'Purchases', value: '1,012' }] },
        }
      }
      break
    case 'store':
      if (has(text, 'stock', 'inventory', 'product', 'listing')) {
        return { author: 'store', phases: ['Checking inventory'], text: 'Three best sellers sell out within 14 days: Terracotta mug set, Dune linen duvet (queen) and the Oasis serving bowl. I can open pre-orders on them if you like.' }
      }
      break
    case 'retention':
      if (has(text, 'segment', 'customer', 'churn', 'risk')) {
        return {
          author: 'retention',
          phases: ['Refreshing segments'],
          text: 'Today’s segments: 86 customers affected by the delay, 312 at risk of lapsing, 1,140 loyal customers with 3+ orders.',
          attachment: { kind: 'metrics', title: 'Segments today', metrics: [{ label: 'Delay affected', value: '86', tone: 'bad' }, { label: 'At risk', value: '312' }, { label: 'Loyal', value: '1,140', tone: 'good' }] },
        }
      }
      break
    case 'manager':
    case 'team':
      if (has(text, 'wait', 'tomorrow', 'later', 'urgent')) {
        const later = pending.filter((a) => a.impact !== 'high')
        return {
          author: 'manager',
          phases: ['Ranking by urgency'],
          text: later.length
            ? `Only ${pending.find((a) => a.impact === 'high')?.title.toLowerCase() ?? 'the high-impact item'} is time sensitive. ${later.map((a) => a.title).join('; ')} can wait until tomorrow without costing us anything.`
            : 'Nothing else is time sensitive today. You’re in good shape.',
        }
      }
      if (has(text, 'walk me', 'delivery', 'explain', 'what happened')) {
        return {
          author: 'manager',
          phases: ['Pulling the thread together'],
          text: 'Tuesday evening Luna saw late-delivery complaints on the Dune linen set climb, almost all on the SwiftShip Riyadh route. Ivy checked who was affected: repeat customers, many buying gifts. Retention drafted an apology with tracking and a 15% code. If we send it today, we protect about $6K in repeat revenue. I’d also ask SwiftShip for an explanation.',
        }
      }
      return {
        author: 'manager',
        phases: ['Checking with the team', 'Summarising'],
        text: `${ws.briefing.headline} ${pending.length ? `${pending.length} decisions are waiting for you.` : 'Nothing is waiting for you.'}`,
        attachment: pending[0] ? { kind: 'approval', approvalId: pending[0].id } : undefined,
      }
  }

  if (has(text, 'thank', 'great', 'perfect', 'ok')) {
    return { author: agentId, phases: ['Writing'], text: 'Anytime. I’ll keep watching and post to the feed if anything changes.' }
  }

  return {
    author: agentId,
    phases: ['Thinking', 'Checking your store data', 'Writing'],
    text: `Good question. As your ${agent.role.toLowerCase()} agent I can help with ${agent.capabilities
      .slice(0, 3)
      .map((c) => c.title.toLowerCase())
      .join(', ')}. Try asking me for my latest report or what needs your attention.`,
  }
}
