// Agent identities: voice, traits and a resume. Used by the Overview inbox and marketplace profiles.
// The 3D characters will plug in later; `tint` drives the temporary portrait (orb) colour.

export type WorkSampleKind = 'line' | 'bars' | 'report' | 'chat' | 'table' | 'diff'

export interface Persona {
  tint: string
  traits: string[]
  quote: string
  intro: string
  signoff: string
  rating: number
  tasksDone: string
  responseTime: string
  languages: string[]
  worksWith: string[]
  experience: { title: string; detail: string; result: string }[]
  samples: { kind: WorkSampleKind; title: string; caption: string }[]
  reviews: { brand: string; person: string; role: string; quote: string }[]
}

export const PERSONAS: Record<string, Persona> = {
  manager: {
    tint: '#a07be4',
    traits: ['Calm', 'Concise', 'Big picture'],
    quote: 'One clear briefing beats ten notifications.',
    intro: 'I read everything the team produces, connect the dots across departments and bring you one clear briefing each morning. When you decide something, I make sure it actually happens.',
    signoff: 'Talk soon',
    rating: 4.9,
    tasksDone: '21,400',
    responseTime: 'Instant',
    languages: ['English', 'Arabic'],
    worksWith: ['luna', 'tracker', 'ivy', 'store', 'ads', 'retention'],
    experience: [
      { title: 'Ran the morning briefing for 214 brands', detail: 'Daily summary across sales, customers, ads and operations.', result: '11 min saved per decision' },
      { title: 'Coordinated a Ramadan launch across 6 agents', detail: 'Gift brand, Riyadh · ads, stock, content and retention in one plan.', result: '+38% season revenue' },
    ],
    samples: [
      { kind: 'report', title: 'Morning briefing', caption: 'What changed, what the team did, what needs you' },
      { kind: 'chat', title: 'Decision follow-up', caption: 'Confirms approved actions ran' },
      { kind: 'bars', title: 'Team workload', caption: 'Actions per agent this week' },
    ],
    reviews: [
      { brand: 'Qamar Kitchen', person: 'Dana R.', role: 'Founder, Jeddah', quote: 'I read one message with my coffee and I know exactly what to do today.' },
    ],
  },
  luna: {
    tint: '#5fc071',
    traits: ['Empathetic', 'Observant', 'Precise'],
    quote: 'Every complaint is a signal. Most just arrive in the wrong inbox.',
    intro: 'I listen to every customer conversation on WhatsApp, Instagram and email so you don’t have to. I classify them, spot patterns early and tell you what customers are really saying. I never reply to customers myself.',
    signoff: 'Luna',
    rating: 4.9,
    tasksDone: '1.2M conversations',
    responseTime: 'Hourly scans',
    languages: ['English', 'Arabic', 'Egyptian Arabic'],
    worksWith: ['ivy', 'retention', 'store'],
    experience: [
      { title: 'Caught a packaging defect before reviews did', detail: 'Ceramics brand, Riyadh · 14 breakage mentions in 3 days traced to one supplier batch.', result: '9 days earlier' },
      { title: 'Cut repeat questions by half', detail: 'Skincare brand, Dubai · found the 12 questions product pages should answer.', result: '-52% questions' },
      { title: 'Mapped refund reasons for a fashion label', detail: 'Cairo · sizing, not quality, drove 61% of refunds.', result: '-23% refunds' },
    ],
    samples: [
      { kind: 'bars', title: 'Conversation categories', caption: 'This week against last week' },
      { kind: 'line', title: 'Complaint spike', caption: 'Delivery complaints per 4 hours' },
      { kind: 'chat', title: 'Tagged conversation', caption: 'Topic, product and urgency' },
    ],
    reviews: [
      { brand: 'Lume Atelier', person: 'Sara K.', role: 'Head of CX, Dubai', quote: 'Luna told us about a courier problem two days before our team noticed.' },
      { brand: 'Bayt Linen', person: 'Omar H.', role: 'Owner, Cairo', quote: 'It feels like having someone who actually reads every message.' },
    ],
  },
  tracker: {
    tint: '#de632a',
    traits: ['Analytical', 'Exact', 'Early riser'],
    quote: 'Revenue is a vanity number until the costs are in.',
    intro: 'I reconcile your revenue, costs and margin every morning and explain what moved. If a cost trend starts eating into profit, you hear it from me first.',
    signoff: 'Tracker',
    rating: 4.8,
    tasksDone: '86,000 reports',
    responseTime: 'Daily at 07:30',
    languages: ['English', 'Arabic'],
    worksWith: ['ads', 'ivy', 'manager'],
    experience: [
      { title: 'Found a hidden courier surcharge', detail: 'Home brand, KSA · fuel surcharge applied without notice.', result: '$12K a year saved' },
      { title: 'Daily P&L for a 3-store group', detail: 'Abu Dhabi · consolidated Shopify and ad accounts.', result: '2 hrs a day saved' },
    ],
    samples: [
      { kind: 'table', title: 'Daily P&L', caption: 'Revenue to contribution margin' },
      { kind: 'line', title: 'Revenue and costs', caption: 'Last 30 days' },
      { kind: 'report', title: 'Monthly close', caption: 'Category and cost structure' },
    ],
    reviews: [{ brand: 'Nakhla Dates', person: 'Faisal M.', role: 'CFO, Riyadh', quote: 'My accountant now starts the month with Tracker’s close instead of a blank sheet.' }],
  },
  ivy: {
    tint: '#cf5bac',
    traits: ['Curious', 'Optimistic', 'Data-led'],
    quote: 'The next opportunity is usually hiding in last month’s orders.',
    intro: 'I look for growth in the data you already have: bundles, prices, audiences, collections. Every idea comes with an expected impact so you can decide quickly.',
    signoff: 'Ivy',
    rating: 4.8,
    tasksDone: '9,800 opportunities',
    responseTime: 'Weekly, Mondays',
    languages: ['English', 'Arabic'],
    worksWith: ['luna', 'tracker', 'store', 'ads'],
    experience: [
      { title: 'Designed a bundle that lifted AOV', detail: 'Coffee brand, Kuwait · beans and grinder bundle from attach-rate data.', result: '+14% AOV' },
      { title: 'Found the best acquisition channel', detail: 'Fashion label · Instagram customers repeated 1.7x more.', result: '+22% LTV' },
    ],
    samples: [
      { kind: 'bars', title: 'Repeat rate by channel', caption: '12 months of cohorts' },
      { kind: 'report', title: 'Opportunity brief', caption: 'Ranked by expected impact' },
      { kind: 'line', title: 'Cohort curve', caption: 'Repeat purchase over 90 days' },
    ],
    reviews: [{ brand: 'Wadi Botanicals', person: 'Layla S.', role: 'Growth lead, Dubai', quote: 'Ivy’s Monday brief became our planning meeting agenda.' }],
  },
  store: {
    tint: '#e4a60d',
    traits: ['Meticulous', 'Tidy', 'Careful'],
    quote: 'Nothing goes live without your OK.',
    intro: 'I keep your Shopify store accurate and complete: product details, collections, alt text and stock warnings. I stage every change and wait for your approval before publishing.',
    signoff: 'Store Agent',
    rating: 4.7,
    tasksDone: '310,000 edits',
    responseTime: 'Daily at 10:00',
    languages: ['English', 'Arabic'],
    worksWith: ['luna', 'ivy', 'atlas'],
    experience: [
      { title: 'Rewrote 400 product pages', detail: 'Home brand · sizing, care and materials added from customer questions.', result: '+0.6 pts conversion' },
      { title: 'Prevented a stock-out on a best seller', detail: 'Perfume brand, Dubai · early warning and pre-orders.', result: '$18K sales kept' },
    ],
    samples: [
      { kind: 'diff', title: 'Staged edit', caption: 'Before and after, waiting for approval' },
      { kind: 'table', title: 'Product health', caption: 'Stock cover and content score' },
      { kind: 'report', title: 'Collection plan', caption: 'Ordered by conversion' },
    ],
    reviews: [{ brand: 'Fanous Home', person: 'Mariam A.', role: 'E-commerce manager, Cairo', quote: 'Our catalog finally looks finished.' }],
  },
  ads: {
    tint: '#e1662d',
    traits: ['Sharp', 'Frugal', 'Fast'],
    quote: 'Wasted spend is easiest to catch on day two, not day twenty.',
    intro: 'I watch every Meta campaign daily, explain why cost and return moved and recommend budget and creative changes. Budget changes always wait for you.',
    signoff: 'Ads Agent',
    rating: 4.8,
    tasksDone: '$41M spend watched',
    responseTime: 'Daily at 09:00',
    languages: ['English', 'Arabic'],
    worksWith: ['tracker', 'muse', 'ivy'],
    experience: [
      { title: 'Rescued a fatiguing campaign', detail: 'Abaya brand, Riyadh · rotated creative and shifted budget in 48 hours.', result: 'ROAS 1.8 → 2.9' },
      { title: 'Cut wasted spend before Eid', detail: 'Gift brand · paused low-stock products in ads.', result: '$6.4K saved' },
    ],
    samples: [
      { kind: 'table', title: 'Campaign table', caption: 'Spend, ROAS, CPA, frequency' },
      { kind: 'bars', title: 'CPA by ad set', caption: 'Now against before' },
      { kind: 'line', title: 'Creative fatigue', caption: 'CTR over 10 days' },
    ],
    reviews: [{ brand: 'Sadu Studio', person: 'Khalid N.', role: 'Founder, Kuwait', quote: 'It caught a broken ad set at 9 AM on a Friday. That alone paid for it.' }],
  },
  retention: {
    tint: '#5ebf6e',
    traits: ['Warm', 'Thoughtful', 'Persuasive'],
    quote: 'A good apology is the cheapest marketing you’ll ever buy.',
    intro: 'I find customers who are drifting away or had a bad experience and prepare the right message to bring them back. I draft everything in your brand voice, and nothing reaches a customer without your approval.',
    signoff: 'Retention Agent',
    rating: 4.9,
    tasksDone: '62,000 customers recovered',
    responseTime: 'Daily at 11:00',
    languages: ['English', 'Arabic'],
    worksWith: ['luna', 'ivy', 'manager'],
    experience: [
      { title: 'Recovered customers after a warehouse delay', detail: 'Home brand, KSA · apology plus make-good code to 300 customers.', result: '41% re-ordered' },
      { title: 'Built a win-back program', detail: 'Skincare brand · two-time buyers who went quiet.', result: '$9.6K a month' },
    ],
    samples: [
      { kind: 'chat', title: 'Recovery message', caption: 'Drafted in your brand voice' },
      { kind: 'bars', title: 'Risk segments', caption: 'Refreshed daily' },
      { kind: 'report', title: 'Campaign results', caption: 'Orders and revenue recovered' },
    ],
    reviews: [{ brand: 'Rimal Ceramics', person: 'Noor E.', role: 'Owner, Jeddah', quote: 'Customers replied to thank us for the apology. That never happened before.' }],
  },
  echo: {
    tint: '#9470dc',
    traits: ['Attentive', 'Honest', 'Thorough'],
    quote: 'Your reviews already wrote your next product brief.',
    intro: 'I read every product review, group them by theme and tell you which products need attention and which words customers use to praise you.',
    signoff: 'Echo',
    rating: 4.7,
    tasksDone: '480,000 reviews',
    responseTime: 'Daily at 17:00',
    languages: ['English', 'Arabic'],
    worksWith: ['luna', 'store', 'muse'],
    experience: [{ title: 'Spotted a sizing issue in tote bags', detail: 'Accessories brand · “smaller than expected” tripled.', result: 'Fixed in 1 week' }],
    samples: [
      { kind: 'bars', title: 'Review themes', caption: 'Per product' },
      { kind: 'chat', title: 'Voice of customer', caption: 'Exact phrases for your copy' },
      { kind: 'line', title: 'Rating trend', caption: '90 days' },
    ],
    reviews: [{ brand: 'Tala Bags', person: 'Hiba Z.', role: 'Product lead, Amman', quote: 'We changed a product because of Echo, and returns dropped.' }],
  },
  atlas: {
    tint: '#e4a301',
    traits: ['Methodical', 'Cautious', 'Forward-looking'],
    quote: 'The best stock-out is the one that never happens.',
    intro: 'I forecast demand for every SKU using sales velocity, seasonality and planned campaigns, then draft purchase orders before you run low.',
    signoff: 'Atlas',
    rating: 4.6,
    tasksDone: '1.4M SKUs forecast',
    responseTime: 'Weekly, Sundays',
    languages: ['English'],
    worksWith: ['store', 'tracker', 'ads'],
    experience: [{ title: 'Planned stock for a holiday peak', detail: 'Toy brand, UAE · 8-week forecast across 220 SKUs.', result: '0 stock-outs' }],
    samples: [
      { kind: 'line', title: 'Demand forecast', caption: '8 weeks with confidence band' },
      { kind: 'table', title: 'Reorder plan', caption: 'Lead times and dates' },
      { kind: 'report', title: 'Purchase order draft', caption: 'Ready for your supplier' },
    ],
    reviews: [{ brand: 'Maraya Toys', person: 'Rami T.', role: 'Operations, Dubai', quote: 'Our first holiday season without a panic reorder.' }],
  },
  muse: {
    tint: '#9572d6',
    traits: ['Creative', 'Playful', 'On-brand'],
    quote: 'Good captions sound like you on a good day.',
    intro: 'I write captions, ad copy and creative briefs grounded in your Brand DNA and what is performing right now.',
    signoff: 'Muse',
    rating: 4.7,
    tasksDone: '58,000 captions',
    responseTime: 'Weekly, Thursdays',
    languages: ['English', 'Arabic'],
    worksWith: ['ads', 'echo', 'ivy'],
    experience: [{ title: 'Relaunched a brand voice', detail: 'Candle brand · 6 weeks of captions in a new tone.', result: '+31% engagement' }],
    samples: [
      { kind: 'chat', title: 'Caption set', caption: 'Seven captions for a drop' },
      { kind: 'report', title: 'Creative brief', caption: 'For a UGC shoot' },
      { kind: 'bars', title: 'Angle test', caption: 'Ad copy variations' },
    ],
    reviews: [{ brand: 'Oud & Ember', person: 'Yasmin F.', role: 'Brand manager, Doha', quote: 'Muse writes like our best copywriter, every Thursday.' }],
  },
  scout: {
    tint: '#ce59aa',
    traits: ['Vigilant', 'Discreet', 'Quick'],
    quote: 'Know their move before your customers do.',
    intro: 'I watch competitor stores and ad libraries and tell you the moment they launch, change prices or start a promotion.',
    signoff: 'Scout',
    rating: 4.6,
    tasksDone: '2.1M price checks',
    responseTime: 'Daily at 08:30',
    languages: ['English', 'Arabic'],
    worksWith: ['ads', 'ivy', 'tracker'],
    experience: [{ title: 'Flagged a competitor flash sale', detail: 'Electronics accessories, KSA · alert 40 minutes after launch.', result: 'Matched in 1 hour' }],
    samples: [
      { kind: 'table', title: 'Price tracker', caption: 'Competitor catalog changes' },
      { kind: 'chat', title: 'Promotion alert', caption: 'Sent to Telegram' },
      { kind: 'line', title: 'Price history', caption: '60 days' },
    ],
    reviews: [{ brand: 'Volt Gear', person: 'Ahmad J.', role: 'Founder, Riyadh', quote: 'We stopped refreshing competitor sites every morning.' }],
  },
  vera: {
    tint: '#d05b26',
    traits: ['Detail-oriented', 'Clear', 'Patient'],
    quote: 'If customers search for it, your page should say it.',
    intro: 'I audit product pages for search and conversion, then draft titles, descriptions and structured data for Store Agent to stage.',
    signoff: 'Vera',
    rating: 4.7,
    tasksDone: '140,000 pages audited',
    responseTime: 'Weekly, Wednesdays',
    languages: ['English', 'Arabic'],
    worksWith: ['store', 'echo'],
    experience: [{ title: 'Fixed duplicate meta descriptions', detail: 'Beauty brand · 230 pages rewritten.', result: '+27% organic visits' }],
    samples: [
      { kind: 'diff', title: 'Title rewrite', caption: 'Search term coverage' },
      { kind: 'table', title: 'SEO audit', caption: 'Issues per product' },
      { kind: 'line', title: 'Organic traffic', caption: '90 days after launch' },
    ],
    reviews: [{ brand: 'Zahra Beauty', person: 'Reem A.', role: 'E-commerce lead, Kuwait', quote: 'Search traffic finally shows up for the products we care about.' }],
  },
  nova: {
    tint: '#eca900',
    traits: ['Patient', 'Rigorous', 'Plain-spoken'],
    quote: 'Lifetime value is just loyalty you can measure.',
    intro: 'I build monthly cohorts, track repeat purchase curves and show which acquisition channels bring customers who stay.',
    signoff: 'Nova',
    rating: 4.8,
    tasksDone: '18,000 cohorts',
    responseTime: 'Monthly, 1st',
    languages: ['English'],
    worksWith: ['ivy', 'tracker', 'ads'],
    experience: [{ title: 'Re-ranked acquisition channels by LTV', detail: 'Coffee subscription brand · paid social looked cheap but churned fast.', result: '+19% LTV/CAC' }],
    samples: [
      { kind: 'line', title: 'Cohort curves', caption: 'Repeat rate by month' },
      { kind: 'bars', title: 'LTV by channel', caption: '12 months' },
      { kind: 'table', title: 'Payback table', caption: 'Months to recover CAC' },
    ],
    reviews: [{ brand: 'Bunn Roastery', person: 'Tariq L.', role: 'Founder, Manama', quote: 'Nova changed where we spend our marketing budget.' }],
  },
}

export function getPersona(agentId: string): Persona {
  return PERSONAS[agentId] ?? PERSONAS.manager
}
