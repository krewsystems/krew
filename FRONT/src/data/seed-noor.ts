import { ago, ahead, buildDaily, D, defaultSettings, H } from './seed-utils'
import { trackerSampleReports } from './tracker/reports'
import type { WorkspaceData } from './types'

/** Noor Skin: clean skincare from Dubai. A smaller, younger workspace with Ivy still in setup. */
export function seedNoor(now = Date.now()): WorkspaceData {
  const t = (m: number) => ago(m, now)
  const f = (m: number) => ahead(m, now)

  return {
    id: 'noor',
    owner: { name: 'Hazem', email: 'hazem@noorskin.ae' },
    industry: 'Skincare',
    brand: {
      name: 'Noor Skin',
      description: 'Clean, climate-smart skincare formulated for hot and humid weather. Made in the UAE.',
      tone: ['Clear', 'Reassuring', 'Expert'],
      toneNotes: 'Explain ingredients simply. Never promise medical results.',
      audience: 'Women 22 to 40 across the UAE and Saudi Arabia with sensitive or combination skin.',
      positioning: 'Dermatologist-tested essentials built for Gulf weather.',
      goals: ['Reach 2.8 ROAS on Meta', 'Launch the SPF line in December'],
      servicePolicy: 'Reply within 2 hours during working days. Route any reaction report to the pharmacist on call.',
      shipping: 'Free next-day delivery in the UAE over AED 150.',
      returns: 'Unopened products within 14 days.',
      guidelines: 'Clean white backgrounds, real skin, no retouching.',
      website: 'noorskin.ae',
      currency: 'USD',
    },
    hires: [
      { agentId: 'manager', status: 'active', hiredAt: t(64 * D), lastActiveAt: t(40), nextRunAt: f(22 * H), headline: 'Morning briefing delivered. Two decisions waiting.', kpi: { label: 'Decisions waiting', value: '2' }, settings: defaultSettings('manager') },
      { agentId: 'luna', status: 'active', hiredAt: t(60 * D), lastActiveAt: t(14), nextRunAt: f(46), headline: 'Questions about the new vitamin C serum doubled after launch.', kpi: { label: 'Conversations read today', value: '96', trend: 'up', change: '+48%' }, settings: defaultSettings('luna') },
      { agentId: 'tracker', status: 'active', hiredAt: t(60 * D), lastActiveAt: t(5 * H), nextRunAt: f(19 * H), headline: 'Launch week margin 58%, above plan.', kpi: { label: 'Contribution margin', value: '58%', trend: 'up', change: '+2 pts' }, settings: defaultSettings('tracker') },
      { agentId: 'ads', status: 'active', hiredAt: t(41 * D), lastActiveAt: t(3 * H), nextRunAt: f(20 * H), headline: 'Serum launch campaign at 3.1 ROAS. Recommends scaling.', kpi: { label: 'Blended ROAS', value: '3.1', trend: 'up', change: '+0.4' }, settings: defaultSettings('ads') },
      { agentId: 'ivy', status: 'setup', hiredAt: t(1 * D), lastActiveAt: t(1 * D), nextRunAt: f(3 * D), headline: 'Our team is mapping your product catalog and cohorts.', kpi: { label: 'Setup progress', value: '35%' }, setupProgress: 35, settings: defaultSettings('ivy') },
    ],
    briefing: {
      headline: 'The serum launch is working. Ads Agent wants to scale it.',
      body: 'The vitamin C serum sold 412 units in its first week, ahead of plan. Customer questions doubled, mostly about layering it with SPF, so Luna drafted a short FAQ. Ads Agent thinks we can push harder this weekend and wants to raise the launch budget by 30%.',
      bullets: ['Approve the launch budget increase', 'Review the FAQ Luna drafted for the serum page'],
    },
    kpis: {
      revenue: 46_980,
      revenueChange: '+22.4%',
      orders: 731,
      ordersChange: '+18.0%',
      conversations: 318,
      conversationsChange: '+48%',
      openIssues: 6,
      openIssuesChange: '-2',
      roas: 3.1,
      roasChange: '+0.4',
      agentActions: 104,
    },
    daily: buildDaily(41, 6_100, 98, 41),
    posts: [
      { id: 'np1', agentId: 'ads', type: 'approval', createdAt: t(3 * H), title: 'Serum launch campaign is ready to scale', body: 'The launch ad set is at 3.1 ROAS with stable frequency. A 30% budget increase should hold efficiency through the weekend.', embed: { kind: 'approval', approvalId: 'napv_scale' }, source: 'Meta Ads', saved: false },
      { id: 'np2', agentId: 'luna', type: 'insight', createdAt: t(4 * H), title: 'Serum questions doubled after launch', body: 'Most questions are about layering vitamin C with SPF and using it with retinol. A short FAQ on the product page would answer about 60% of them.', embed: { kind: 'insight', headline: 'Serum questions', metrics: [{ label: 'Questions, 3 days', value: '88', change: '+104%' }, { label: 'About SPF layering', value: '41%' }, { label: 'About retinol', value: '19%' }], series: [8, 11, 12, 18, 24, 29, 31] }, source: 'Instagram DMs · WhatsApp', saved: false },
      { id: 'np3', agentId: 'tracker', type: 'report', createdAt: t(5 * H), title: 'Launch week financial summary', body: 'Launch week revenue was $14.2K with a 58% contribution margin.', embed: { kind: 'report', reportId: 'nrep_launch' }, saved: false },
      { id: 'np4', agentId: 'manager', type: 'collaboration', createdAt: t(40), title: 'Two decisions for the serum launch', body: 'Ads Agent wants to scale spend and Luna drafted a layering FAQ. Both are low risk and time sensitive.', with: ['ads', 'luna'], embed: { kind: 'approval', approvalId: 'napv_scale' }, saved: false },
      { id: 'np5', agentId: 'luna', type: 'report', createdAt: t(26 * H), title: 'Weekly customer sentiment', body: 'Sentiment is 84, the highest since you joined KREW.', embed: { kind: 'report', reportId: 'nrep_sentiment' }, saved: false },
      { id: 'np6', agentId: 'ads', type: 'insight', createdAt: t(2 * D + 3 * H), title: 'Saudi audiences convert 22% cheaper than UAE', body: 'Riyadh and Jeddah audiences have a $16 CPA against $21 in Dubai.', embed: { kind: 'bars', title: 'CPA by city', unit: '$', bars: [{ label: 'Riyadh', value: 16 }, { label: 'Jeddah', value: 17 }, { label: 'Dubai', value: 21 }, { label: 'Abu Dhabi', value: 23 }] }, saved: false },
      { id: 'np7', agentId: 'tracker', type: 'alert', createdAt: t(4 * D), title: 'Packaging supplier invoice is 12% higher than quoted', body: 'The October invoice from Gulf Pack is $1,340 above the agreed quote.', saved: false },
    ],
    approvals: [
      { id: 'napv_scale', agentId: 'ads', title: 'Increase the serum launch budget by 30%', ask: 'The serum launch is beating target. Can I raise the budget 30% for the weekend?', summary: 'Scale a campaign that is beating target ROAS while frequency is still low.', action: 'Raise Vitamin C launch from $600 to $780 a day', channel: 'Meta Ads', impact: 'medium', estimate: 'About 60 extra orders over the weekend', risk: 'ROAS may soften to about 2.8', createdAt: t(3 * H), status: 'pending', evidence: [{ label: 'ROAS', value: '3.1', tone: 'good' }, { label: 'Frequency', value: '1.7' }] },
      { id: 'napv_faq', agentId: 'luna', title: 'Add a layering FAQ to the serum page', ask: 'I wrote four quick answers on layering the serum with SPF and retinol. Can I add them to the product page?', summary: 'Answers the two most common pre-purchase questions.', action: 'Publish 4 FAQ entries on the product page', channel: 'Shopify', impact: 'low', estimate: 'About 50 fewer questions a week', risk: 'None', createdAt: t(4 * H), status: 'pending', evidence: [{ label: 'Questions covered', value: '60%' }], preview: [{ label: 'Can I use it with SPF?', content: 'Yes. Apply the serum first, let it absorb for a minute, then apply SPF.' }] },
      { id: 'napv_h1', agentId: 'ads', title: 'Launch the vitamin C serum campaign', summary: 'Launch campaign across UAE and KSA.', action: 'Publish campaign', channel: 'Meta Ads', impact: 'medium', estimate: '2.5 ROAS', risk: 'New product', createdAt: t(8 * D), status: 'approved', decidedAt: t(8 * D - 30), evidence: [] },
    ],
    tasks: [
      { id: 'ntsk1', agentId: 'luna', title: 'Draft serum layering FAQ', description: 'Four entries covering SPF and retinol.', status: 'waiting', priority: 'normal', dueAt: f(1 * D), createdAt: t(5 * H), linkedApprovalId: 'napv_faq', createdBy: 'agent' },
      { id: 'ntsk2', agentId: 'ads', title: 'Scale serum launch', description: 'Increase budget by 30% if approved.', status: 'waiting', priority: 'high', dueAt: f(10 * H), createdAt: t(3 * H), linkedApprovalId: 'napv_scale', createdBy: 'agent' },
      { id: 'ntsk3', agentId: 'tracker', title: 'Dispute packaging invoice', description: 'Prepare the comparison with the original quote.', status: 'in_progress', priority: 'normal', dueAt: f(2 * D), createdAt: t(4 * D), createdBy: 'user' },
    ],
    reports: [
      ...trackerSampleReports('noor', now),
      { id: 'nrep_launch', agentId: 'tracker', topic: 'performance', title: 'Launch week financial summary', kind: 'weekly', period: 'Oct 14 to Oct 20', createdAt: t(5 * H), summary: 'Revenue $14.2K, margin 58%, ahead of plan.', highlights: [{ label: 'Revenue', value: '$14.2K', change: '+31%', tone: 'good' }, { label: 'Margin', value: '58%', tone: 'good' }], sections: [{ id: 's', title: 'Summary', body: 'Serum launch drove 41% of revenue.' }] },
      { id: 'nrep_sentiment', agentId: 'luna', title: 'Weekly customer sentiment', kind: 'weekly', period: 'Oct 13 to Oct 19', createdAt: t(26 * H), summary: 'Sentiment 84. Texture and scent praised.', highlights: [{ label: 'Sentiment', value: '84', change: '+5', tone: 'good' }], sections: [{ id: 's', title: 'Summary', body: 'Few complaints, mostly delivery timing outside Dubai.' }] },
      { id: 'nrep_ads', agentId: 'ads', title: 'Launch campaign report', kind: 'ad-hoc', period: 'First 7 days', createdAt: t(2 * D), summary: 'ROAS 3.1 on $4.2K spend.', highlights: [{ label: 'ROAS', value: '3.1', tone: 'good' }, { label: 'Spend', value: '$4.2K' }], sections: [{ id: 's', title: 'Summary', body: 'Saudi audiences were the most efficient.' }] },
    ],
    conversations: [
      { id: 'manager', kind: 'manager', agentId: 'manager', title: 'KREW Manager', members: ['manager'], unread: 1, pinned: true, messages: [{ id: 'nm1', author: 'manager', text: 'Good morning. The serum launch is ahead of plan. Two quick decisions are waiting for you.', createdAt: t(40), attachment: { kind: 'approval', approvalId: 'napv_scale' } }] },
      { id: 'team', kind: 'team', title: 'Noor team room', members: ['manager', 'luna', 'tracker', 'ads'], unread: 0, pinned: true, messages: [{ id: 'nt1', author: 'luna', text: 'Serum questions doubled. Drafting an FAQ.', createdAt: t(4 * H) }, { id: 'nt2', author: 'ads', text: 'Launch is at 3.1 ROAS. Proposing to scale.', createdAt: t(3 * H) }] },
      { id: 'luna', kind: 'direct', agentId: 'luna', title: 'Luna', members: ['luna'], unread: 0, messages: [{ id: 'nl1', author: 'luna', text: 'Sentiment is 84 this week, your best so far.', createdAt: t(26 * H) }] },
      { id: 'tracker', kind: 'direct', agentId: 'tracker', title: 'Tracker', members: ['tracker'], unread: 0, messages: [{ id: 'nk1', author: 'tracker', text: 'Launch week summary is ready.', createdAt: t(5 * H), attachment: { kind: 'report', reportId: 'nrep_launch' } }] },
      { id: 'ads', kind: 'direct', agentId: 'ads', title: 'Ads Agent', members: ['ads'], unread: 0, messages: [{ id: 'na1', author: 'ads', text: 'I proposed a 30% budget increase for the serum launch.', createdAt: t(3 * H), attachment: { kind: 'approval', approvalId: 'napv_scale' } }] },
    ],
    notifications: [
      { id: 'nn1', title: 'Approval needed: scale serum launch', description: 'Ads Agent proposes +30% budget.', createdAt: t(3 * H), read: false, tone: 'warning', agentId: 'ads', href: '/approvals/napv_scale' },
      { id: 'nn2', title: 'Ivy setup started', description: 'Our team is preparing Ivy for your catalog.', createdAt: t(1 * D), read: true, tone: 'success', agentId: 'ivy', href: '/krew/ivy' },
    ],
    knowledge: [
      { id: 'nkb1', title: 'Vitamin C serum usage', category: 'Product', content: 'Apply in the morning before SPF. Patch test first. Avoid using in the same routine as retinol.', updatedAt: t(9 * D), usedBy: ['luna'] },
      { id: 'nkb2', title: 'Reaction reports', category: 'Policy', content: 'Any reaction report is escalated to the pharmacist on call within 1 hour.', updatedAt: t(40 * D), usedBy: ['luna'] },
    ],
    integrations: [
      { id: 'shopify', name: 'Shopify', description: 'Orders, products, customers and inventory.', status: 'connected', account: 'noor-skin.myshopify.com', lastSync: t(6), usedBy: ['tracker', 'luna'] },
      { id: 'instagram', name: 'Instagram', description: 'DMs, comments and post performance.', status: 'connected', account: '@noorskin', lastSync: t(14), usedBy: ['luna'] },
      { id: 'facebook', name: 'Facebook', description: 'Page messages and comments.', status: 'disconnected', usedBy: [] },
      { id: 'whatsapp', name: 'WhatsApp Business', description: 'Customer conversations and approved outbound messages.', status: 'connected', account: '+971 50 220 1188', lastSync: t(20), usedBy: ['luna'] },
      { id: 'meta-ads', name: 'Meta Ads', description: 'Campaign spend, results and budgets.', status: 'connected', account: 'Noor Skin · act_55210', lastSync: t(45), usedBy: ['ads', 'tracker'] },
      { id: 'telegram', name: 'Telegram', description: 'Talk to your agents and approve actions on the go.', status: 'disconnected', usedBy: [] },
    ],
    team: [
      { id: 'nu1', name: 'Hazem Mansour', email: 'hazem@noorskin.ae', role: 'Owner', lastActive: t(2) },
      { id: 'nu2', name: 'Layla Haddad', email: 'layla@noorskin.ae', role: 'Admin', lastActive: t(6 * H) },
    ],
  }
}
