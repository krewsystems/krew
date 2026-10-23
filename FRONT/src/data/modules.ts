// Demo datasets behind each agent's specialised workspace. Keyed by workspace so brands stay isolated.

export interface ModuleData {
  products: string[]
  luna: {
    sentiment: number
    topics: { label: string; value: number; prev: number }[]
    complaints: { id: string; product: string; topic: string; count: number; change: string; channel: string }[]
    complaintTrend: number[]
    conversations: { id: string; customer: string; channel: string; topic: string; sentiment: 'negative' | 'neutral' | 'positive'; at: number; lines: { from: 'customer' | 'brand'; text: string }[] }[]
  }
  tracker: {
    pl: { line: string; value: number; prev: number }[]
    expenses: { key: string; label: string; value: number }[]
    margin: number
    budgetUsed: { id: string; label: string; value: number }[]
    budgetLimit: number
  }
  ivy: {
    opportunities: { id: string; title: string; impact: string; confidence: 'High' | 'Medium' | 'Low'; effort: 'Low' | 'Medium' | 'High'; status: 'Proposed' | 'Testing' | 'Adopted'; why: string }[]
    channels: { label: string; value: number }[]
    signals: string[]
  }
  store: {
    changes: { id: string; product: string; field: string; before: string; after: string; approvalId?: string }[]
    health: { id: string; product: string; stockDays: number; contentScore: number; conversion: number; issue: string }[]
  }
  ads: {
    campaigns: { id: string; name: string; status: 'Active' | 'Learning' | 'Paused'; spend: number; roas: number; cpa: number; frequency: number; trend: number[] }[]
    roas: number[]
  }
  retention: {
    segments: { id: string; name: string; size: number; value: string; trend: string; tone: 'good' | 'bad' | 'neutral'; description: string }[]
    drafts: { id: string; name: string; audience: string; channel: string; status: 'Draft' | 'Waiting for approval' | 'Scheduled' | 'Sent'; result?: string; approvalId?: string }[]
  }
}

const SAHRA: ModuleData = {
  products: ['Dune linen bedding set', 'Terracotta mug set', 'Oasis serving bowl', 'Clay coasters', 'Siwa wool throw'],
  luna: {
    sentiment: 78,
    topics: [
      { label: 'Questions', value: 284, prev: 251 },
      { label: 'Order status', value: 173, prev: 160 },
      { label: 'Praise', value: 77, prev: 69 },
      { label: 'Complaints', value: 51, prev: 36 },
      { label: 'Returns', value: 39, prev: 41 },
    ],
    complaints: [
      { id: 'c1', product: 'Dune linen bedding set', topic: 'Late delivery', count: 37, change: '+42%', channel: 'WhatsApp' },
      { id: 'c2', product: 'Terracotta mug set', topic: 'Breakage', count: 9, change: '-10%', channel: 'Instagram' },
      { id: 'c3', product: 'Oasis serving bowl', topic: 'Colour differs from photo', count: 6, change: '+2', channel: 'Email' },
      { id: 'c4', product: 'Siwa wool throw', topic: 'Shedding', count: 4, change: 'flat', channel: 'WhatsApp' },
      { id: 'c5', product: 'Clay coasters', topic: 'Wrong item', count: 2, change: '-1', channel: 'Instagram' },
    ],
    complaintTrend: [22, 25, 21, 24, 27, 23, 26, 24, 22, 25, 29, 33, 37, 41],
    conversations: [
      {
        id: 'cv1', customer: 'Reem A.', channel: 'WhatsApp', topic: 'Late delivery', sentiment: 'negative', at: 95,
        lines: [
          { from: 'customer', text: 'Hi, my Dune bedding set was supposed to arrive Sunday. Tracking hasn’t moved since Friday.' },
          { from: 'brand', text: 'So sorry Reem, let me check with SwiftShip for you right now.' },
          { from: 'customer', text: 'It’s a gift for my sister’s new flat, she moves in Thursday. Can I get a refund if it doesn’t make it?' },
        ],
      },
      {
        id: 'cv2', customer: 'Faisal K.', channel: 'Instagram', topic: 'Pre-purchase question', sentiment: 'neutral', at: 160,
        lines: [
          { from: 'customer', text: 'How big is the terracotta mug? Does it fit a full latte?' },
          { from: 'brand', text: 'It holds 350 ml, so yes, a generous latte fits nicely.' },
        ],
      },
      {
        id: 'cv3', customer: 'Lina M.', channel: 'Email', topic: 'Praise', sentiment: 'positive', at: 300,
        lines: [{ from: 'customer', text: 'The packaging was so beautiful I almost didn’t want to open it. The handwritten card made my day.' }],
      },
      {
        id: 'cv4', customer: 'Omar S.', channel: 'WhatsApp', topic: 'Late delivery', sentiment: 'negative', at: 420,
        lines: [
          { from: 'customer', text: 'Order #4471 is 4 days late. This is the second time with this courier.' },
          { from: 'brand', text: 'I understand, Omar. I’ve escalated it and will update you by tonight.' },
        ],
      },
    ],
  },
  tracker: {
    pl: [
      { line: 'Gross revenue', value: 128_420, prev: 118_690 },
      { line: 'Refunds', value: -2_860, prev: -2_410 },
      { line: 'Cost of goods', value: -39_810, prev: -37_120 },
      { line: 'Shipping', value: -8_860, prev: -7_420 },
      { line: 'Ad spend', value: -21_640, prev: -20_610 },
      { line: 'Payment fees', value: -3_690, prev: -3_410 },
      { line: 'Contribution', value: 51_560, prev: 47_720 },
    ],
    expenses: [
      { key: 'cogs', label: 'Cost of goods', value: 39_810 },
      { key: 'ads', label: 'Advertising', value: 21_640 },
      { key: 'ship', label: 'Shipping', value: 8_860 },
      { key: 'fees', label: 'Payment fees', value: 3_690 },
      { key: 'refunds', label: 'Refunds', value: 2_860 },
    ],
    margin: 41.2,
    budgetUsed: [
      { id: 'meta', label: 'Meta Ads', value: 61.2 },
      { id: 'creators', label: 'Creators', value: 8.4 },
      { id: 'tools', label: 'Tools', value: 3.1 },
    ],
    budgetLimit: 95,
  },
  ivy: {
    opportunities: [
      { id: 'o1', title: 'Mug & coaster bundle at $54', impact: '$2.4K / month', confidence: 'High', effort: 'Low', status: 'Proposed', why: '38% of mug buyers come back for coasters within 30 days.' },
      { id: 'o2', title: 'Raise free shipping threshold to $85', impact: '$1.9K / month', confidence: 'Medium', effort: 'Low', status: 'Proposed', why: 'Offsets the courier surcharge; 22% of orders land between $75 and $85.' },
      { id: 'o3', title: 'Gift wrap upsell at checkout', impact: '$1.6K / month', confidence: 'Medium', effort: 'Medium', status: 'Testing', why: '41% of Dune orders are gifts, but only 9% add wrapping.' },
      { id: 'o4', title: 'Jeddah lookalike audience', impact: '$1.1K / month', confidence: 'Low', effort: 'Low', status: 'Proposed', why: 'Jeddah customers have the highest win-back redemption.' },
      { id: 'o5', title: 'Weight creative toward organic-style content', impact: '$0.9K / month', confidence: 'Medium', effort: 'Medium', status: 'Adopted', why: 'Instagram-acquired customers repeat 1.6x more.' },
    ],
    channels: [
      { label: 'Instagram', value: 31 },
      { label: 'Referral', value: 27 },
      { label: 'Search', value: 24 },
      { label: 'Paid social', value: 19 },
      { label: 'Email', value: 34 },
    ],
    signals: ['Searches for “linen bedding Riyadh” up 18% month on month', 'Bedding repeat rate climbing for 3 straight months', 'Gift orders peak 9 days before Saudi National Day and Eid'],
  },
  store: {
    changes: [
      { id: 'ch1', product: 'Terracotta mug, 350 ml', field: 'Description', before: 'A hand-thrown mug in warm terracotta clay.', after: 'A hand-thrown mug in warm terracotta clay. Holds 350 ml, about a generous flat white. 9.5 cm tall, 8 cm wide. Dishwasher safe.', approvalId: 'apv_store' },
      { id: 'ch2', product: 'Oasis mug, 280 ml', field: 'Description', before: 'Our everyday mug with a sea-glass glaze.', after: 'Our everyday mug with a sea-glass glaze. Holds 280 ml. 8.5 cm tall. Hand wash recommended.', approvalId: 'apv_store' },
      { id: 'ch3', product: 'Mug & coaster bundle', field: 'New product', before: 'Does not exist', after: 'Bundle at $54 in Gifts under $60', approvalId: 'apv_bundle' },
    ],
    health: [
      { id: 'h1', product: 'Terracotta mug set', stockDays: 9, contentScore: 72, conversion: 3.1, issue: 'Missing capacity' },
      { id: 'h2', product: 'Dune linen duvet, queen', stockDays: 12, contentScore: 91, conversion: 2.4, issue: 'Low stock' },
      { id: 'h3', product: 'Oasis serving bowl', stockDays: 14, contentScore: 84, conversion: 2.8, issue: 'Low stock' },
      { id: 'h4', product: 'Clay coasters', stockDays: 41, contentScore: 66, conversion: 1.9, issue: 'Thin description' },
      { id: 'h5', product: 'Siwa wool throw', stockDays: 63, contentScore: 88, conversion: 2.2, issue: '' },
    ],
  },
  ads: {
    campaigns: [
      { id: 'a1', name: 'Autumn textiles · Broad', status: 'Active', spend: 6_300, roas: 1.7, cpa: 29, frequency: 3.1, trend: [2.3, 2.2, 2.1, 2.0, 1.9, 1.8, 1.7] },
      { id: 'a2', name: 'Autumn textiles · Retargeting', status: 'Active', spend: 2_100, roas: 4.2, cpa: 14, frequency: 2.4, trend: [3.9, 4.0, 4.1, 4.0, 4.2, 4.3, 4.2] },
      { id: 'a3', name: 'Ceramics · Lookalike 2%', status: 'Active', spend: 4_200, roas: 2.6, cpa: 19, frequency: 1.8, trend: [2.4, 2.5, 2.5, 2.6, 2.6, 2.7, 2.6] },
      { id: 'a4', name: 'Gifts · Advantage+', status: 'Learning', spend: 3_600, roas: 2.2, cpa: 22, frequency: 1.4, trend: [1.8, 1.9, 2.0, 2.1, 2.1, 2.2, 2.2] },
      { id: 'a5', name: 'Summer linen', status: 'Paused', spend: 0, roas: 0, cpa: 0, frequency: 0, trend: [2.1, 2.0, 1.8, 1.6, 0, 0, 0] },
    ],
    roas: [2.8, 2.9, 2.7, 2.8, 2.7, 2.6, 2.6, 2.7, 2.5, 2.5, 2.4, 2.4, 2.3, 2.4],
  },
  retention: {
    segments: [
      { id: 's1', name: 'Delivery affected', size: 86, value: '$6.1K at risk', trend: '+86 this week', tone: 'bad', description: 'Dune orders 2+ days late on the Riyadh route.' },
      { id: 's2', name: 'At risk of lapsing', size: 312, value: '$18.7K / year', trend: '-4%', tone: 'good', description: 'Purchase frequency dropping against their own pattern.' },
      { id: 's3', name: 'Loyal', size: 1_140, value: '$142K / year', trend: '+3%', tone: 'good', description: 'Three or more orders in the last 12 months.' },
      { id: 's4', name: 'One and done', size: 2_870, value: '$9.2K potential', trend: '+1%', tone: 'neutral', description: 'Single order more than 90 days ago.' },
    ],
    drafts: [
      { id: 'd1', name: 'Delivery delay recovery', audience: 'Delivery affected · 86', channel: 'WhatsApp · Email', status: 'Waiting for approval', approvalId: 'apv_recovery' },
      { id: 'd2', name: 'Two-time buyer win-back', audience: 'At risk · 2+ orders · 148', channel: 'WhatsApp', status: 'Draft' },
      { id: 'd3', name: 'September win-back', audience: 'Lapsed two-time buyers · 212', channel: 'WhatsApp', status: 'Sent', result: '14 orders · $1,930' },
      { id: 'd4', name: 'Thank you note, top 50', audience: 'Loyal · top 50', channel: 'In the box', status: 'Scheduled' },
    ],
  },
}

const NOOR: ModuleData = {
  products: ['Vitamin C serum', 'Hydra gel moisturiser', 'SPF 50 fluid', 'Clay mask', 'Night repair oil'],
  luna: {
    sentiment: 84,
    topics: [
      { label: 'Questions', value: 162, prev: 79 },
      { label: 'Order status', value: 71, prev: 64 },
      { label: 'Praise', value: 52, prev: 38 },
      { label: 'Complaints', value: 14, prev: 17 },
      { label: 'Returns', value: 9, prev: 11 },
    ],
    complaints: [
      { id: 'c1', product: 'SPF 50 fluid', topic: 'Late delivery outside Dubai', count: 6, change: '-2', channel: 'WhatsApp' },
      { id: 'c2', product: 'Vitamin C serum', topic: 'Tingling', count: 4, change: '+4', channel: 'Instagram' },
      { id: 'c3', product: 'Clay mask', topic: 'Leaking cap', count: 3, change: 'flat', channel: 'Email' },
    ],
    complaintTrend: [4, 5, 3, 4, 5, 3, 2, 4, 3, 4, 3, 2, 3, 2],
    conversations: [
      { id: 'cv1', customer: 'Sara H.', channel: 'Instagram', topic: 'Pre-purchase question', sentiment: 'neutral', at: 80, lines: [{ from: 'customer', text: 'Can I use the vitamin C serum with my SPF?' }, { from: 'brand', text: 'Yes, serum first, then SPF once it has absorbed.' }] },
      { id: 'cv2', customer: 'Noura A.', channel: 'WhatsApp', topic: 'Praise', sentiment: 'positive', at: 200, lines: [{ from: 'customer', text: 'Two weeks in and my skin is so much brighter. Ordering another bottle.' }] },
    ],
  },
  tracker: {
    pl: [
      { line: 'Gross revenue', value: 46_980, prev: 38_380 },
      { line: 'Refunds', value: -420, prev: -510 },
      { line: 'Cost of goods', value: -9_860, prev: -8_440 },
      { line: 'Shipping', value: -2_310, prev: -1_960 },
      { line: 'Ad spend', value: -6_920, prev: -6_110 },
      { line: 'Payment fees', value: -1_350, prev: -1_100 },
      { line: 'Contribution', value: 26_120, prev: 20_260 },
    ],
    expenses: [
      { key: 'cogs', label: 'Cost of goods', value: 9_860 },
      { key: 'ads', label: 'Advertising', value: 6_920 },
      { key: 'ship', label: 'Shipping', value: 2_310 },
      { key: 'fees', label: 'Payment fees', value: 1_350 },
    ],
    margin: 58,
    budgetUsed: [
      { id: 'meta', label: 'Meta Ads', value: 21.4 },
      { id: 'creators', label: 'Creators', value: 4.0 },
    ],
    budgetLimit: 32,
  },
  ivy: { opportunities: [], channels: [], signals: [] },
  store: { changes: [], health: [] },
  ads: {
    campaigns: [
      { id: 'a1', name: 'Vitamin C launch · KSA', status: 'Active', spend: 2_300, roas: 3.4, cpa: 16, frequency: 1.7, trend: [2.6, 2.9, 3.1, 3.2, 3.3, 3.4, 3.4] },
      { id: 'a2', name: 'Vitamin C launch · UAE', status: 'Active', spend: 1_900, roas: 2.8, cpa: 21, frequency: 1.6, trend: [2.4, 2.6, 2.7, 2.8, 2.8, 2.9, 2.8] },
      { id: 'a3', name: 'Always-on · Retargeting', status: 'Active', spend: 1_100, roas: 4.6, cpa: 11, frequency: 2.2, trend: [4.4, 4.5, 4.4, 4.6, 4.7, 4.6, 4.6] },
    ],
    roas: [2.5, 2.6, 2.6, 2.7, 2.8, 2.8, 2.9, 3.0, 2.9, 3.0, 3.1, 3.0, 3.1, 3.1],
  },
  retention: { segments: [], drafts: [] },
}

export function moduleData(workspaceId: string): ModuleData {
  return workspaceId === 'noor' ? NOOR : SAHRA
}
