import { ago, D, H } from '@/data/seed-utils'
import type { AtRiskCase, CaseEvent, CommonQuestion, ConversationAnalysis, LunaConversation, LunaCustomer, LunaDataset, LunaInsight, LunaMessage, LunaProductRef, SalesOpportunity } from './types'

// Instagram DM sample for each demo brand. Everything Luna "found" here is precomputed: there is no analysis running.
// Customers, conversations, cases and insights reference each other by id, so every screen reads the same records.

/** [who, text, minutes ago, attachment]. c = customer, b = brand. */
type Line = [from: 'c' | 'b', text: string, minutesAgo: number, attachment?: LunaMessage['attachment']]

interface ConvSeed {
  id: string
  name: string
  handle: string
  city?: string
  orders?: number
  msgs: Line[]
  a: Omit<ConversationAnalysis, 'analyzedAt'>
}

type OppSeed = Omit<SalesOpportunity, 'type' | 'customerId' | 'evidence' | 'detectedAt' | 'lastActivityAt'> & { ev: number[] }
type RiskSeed = Omit<AtRiskCase, 'type' | 'customerId' | 'evidence' | 'detectedAt' | 'lastActivityAt'> & { ev: number[] }
/** A person's earlier status change, minutes ago. */
type History = { caseId: string; minutesAgo: number; from: CaseEvent['from']; to: CaseEvent['to']; note?: string }[]

interface BrandSeed {
  headline: string
  account: string
  staff: string[]
  products: LunaProductRef[]
  conversations: ConvSeed[]
  opportunities: OppSeed[]
  risks: RiskSeed[]
  insights: LunaInsight[]
  questions: CommonQuestion[]
  history: History
}

function build(seed: BrandSeed): LunaDataset {
  const customers: LunaCustomer[] = []
  const conversations: LunaConversation[] = seed.conversations.map((c, n) => {
    const customerId = `cu-${c.id}`
    const first = Math.max(...c.msgs.map((m) => m[2]))
    customers.push({
      id: customerId,
      name: c.name,
      identities: [{ channel: 'instagram', externalId: `ig_${(178_400_000 + n * 7_919).toString(36)}`, handle: c.handle }],
      city: c.city,
      ordersCount: c.orders,
      shopifyCustomerId: c.orders ? `gid://shopify/Customer/${70_000 + n}` : undefined,
      firstSeenAt: ago(first + 3 * D),
    })
    let staff = 0
    const messages = c.msgs.map(([from, text, minutes, attachment], i): LunaMessage => {
      const author = from === 'b' ? seed.staff[staff++ % seed.staff.length] : undefined
      return { id: `${c.id}-m${i}`, from: from === 'c' ? 'customer' : 'brand', author, text, at: ago(minutes), attachment }
    })
    const last = Math.min(...c.msgs.map((m) => m[2]))
    return { id: c.id, customerId, channel: 'instagram', externalThreadId: `ig_thread_${c.id}`, messages, analysis: { ...c.a, analyzedAt: ago(Math.max(1, last - 4)) } }
  })
  const byId = new Map(conversations.map((c) => [c.id, c]))
  const span = (conversationId: string, ev: number[]) => {
    const conv = byId.get(conversationId)!
    return { customerId: conv.customerId, evidence: ev.map((i) => conv.messages[i].id), detectedAt: conv.messages[ev[0]].at, lastActivityAt: conv.messages[conv.messages.length - 1].at }
  }
  const changedAt = (id: string) => seed.history.filter((h) => h.caseId === id).map((h) => ago(h.minutesAgo)).at(-1)
  const opportunities: SalesOpportunity[] = seed.opportunities.map(({ ev, ...o }) => ({ ...o, type: 'opportunity', ...span(o.conversationId, ev), statusChangedAt: changedAt(o.id) }))
  const risks: AtRiskCase[] = seed.risks.map(({ ev, ...r }) => ({ ...r, type: 'risk', ...span(r.conversationId, ev), statusChangedAt: changedAt(r.id) }))
  const events: CaseEvent[] = [
    ...[...opportunities, ...risks].map((c) => ({ id: `ev-${c.id}-0`, caseId: c.id, at: c.detectedAt, by: 'luna' as const, kind: 'detected' as const })),
    ...seed.history.map((h, i) => ({ id: `ev-h${i}`, caseId: h.caseId, at: ago(h.minutesAgo), by: 'you' as const, kind: 'status_changed' as const, from: h.from, to: h.to, note: h.note })),
  ]
  return {
    headline: seed.headline,
    lastScanAt: ago(9),
    instagramAccount: seed.account,
    products: seed.products,
    customers,
    conversations,
    opportunities,
    risks,
    insights: seed.insights,
    questions: seed.questions,
    events,
  }
}

// ---------------------------------------------------------------------------
// Sahra Home: Cairo home goods brand, ships across Egypt and the Gulf.

const SAHRA: BrandSeed = {
  headline: 'Six customers are waiting for the Natural Siwa throw, and delivery complaints doubled this week. Three people have had no reply for over a day.',
  account: '@sahra.home',
  staff: ['Salma', 'Omar'],
  products: [
    { id: 'dune-bedding', name: 'Dune linen bedding set', price: 240 },
    { id: 'terracotta-mugs', name: 'Terracotta mug set', price: 68 },
    { id: 'oasis-bowl', name: 'Oasis serving bowl', price: 92 },
    { id: 'siwa-throw', name: 'Siwa wool throw', price: 165, outOfStock: ['Natural'] },
    { id: 'clay-coasters', name: 'Clay coasters, set of 6', price: 34 },
    { id: 'ember-mug', name: 'Winter ember mug', price: 38 },
    { id: 'kilim-cushion', name: 'Kilim cushion cover', price: 58 },
  ],
  conversations: [
    // Restock demand: Siwa throw, Natural
    {
      id: 's01', name: 'Youssef Hamdy', handle: 'youssef.hmd', city: 'Cairo', orders: 2,
      msgs: [
        ['c', 'مساء الخير، الـ Siwa throw اللون الـ Natural هينزل تاني امتى؟', 3 * D + 140],
        ['b', 'مساء النور يا يوسف! المفروض يرجع آخر الشهر إن شاء الله', 3 * D + 95],
        ['c', 'تمام، أنا عايز اتنين، هدية لماما وخالتي. ممكن تحجزوهم ليا أول ما ييجي؟', 3 * D + 80],
        ['c', 'ولو ينفع يوصلوا قبل ١٥ نوفمبر عشان عيد ميلاد ماما', 3 * D + 78],
        ['b', 'أكيد، هنبعتلك أول ما ينزل 🤍', 2 * D + 20 * H],
        ['c', 'شكراً، مستني', 2 * D + 19 * H],
      ],
      a: {
        summary: 'Returning customer wants two Natural throws as gifts and asked to reserve them. Needs delivery before 15 November.',
        intent: 'restock', topics: ['availability', 'delivery'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'restock', label: 'Waiting for Natural restock' }, { kind: 'opportunity', label: 'Wants 2 units, has a deadline' }],
        nextStep: 'Confirm the restock date with him and reserve two units, or offer Indigo if Natural lands after 10 November.',
      },
    },
    {
      id: 's02', name: 'Nada Samir', handle: 'nadasamir_', city: 'Cairo',
      msgs: [
        ['c', 'Hi, el throw el natural out of stock leh? 😩', 2 * D + 6 * H],
        ['c', '3ayza wa7ed lel living room', 2 * D + 6 * H - 1],
        ['b', 'Hi Nada! It’s coming back at the end of the month', 2 * D + 4 * H],
        ['c', 'ok pls 2oolouly awel ma yenzel', 2 * D + 3 * H],
      ],
      a: {
        summary: 'Wants one Natural throw for her living room and asked to be told when it is back.',
        intent: 'restock', topics: ['availability'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'neutral', language: 'mixed',
        signals: [{ kind: 'restock', label: 'Asked to be notified' }],
        nextStep: 'Add her to the restock list for the Natural throw.',
      },
    },
    {
      id: 's03', name: 'Hala Mostafa', handle: 'hala.mostafa', city: 'Alexandria',
      msgs: [
        ['c', 'ده موجود؟', 5 * D + 2 * H, { kind: 'story_reply', label: 'Reply to story: Siwa throw, Natural' }],
        ['b', 'الـ Indigo موجود، الـ Natural خلص للأسف', 5 * D + H],
        ['c', 'لأ أنا عايزة الـ Natural بالذات، هستنى', 5 * D + 40],
      ],
      a: {
        summary: 'Replied to a story asking for the Natural throw. Declined Indigo and will wait.',
        intent: 'restock', topics: ['availability'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'neutral', language: 'ar-EG',
        signals: [{ kind: 'restock', label: 'Prefers to wait for Natural' }],
        nextStep: 'Add her to the restock list.',
      },
    },
    {
      id: 's04', name: 'Jana Ali', handle: 'jana.alii', city: 'Riyadh', orders: 1,
      msgs: [
        ['c', 'Is the natural throw ever coming back? I’ve been checking the site for two weeks', 4 * D + 5 * H],
        ['b', 'Yes! End of the month. Sorry for the wait, Jana', 4 * D + 3 * H],
        ['c', 'Great. Will it be the same weave? The indigo looks thinner in the photos', 4 * D + 2 * H],
        ['b', 'Same weave and weight, the indigo dye just photographs flatter', 4 * D + H],
      ],
      a: {
        summary: 'Has been checking the site for two weeks for the Natural throw. Worried the weave differs between colours.',
        intent: 'restock', topics: ['availability', 'product_question'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'neutral', language: 'en',
        signals: [{ kind: 'restock', label: 'Checking the site repeatedly' }, { kind: 'question', label: 'Thinks Indigo looks thinner in photos' }],
        nextStep: 'Notify on restock. The Indigo photos may need a closer weave shot.',
      },
    },
    {
      id: 's05', name: 'Sherif Adel', handle: 'sherif.adel', city: 'Cairo',
      msgs: [
        ['c', 'El Siwa throw natural restock imta? Also do you ship to Sahel?', D + 7 * H],
        ['b', 'End of the month, and yes we ship to Sahel in 3 to 5 days', D + 5 * H],
        ['c', 'tamam thanks', D + 5 * H - 3],
      ],
      a: {
        summary: 'Asked when the Natural throw returns and whether Sahra ships to the North Coast.',
        intent: 'restock', topics: ['availability', 'delivery'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'neutral', language: 'mixed',
        signals: [{ kind: 'restock', label: 'Asked for restock date' }],
        nextStep: 'Add him to the restock list.',
      },
    },
    {
      id: 's07', name: 'Mai Gamal', handle: 'maigamal.home', city: 'Giza',
      msgs: [
        ['c', 'عندكم الـ throw الأبيض اللي في البوست ده؟', 9 * H, { kind: 'shared_post', label: 'Shared post: autumn living room' }],
        ['b', 'ده الـ Natural، هيرجع قريب جداً', 7 * H],
        ['c', 'ممكن تبعتولي لما يرجع؟ وسعره كام؟', 6 * H + 50],
        ['b', '١٦٥ دولار، وأكيد هنبعتلك', 6 * H + 20],
      ],
      a: {
        summary: 'Saw the throw in a post and asked for it. Wants a message when the Natural is back.',
        intent: 'restock', topics: ['availability', 'pricing'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'restock', label: 'Asked to be notified' }],
        nextStep: 'Add her to the restock list.',
      },
    },
    // Quality complaint on the throw
    {
      id: 's06', name: 'Rana Fawzy', handle: 'rana.fawzy', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'الـ throw بيوبر جامد، الكنبة كلها بقت صوف', 6 * D],
        ['b', 'ده طبيعي في أول كام غسلة، جربي تغسليه على البارد وتنشريه مفرود', 6 * D - 2 * H],
        ['c', 'غسلته مرتين ولسه بيوبر، ده مش طبيعي بصراحة بالسعر ده', D + 3 * H],
        ['c', 'أنا عايزة أرجعه', D + 3 * H - 2],
        ['b', 'آسفين جداً يا رنا، هنراجع الموضوع ونرد عليكي', D + 50],
      ],
      a: {
        summary: 'Second complaint about the Siwa throw shedding after following the care advice. Now wants to return it.',
        intent: 'return_or_exchange', topics: ['product_quality'], products: [{ productId: 'siwa-throw', variant: 'Natural' }], sentiment: 'negative', language: 'ar-EG',
        signals: [{ kind: 'issue', label: 'Shedding after two washes' }, { kind: 'issue', label: 'Return requested' }],
        nextStep: 'Offer a return or replacement today, and check whether other buyers of the same batch report shedding.',
      },
    },
    // Sizing: Dune bedding
    {
      id: 's08', name: 'Mariam Khaled', handle: 'mariam.khaled', city: 'New Cairo',
      msgs: [
        ['c', 'Hi! El Dune set el King, el duvet cover dimensions kam?', 2 * D + 8 * H],
        ['b', 'Hi Mariam, the King duvet cover is 260 x 240 cm, fitted sheet 200 x 200 with 30 cm depth', 2 * D + 7 * H],
        ['c', 'Perfect, el sereer 200x200 fa King howa el sa7. W el Clay color available?', 2 * D + 7 * H - 10],
        ['b', 'Yes, King in Clay is in stock 🙏', 2 * D + 6 * H],
        ['c', 'Tayeb law atlobt el naharda, yewsal New Cairo emta?', 2 * D + 6 * H - 5],
        ['b', '2 to 3 working days', 2 * D + 5 * H],
        ['c', 'Ok tamam, hakalem gozi w arod 3aleeki', 2 * D + 5 * H - 4],
      ],
      a: {
        summary: 'Confirmed King fits her bed, chose Clay, asked about delivery to New Cairo, then said she would check with her husband. No order yet.',
        intent: 'buy', topics: ['sizing', 'delivery'], products: [{ productId: 'dune-bedding', variant: 'King, Clay' }], sentiment: 'positive', language: 'mixed',
        signals: [{ kind: 'opportunity', label: 'Size, colour and delivery confirmed' }, { kind: 'sizing', label: 'Needed cm dimensions' }],
        nextStep: 'Follow up within a day with the King Clay link and delivery estimate.',
      },
    },
    {
      id: 's09', name: 'Habiba Nabil', handle: 'habiba.nabil', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'ايه الفرق بين الـ Queen والـ King في طقم الـ Dune؟', 6 * D + 3 * H],
        ['b', 'الـ Queen لسرير ١٦٠×٢٠٠ والـ King لسرير ٢٠٠×٢٠٠', 6 * D + 2 * H],
        ['c', 'السرير عندي ١٦٠×٢٠٠ يبقى Queen. هطلب الـ Sand', 6 * D + 2 * H - 6],
        ['c', 'طلبت خلاص 🙌', 6 * D + H],
        ['b', 'تسلمي يا حبيبة! هيوصلك خلال يومين', 6 * D + 40],
      ],
      a: {
        summary: 'Asked the difference between Queen and King, picked Queen in Sand and ordered the same day.',
        intent: 'buy', topics: ['sizing'], products: [{ productId: 'dune-bedding', variant: 'Queen, Sand' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'opportunity', label: 'Said she ordered' }, { kind: 'sizing', label: 'Queen versus King' }],
        nextStep: 'Nothing needed. Order confirmed.',
      },
    },
    {
      id: 's10', name: 'Tamer Saad', handle: 'tamer.saad', city: 'Jeddah',
      msgs: [
        ['c', 'Does the Queen Dune set fit a 180 cm bed? The site only says Queen.', 3 * D + 4 * H],
        ['b', 'Queen fits 160 cm beds. For 180 cm the King is the right one', 3 * D + 2 * H],
        ['c', 'Would be good if the site listed cm. Ok, will think about it.', 3 * D + 2 * H - 8],
        ['b', 'Hi Tamer, following up on your question: for a 180 cm bed the King set is the one. The fitted sheet is 200 x 200 cm with 30 cm depth, and the duvet cover is 260 x 240 cm. Happy to help if anything else would make the choice easier.', 20 * H],
      ],
      a: {
        summary: 'Could not tell from the site which size fits a 180 cm bed. Left undecided.',
        intent: 'ask_before_buying', topics: ['sizing'], products: [{ productId: 'dune-bedding' }], sentiment: 'neutral', language: 'en',
        signals: [{ kind: 'sizing', label: 'Site lacks cm dimensions' }],
        nextStep: 'Add bed sizes in cm to the Dune product page.',
      },
    },
    {
      id: 's11', name: 'Aya Hossam', handle: 'aya.hossam', city: 'Cairo',
      msgs: [
        ['c', 'الـ fitted sheet عمقه كام؟ المرتبة عندي عالية ٣٥ سم', 4 * D + 6 * H],
        ['b', 'عمقه ٣٠ سم للأسف', 4 * D + 5 * H],
        ['c', 'يبقى مش هتنفع معايا 😕 لو عملتوا مقاس أعمق قولولي', 4 * D + 5 * H - 4],
      ],
      a: {
        summary: 'Her mattress is 35 cm deep and the fitted sheet is 30 cm. Lost sale; asked for a deeper version.',
        intent: 'ask_before_buying', topics: ['sizing'], products: [{ productId: 'dune-bedding' }], sentiment: 'mixed', language: 'ar-EG',
        signals: [{ kind: 'sizing', label: 'Fitted sheet too shallow' }, { kind: 'feedback', label: 'Wants a deep fitted sheet' }],
        nextStep: 'Note demand for a 40 cm deep fitted sheet.',
      },
    },
    // Sizing: mug capacity
    {
      id: 's12', name: 'Dina Fathy', handle: 'dina.fathy', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'el terracotta mug sa3etha kam ml?', D + 9 * H],
        ['b', 'Around 350 ml 🤎', D + 8 * H],
        ['c', 'Tamam perfect lel latte. Ha3mel order el set of 4 bokra', D + 8 * H - 6],
      ],
      a: {
        summary: 'Asked about mug capacity and said she would order the set of four the next day.',
        intent: 'buy', topics: ['sizing'], products: [{ productId: 'terracotta-mugs', variant: 'Set of 4' }], sentiment: 'positive', language: 'mixed',
        signals: [{ kind: 'opportunity', label: 'Said she would order tomorrow' }, { kind: 'sizing', label: 'Mug capacity' }],
        nextStep: 'Check for her order before following up. A matching order may already exist.',
      },
    },
    {
      id: 's13', name: 'Lina Haddad', handle: 'linahaddad', city: 'Dubai',
      msgs: [
        ['c', 'How big are the terracotta mugs? I want them for flat whites, not huge mugs', 2 * D + 2 * H],
        ['b', '350 ml and 9 cm tall', 2 * D + H],
        ['c', 'Bit too big for flat whites honestly. Do you make smaller cups?', 2 * D + H - 5],
        ['b', 'Not yet, but we’ll share that with the studio!', 2 * D + 30],
        ['c', 'I’d buy an espresso set straight away if you did', 2 * D + 25],
      ],
      a: {
        summary: 'Mugs are too large for flat whites. Would buy a smaller espresso set.',
        intent: 'ask_before_buying', topics: ['sizing', 'product_question'], products: [{ productId: 'terracotta-mugs' }], sentiment: 'neutral', language: 'en',
        signals: [{ kind: 'feedback', label: 'Wants a smaller cup' }],
        nextStep: 'Share the request for an espresso set with the product team.',
      },
    },
    {
      id: 's14', name: 'Ziad Emad', handle: 'ziademad', city: 'Cairo',
      msgs: [
        ['c', 'الـ ember mug بياخد كام؟ وينفع في الميكروويف؟', 20 * H],
        ['b', '٣٠٠ مل، وينفع في الميكروويف والديش واشر', 19 * H],
        ['c', 'حلو أوي، شكراً', 19 * H - 3],
      ],
      a: {
        summary: 'Routine question about the ember mug’s capacity and microwave safety.',
        intent: 'ask_before_buying', topics: ['sizing', 'product_question'], products: [{ productId: 'ember-mug' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'question', label: 'Capacity and care' }],
        nextStep: 'No follow-up needed. Capacity and care should be on the product page.',
      },
    },
    // Delivery
    {
      id: 's15', name: 'Reem Al-Otaibi', handle: 'reem.otb', city: 'Riyadh', orders: 3,
      msgs: [
        ['c', 'Hi, my Dune bedding set was supposed to arrive Sunday. Tracking hasn’t moved since Friday.', 3 * D + 2 * H],
        ['b', 'So sorry Reem, let me check with the courier for you right now.', 3 * D + H],
        ['c', 'It’s a gift for my sister’s new flat, she moves in Thursday. Can I get a refund if it doesn’t make it?', D + 4 * H],
        ['c', 'Any update? Still nothing on tracking.', 5 * H],
      ],
      a: {
        summary: 'Gift order stuck in transit on the Riyadh route since Friday. Asked about a refund and has had no reply for over a day.',
        intent: 'complain', topics: ['delivery', 'order_status'], products: [{ productId: 'dune-bedding' }], sentiment: 'negative', language: 'en',
        signals: [{ kind: 'issue', label: 'Shipment stuck since Friday' }, { kind: 'issue', label: 'Refund requested' }, { kind: 'issue', label: 'Two messages unanswered' }],
        nextStep: 'Reply today with a courier update and a clear refund answer before Thursday.',
      },
    },
    {
      id: 's16', name: 'Hana Mahmoud', handle: 'hana.mahmoudd', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'Order SH-10422 lessa mawsalsh, it’s been 9 days', 2 * D + 3 * H],
        ['c', 'Hello??', D + 2 * H],
        ['c', 'ana 3ayza a3raf el order fen, 7ad yerod please', 3 * H],
      ],
      a: {
        summary: 'Order nine days late. Three messages over two days, none answered.',
        intent: 'track_order', topics: ['delivery', 'order_status'], products: [], sentiment: 'negative', language: 'mixed',
        signals: [{ kind: 'issue', label: 'Three messages unanswered' }, { kind: 'issue', label: 'Order 9 days late' }],
        nextStep: 'Reply now with the order status for SH-10422.',
      },
    },
    {
      id: 's17', name: 'Omar Tarek', handle: 'omartarek', city: 'Alexandria', orders: 2,
      msgs: [
        ['c', 'الأوردر متأخر ٣ أيام ومحدش بيرد على التليفون', 5 * D + 4 * H],
        ['b', 'آسفين جداً يا عمر، كلمنا شركة الشحن والمندوب هيوصلك بكرة الصبح', 5 * D + 3 * H],
        ['c', 'وصل الحمد لله، شكراً على المتابعة 🙏', 4 * D + 2 * H],
        ['b', 'أهلاً يا عمر، حبينا نطمن إن الـ Oasis bowl وصل سليم وعجبك. وآسفين تاني على التأخير 🤍', 3 * D + 3 * H],
        ['c', 'كله تمام والطبق تحفة بجد، وأكيد هطلب تاني', 3 * D + H],
      ],
      a: {
        summary: 'Order was three days late. The team chased the courier and it arrived the next morning. A check-in later got a warm reply: he loves the bowl and will order again.',
        intent: 'track_order', topics: ['delivery'], products: [{ productId: 'oasis-bowl' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'issue', label: 'Late delivery, resolved' }],
        nextStep: 'Nothing needed. Resolved.',
      },
    },
    {
      id: 's18', name: 'Faisal Al-Harbi', handle: 'faisal.hrb', city: 'Riyadh', orders: 1,
      msgs: [
        ['c', 'Courier says delivered but nothing came. Order SH-10455, the Dune queen set.', 3 * D + 6 * H],
        ['b', 'We’re checking with the courier now, really sorry Faisal', 3 * D + 5 * H],
        ['c', 'It’s been two days since you said that.', D + 6 * H],
        ['b', 'You’re right, sorry. The courier opened a claim, we’ll update you by tomorrow', D + 6 * H - 30],
        ['b', 'Faisal, we’ve resent your Queen set by express. It’s out for delivery tomorrow morning.', 20 * H],
        ['c', 'It arrived. Honestly it’s been a stressful week, but thanks for sorting it.', 4 * H],
      ],
      a: {
        summary: 'Marked delivered on the Riyadh route but never received. After a courier claim the set was resent by express and arrived; he is relieved but says it was a stressful week.',
        intent: 'complain', topics: ['delivery'], products: [{ productId: 'dune-bedding', variant: 'Queen' }], sentiment: 'mixed', language: 'en',
        signals: [{ kind: 'issue', label: 'Delivered but not received, resent' }, { kind: 'feedback', label: 'Still bruised by the experience' }],
        nextStep: 'Resolved. A personal check-in in a day or two would help him end on a good note.',
      },
    },
    {
      id: 's19', name: 'Noha Ibrahim', handle: 'noha.ibrahim', city: 'Cairo', orders: 4,
      msgs: [
        ['c', 'الأوردر هيوصل امتى؟', 11 * H],
        ['b', 'بكرة إن شاء الله، المندوب هيكلمك قبلها', 10 * H],
        ['c', 'تمام شكراً', 10 * H - 4],
      ],
      a: {
        summary: 'Routine delivery date question, answered.',
        intent: 'track_order', topics: ['order_status'], products: [], sentiment: 'neutral', language: 'ar-EG',
        signals: [],
        nextStep: 'No follow-up needed.',
      },
    },
    // Damaged and wrong items
    {
      id: 's20', name: 'Mostafa Kamal', handle: 'mostafa.kml', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'الطقم وصل و٢ من الـ ٤ مكسورين', 2 * D + 4 * H, { kind: 'image', label: 'Photo: two broken mugs in the box' }],
        ['c', 'ممكن استبدال؟', 2 * D + 4 * H - 1],
        ['c', 'محدش رد لحد دلوقتي؟', 20 * H],
      ],
      a: {
        summary: 'Two of four Terracotta mugs arrived broken, with a photo. Asked for an exchange and has waited two days without a reply.',
        intent: 'return_or_exchange', topics: ['damaged'], products: [{ productId: 'terracotta-mugs', variant: 'Set of 4' }], sentiment: 'negative', language: 'ar-EG',
        signals: [{ kind: 'issue', label: 'Arrived broken, photo sent' }, { kind: 'issue', label: 'No reply in two days' }],
        nextStep: 'Reply today and send two replacement mugs.',
      },
    },
    {
      id: 's21', name: 'Salma Kamel', handle: 'salmakamel', city: 'Cairo', orders: 2,
      msgs: [
        ['c', 'Hi, I ordered the Oasis bowl in Sand bas el wasal Charcoal', 2 * D + 9 * H, { kind: 'image', label: 'Photo: charcoal bowl with packing slip' }],
        ['b', 'So sorry Salma! We’ll arrange an exchange, the courier will pick it up', 2 * D + 7 * H],
        ['c', 'ok, imta?', 2 * D + 7 * H - 5],
        ['b', 'Thursday between 12 and 4', D + 10 * H],
        ['c', 'وصلت الـ Sand خلاص، تمام كده 👍', 9 * H],
      ],
      a: {
        summary: 'Received the Charcoal bowl instead of Sand. The exchange went through and she confirmed the Sand bowl arrived.',
        intent: 'return_or_exchange', topics: ['wrong_item'], products: [{ productId: 'oasis-bowl', variant: 'Sand glaze' }], sentiment: 'mixed', language: 'mixed',
        signals: [{ kind: 'issue', label: 'Wrong colour shipped, exchanged' }],
        nextStep: 'Nothing urgent. Exchange complete.',
      },
    },
    {
      id: 's22', name: 'Ahmed Shawky', handle: 'a.shawky', city: 'Giza', orders: 2,
      msgs: [
        ['c', 'واحدة من الـ coasters فيها شرخ صغير', 6 * D + 2 * H, { kind: 'image', label: 'Photo: small chip on one coaster' }],
        ['b', 'آسفين يا أحمد، تحب نبعتلك واحدة بدالها؟', 6 * D + H],
        ['c', 'لا مش مشكلة خالص، حلوين جداً بجد', 6 * D + 30],
      ],
      a: {
        summary: 'Reported a small chip on one coaster, then said it was not a problem and he likes them.',
        intent: 'give_feedback', topics: ['damaged', 'praise'], products: [{ productId: 'clay-coasters' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'issue', label: 'Minor chip, customer not bothered' }],
        nextStep: 'Nothing needed.',
      },
    },
    // Pricing
    {
      id: 's23', name: 'Karim Wael', handle: 'karimwael', city: 'Cairo',
      msgs: [
        ['c', 'el kilim cover b 58? da ghali awi le cover bas', D + 2 * H],
        ['b', 'It’s handwoven in Fayoum, each one takes two days to make', D + H],
        ['c', 'fahem bas law fe offer etnein b 100 ana akhod etnein', D + H - 6],
      ],
      a: {
        summary: 'Found the Kilim cover expensive, but would buy two if there were a two-for-100 offer.',
        intent: 'ask_before_buying', topics: ['pricing'], products: [{ productId: 'kilim-cushion' }], sentiment: 'mixed', language: 'mixed',
        signals: [{ kind: 'price_objection', label: 'Price too high for a cover' }, { kind: 'opportunity', label: 'Would buy two with a bundle' }],
        nextStep: 'Decide whether a two-cover bundle makes sense, then reply.',
      },
    },
    {
      id: 's24', name: 'Nour El-Din', handle: 'nour.studio', city: 'Cairo',
      msgs: [
        ['c', 'Hi, we’re a small agency and want 30 Ember mugs as client gifts. Any corporate price?', 4 * D + 5 * H],
        ['b', 'Love that! We can do 10% off for 25 or more', 4 * D + 3 * H],
        ['c', 'Could you do 15%? And do you have gift boxes?', 4 * D + 3 * H - 10],
        ['b', 'Let me check with the team and come back to you', 4 * D + 2 * H],
      ],
      a: {
        summary: 'Agency wants 30 Ember mugs as client gifts, asked for 15% off and gift boxes.',
        intent: 'buy', topics: ['pricing', 'product_question'], products: [{ productId: 'ember-mug' }], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'opportunity', label: 'Bulk order, 30 units' }, { kind: 'price_objection', label: 'Asked for 15% off' }],
        nextStep: 'Send the agreed price and gift box options. This is the largest open order.',
      },
    },
    {
      id: 's25', name: 'Yasmin Adel', handle: 'yasmin.adel', city: 'Heliopolis',
      msgs: [
        ['c', 'ينفع الدفع عند الاستلام؟', 4 * D + 8 * H],
        ['b', 'أيوه متاح في القاهرة والجيزة', 4 * D + 7 * H],
        ['c', 'تمام، والـ Oasis bowl الـ Sand لونه زي الصورة؟', 4 * D + 7 * H - 3],
        ['b', 'أيوه بالظبط، الصورة من غير فلتر', 4 * D + 6 * H],
      ],
      a: {
        summary: 'Asked about cash on delivery and whether the Sand bowl matches the photo. Both answered; no order since.',
        intent: 'ask_before_buying', topics: ['payment', 'product_question'], products: [{ productId: 'oasis-bowl', variant: 'Sand glaze' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'opportunity', label: 'Questions answered, no order yet' }],
        nextStep: 'A short follow-up with the Sand bowl link could close this.',
      },
    },
    {
      id: 's26', name: 'Mohamed Lotfy', handle: 'm.lotfy', city: 'Alexandria',
      msgs: [
        ['c', 'الـ Dune set غالي شوية، مفيش خصم؟', 3 * D + 9 * H],
        ['b', 'هيكون في عرض في الـ Black Friday', 3 * D + 8 * H],
        ['c', 'خلاص هستنى', 3 * D + 8 * H - 2],
      ],
      a: {
        summary: 'Finds the Dune set expensive and will wait for Black Friday.',
        intent: 'ask_before_buying', topics: ['pricing'], products: [{ productId: 'dune-bedding' }], sentiment: 'neutral', language: 'ar-EG',
        signals: [{ kind: 'price_objection', label: 'Waiting for a sale' }],
        nextStep: 'Remind him when the Black Friday offer starts.',
      },
    },
    {
      id: 's27', name: 'Ahmed Fouad', handle: 'ahmedfouad', city: 'Riyadh',
      msgs: [
        ['c', 'How much is shipping to KSA for the Siwa throw in Indigo?', 6 * D + 5 * H],
        ['b', 'Shipping to KSA is 25, delivered in 5 to 7 days', 6 * D + 4 * H],
        ['c', 'Too much with customs on top. I’ll pass, thanks', 6 * D + 4 * H - 10],
      ],
      a: {
        summary: 'Wanted the Indigo throw but dropped it over shipping and customs to Saudi Arabia.',
        intent: 'ask_before_buying', topics: ['pricing', 'delivery'], products: [{ productId: 'siwa-throw', variant: 'Indigo' }], sentiment: 'mixed', language: 'en',
        signals: [{ kind: 'price_objection', label: 'KSA shipping and customs' }],
        nextStep: 'Nothing for now. Counts toward the KSA shipping cost pattern.',
      },
    },
    // Praise and feedback
    {
      id: 's28', name: 'Malak Hassan', handle: 'malak.hsn', city: 'Cairo', orders: 2,
      msgs: [
        ['c', 'الطقم وصل والتغليف تحفة 😍 شكراً بجد', 22 * H, { kind: 'image', label: 'Photo: unboxed mug set with the linen wrap' }],
        ['b', 'إحنا اللي بنشكرك يا ملك 🤍', 21 * H],
      ],
      a: {
        summary: 'Loved the packaging of her mug set and sent a photo.',
        intent: 'give_feedback', topics: ['praise'], products: [{ productId: 'terracotta-mugs' }], sentiment: 'positive', language: 'ar-EG',
        signals: [{ kind: 'feedback', label: 'Packaging praise, photo shared' }],
        nextStep: 'Ask if you can repost her photo.',
      },
    },
    {
      id: 's29', name: 'Sara Nabil', handle: 'saranabil', city: 'Dubai', orders: 1,
      msgs: [
        ['c', 'Received the Oasis bowl, it’s even prettier than the photos. The packaging was so thoughtful.', 3 * D + 3 * H],
        ['b', 'Thank you Sara! That means a lot to the studio', 3 * D + 2 * H],
      ],
      a: {
        summary: 'Happy with the Oasis bowl and the packaging.',
        intent: 'give_feedback', topics: ['praise'], products: [{ productId: 'oasis-bowl' }], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'feedback', label: 'Packaging praise' }],
        nextStep: 'Nothing needed.',
      },
    },
    {
      id: 's30', name: 'Laila Ezz', handle: 'laila.ezz', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'El ember mug gamda gedan, bas the handle is a bit small for my hand', 7 * H],
        ['b', 'Thank you Laila, we’ll pass the handle note to the studio', 6 * H],
      ],
      a: {
        summary: 'Likes the Ember mug but finds the handle small.',
        intent: 'give_feedback', topics: ['praise', 'product_quality'], products: [{ productId: 'ember-mug' }], sentiment: 'mixed', language: 'mixed',
        signals: [{ kind: 'feedback', label: 'Handle too small' }],
        nextStep: 'Share with the studio before the next Ember batch.',
      },
    },
    // Last week: routine threads that give the trend and the sentiment comparison a baseline
    {
      id: 's31', name: 'Mona Saber', handle: 'mona.saber', city: 'Cairo', orders: 1,
      msgs: [
        ['c', 'الطقم الـ Queen وصل امتى بالظبط؟', 9 * D + 4 * H],
        ['b', 'خلال يومين عمل إن شاء الله', 9 * D + 3 * H],
        ['c', 'تمام شكراً', 9 * D + 3 * H - 5],
      ],
      a: { summary: 'Routine delivery time question, answered.', intent: 'track_order', topics: ['order_status'], products: [{ productId: 'dune-bedding', variant: 'Queen' }], sentiment: 'neutral', language: 'ar-EG', signals: [], nextStep: 'No follow-up needed.' },
    },
    {
      id: 's32', name: 'Karma Ashraf', handle: 'karma.ashraf', city: 'Cairo', orders: 2,
      msgs: [
        ['c', 'The coasters are so pretty on my coffee table, ordering another set as a gift', 10 * D + 6 * H, { kind: 'image', label: 'Photo: coasters on a coffee table' }],
        ['b', 'Love this Karma, thank you!', 10 * D + 5 * H],
      ],
      a: { summary: 'Happy with the coasters and reordering a set as a gift.', intent: 'give_feedback', topics: ['praise'], products: [{ productId: 'clay-coasters' }], sentiment: 'positive', language: 'en', signals: [{ kind: 'feedback', label: 'Repeat purchase' }], nextStep: 'Nothing needed.' },
    },
    {
      id: 's33', name: 'Hesham Ragab', handle: 'hesham.rgb', city: 'Giza',
      msgs: [
        ['c', 'el oasis bowl yenfa3 fel oven?', 11 * D + 2 * H],
        ['b', 'Not in the oven, but dishwasher safe', 11 * D + H],
        ['c', 'ok tamam', 11 * D + H - 4],
      ],
      a: { summary: 'Asked whether the Oasis bowl is oven safe.', intent: 'ask_before_buying', topics: ['product_question'], products: [{ productId: 'oasis-bowl' }], sentiment: 'neutral', language: 'mixed', signals: [{ kind: 'question', label: 'Care instructions' }], nextStep: 'Add oven and dishwasher guidance to the product page.' },
    },
    {
      id: 's34', name: 'Dalia Fikry', handle: 'dalia.fikry', city: 'Alexandria', orders: 1,
      msgs: [
        ['c', 'الأوردر اتأخر يومين، في حاجة؟', 12 * D + 5 * H],
        ['b', 'آسفين يا داليا، المندوب هيوصلك النهارده', 12 * D + 4 * H],
        ['c', 'وصل، شكراً', 11 * D + 20 * H],
      ],
      a: { summary: 'Order two days late; delivered the same day after the team chased it.', intent: 'track_order', topics: ['delivery'], products: [], sentiment: 'mixed', language: 'ar-EG', signals: [{ kind: 'issue', label: 'Late delivery, resolved' }], nextStep: 'Nothing needed.' },
    },
    {
      id: 's35', name: 'Rowan Tamer', handle: 'rowan.tmr', city: 'Cairo', orders: 3,
      msgs: [
        ['c', 'The Siwa throw is the softest thing I own 🤍', 13 * D + 3 * H],
        ['b', 'That makes our week, Rowan!', 13 * D + 2 * H],
      ],
      a: { summary: 'Praised the Siwa throw.', intent: 'give_feedback', topics: ['praise'], products: [{ productId: 'siwa-throw', variant: 'Indigo' }], sentiment: 'positive', language: 'en', signals: [{ kind: 'feedback', label: 'Product praise' }], nextStep: 'Nothing needed.' },
    },
    {
      id: 's36', name: 'Amr Sobhy', handle: 'amr.sobhy', city: 'Cairo',
      msgs: [
        ['c', 'Bkam el terracotta set? w fe alwan tanya?', 8 * D + 6 * H],
        ['b', '68 for the set of four, only in terracotta for now', 8 * D + 5 * H],
      ],
      a: { summary: 'Asked the price of the mug set and whether other colours exist.', intent: 'ask_before_buying', topics: ['pricing', 'product_question'], products: [{ productId: 'terracotta-mugs' }], sentiment: 'neutral', language: 'mixed', signals: [{ kind: 'question', label: 'Asked for other colours' }], nextStep: 'No follow-up needed.' },
    },
  ],
  opportunities: [
    { id: 'opp-s08', conversationId: 's08', productIds: ['dune-bedding'], productLabel: 'King, Clay', title: 'Ready to order the King Dune set', explanation: 'Confirmed King fits her bed, chose Clay and asked about delivery to New Cairo. Stopped to check with her husband two days ago.', intent: 'high', status: 'new', estimatedValue: 240, ev: [2, 4, 6] },
    { id: 'opp-s24', conversationId: 's24', productIds: ['ember-mug'], productLabel: '30 units, corporate gift', title: 'Corporate order for 30 Ember mugs', explanation: 'An agency wants 30 mugs for client gifts. Asked for 15% off and gift boxes; the team promised to come back.', intent: 'high', status: 'followed_up', estimatedValue: 970, ev: [0, 2] },
    { id: 'opp-s01', conversationId: 's01', productIds: ['siwa-throw'], productLabel: 'Natural, 2 units', title: 'Two Natural throws as gifts', explanation: 'Returning customer asked to reserve two Natural throws as soon as they are back, delivered before 15 November.', intent: 'high', status: 'new', estimatedValue: 330, ev: [2, 3] },
    {
      id: 'opp-s12', conversationId: 's12', productIds: ['terracotta-mugs'], productLabel: 'Set of 4', title: 'Said she would order the mug set', explanation: 'Asked about capacity and said she would order the set of four the next day.', intent: 'medium', status: 'new', estimatedValue: 68, ev: [2],
      orderMatch: { orderRef: 'SH-10498', amount: 68, placedAt: ago(18 * H), basis: 'Same name and phone number as a Shopify order for the Terracotta mug set, placed 14 hours after the chat' },
    },
    { id: 'opp-s25', conversationId: 's25', productIds: ['oasis-bowl'], productLabel: 'Sand glaze', title: 'Questions answered, no order yet', explanation: 'Asked about cash on delivery and the Sand colour. Both answered four days ago and she has not ordered.', intent: 'medium', status: 'new', estimatedValue: 92, ev: [0, 2] },
    { id: 'opp-s23', conversationId: 's23', productIds: ['kilim-cushion'], productLabel: '2 covers', title: 'Would buy two covers with a bundle', explanation: 'Finds one cover expensive but offered to buy two for 100.', intent: 'low', status: 'new', estimatedValue: 100, ev: [2] },
    { id: 'opp-s26', conversationId: 's26', productIds: ['dune-bedding'], title: 'Waiting for Black Friday', explanation: 'Interested in the Dune set but waiting for a discount.', intent: 'low', status: 'new', estimatedValue: 240, ev: [0, 2] },
    { id: 'opp-s09', conversationId: 's09', productIds: ['dune-bedding'], productLabel: 'Queen, Sand', title: 'Ordered the Queen Dune set', explanation: 'Sized her bed, picked Queen in Sand and said she ordered the same day.', intent: 'high', status: 'converted', estimatedValue: 240, orderRef: 'SH-10471', ev: [2, 3] },
    { id: 'opp-s27', conversationId: 's27', productIds: ['siwa-throw'], productLabel: 'Indigo', title: 'Indigo throw to Riyadh', explanation: 'Asked about shipping the Indigo throw to Saudi Arabia.', intent: 'medium', status: 'closed', reason: 'Shipping cost', note: 'Customs plus shipping too high for him. Nothing to do for now.', ev: [0] },
  ],
  risks: [
    { id: 'risk-s15', conversationId: 's15', productIds: ['dune-bedding'], issue: 'delivery', title: 'Gift order stuck in transit', summary: 'Dune set stuck on the Riyadh route since Friday. Needed by Thursday; asked about a refund and has had no reply for over a day.', priority: 'high', status: 'open', unansweredCount: 2, ev: [0, 2, 3] },
    { id: 'risk-s16', conversationId: 's16', productIds: [], issue: 'unanswered', title: 'Three messages, no reply', summary: 'Order SH-10422 is nine days late. She has written three times in two days and nobody has replied.', priority: 'high', status: 'open', unansweredCount: 3, ev: [0, 1, 2] },
    { id: 'risk-s20', conversationId: 's20', productIds: ['terracotta-mugs'], issue: 'damaged', title: 'Mugs arrived broken', summary: 'Two of four mugs broken on arrival, photo attached. Asked for an exchange two days ago with no reply.', priority: 'high', status: 'open', unansweredCount: 3, ev: [0, 1, 2] },
    { id: 'risk-s06', conversationId: 's06', productIds: ['siwa-throw'], issue: 'repeated_dissatisfaction', title: 'Throw still shedding, wants a return', summary: 'Second complaint about shedding after following the care advice. Now asking to return it.', priority: 'medium', status: 'in_progress', ev: [0, 2, 3] },
    { id: 'risk-s18', conversationId: 's18', productIds: ['dune-bedding'], issue: 'delivery', title: 'Marked delivered, never arrived', summary: 'Courier marked the order delivered in Riyadh but it never came. Resent by express after a claim; it arrived, but he called it a stressful week.', priority: 'medium', status: 'resolved', note: 'Resent by express, delivered.', ev: [0, 2, 5] },
    { id: 'risk-s21', conversationId: 's21', productIds: ['oasis-bowl'], issue: 'wrong_item', title: 'Wrong bowl colour shipped', summary: 'Received Charcoal instead of Sand. Exchanged; she confirmed the Sand bowl arrived.', priority: 'medium', status: 'resolved', note: 'Exchanged for Sand.', ev: [0, 4] },
    { id: 'risk-s17', conversationId: 's17', productIds: ['oasis-bowl'], issue: 'delivery', title: 'Order three days late', summary: 'Late order chased with the courier and delivered the next morning.', priority: 'low', status: 'resolved', note: 'Delivered, customer thanked us.', ev: [0] },
    { id: 'risk-s22', conversationId: 's22', productIds: ['clay-coasters'], issue: 'damaged', title: 'Small chip on a coaster', summary: 'Reported a small chip, then said it was not a problem.', priority: 'low', status: 'dismissed', reason: 'Customer is happy', ev: [0] },
  ],
  insights: [
    {
      id: 'ins-restock-throw', kind: 'restock', important: true, productId: 'siwa-throw', title: 'Six customers waiting for the Natural Siwa throw', previousCount: 2,
      detail: 'The Natural colour sold out and requests tripled this week. One customer wants two as gifts before 15 November; two declined Indigo and are waiting.',
      conversationIds: ['s01', 's02', 's03', 's04', 's05', 's07'], suggestedAction: 'Confirm the restock date, then tell these six customers when it lands. A waitlist on the product page would capture the rest.', relevantAgent: 'store',
    },
    {
      id: 'ins-delivery', kind: 'delivery', important: true, title: 'Delivery complaints doubled this week', previousCount: 2,
      detail: 'Four delivery complaints against two last week. Two are on the Riyadh route, and two customers have waited over a day for a reply.',
      conversationIds: ['s15', 's16', 's17', 's18'], suggestedAction: 'Answer Reem and Hana today, and raise the Riyadh route with the courier.',
    },
    {
      id: 'ins-sizing-dune', kind: 'sizing', important: true, productId: 'dune-bedding', title: 'Customers can’t tell which Dune size fits their bed', previousCount: 3,
      detail: 'The product page says Queen and King without centimetres. Customers ask for bed sizes and fitted sheet depth before buying; one walked away because the sheet is too shallow.',
      conversationIds: ['s08', 's09', 's10', 's11'], suggestedAction: 'Add bed sizes in cm and the 30 cm fitted sheet depth to the Dune product page.', relevantAgent: 'store',
    },
    {
      id: 'ins-mug-capacity', kind: 'sizing', productId: 'terracotta-mugs', title: 'Mug capacity is the first question', previousCount: 4,
      detail: 'Customers ask how much the mugs hold before ordering. One found them too large for flat whites.',
      conversationIds: ['s12', 's13', 's14'], suggestedAction: 'Show capacity and height on every mug page.', relevantAgent: 'store',
    },
    {
      id: 'ins-price', kind: 'price', title: 'Price pushback on covers, bedding and Gulf shipping', previousCount: 2,
      detail: 'Customers ask for bundles or wait for sales. Shipping and customs to Saudi Arabia lost one sale; an agency is negotiating a bulk discount.',
      conversationIds: ['s23', 's24', 's26', 's27'], suggestedAction: 'Consider a two-cover bundle and check the KSA shipping fee.',
    },
    {
      id: 'ins-damage', kind: 'damage', productId: 'terracotta-mugs', title: 'Breakage in transit', previousCount: 1,
      detail: 'Two reports of chipped or broken ceramics. The Terracotta set had two of four mugs broken.',
      conversationIds: ['s20', 's22'], suggestedAction: 'Check the mug set packaging with the studio.',
    },
    {
      id: 'ins-feedback', kind: 'feedback', title: 'Product requests: smaller cups, deeper sheets, bigger handles', previousCount: 1,
      detail: 'Customers are asking for an espresso size, a deeper fitted sheet and a larger Ember mug handle.',
      conversationIds: ['s11', 's13', 's30'], suggestedAction: 'Share with the studio before planning the next batches.',
    },
    {
      id: 'ins-praise', kind: 'praise', title: 'Packaging keeps winning praise', previousCount: 3,
      detail: 'Customers mention the linen wrap and presentation unprompted, some with photos.',
      conversationIds: ['s28', 's29', 's22'], suggestedAction: 'Ask for permission to repost customer photos.',
    },
  ],
  questions: [
    { id: 'q-throw', question: 'When is the Natural Siwa throw back?', conversationIds: ['s01', 's02', 's03', 's04', 's05', 's07'], answeredOnSite: false },
    { id: 'q-dune-size', question: 'Which Dune size fits my bed?', conversationIds: ['s08', 's09', 's10', 's11'], answeredOnSite: false },
    { id: 'q-mug', question: 'How much does the mug hold?', conversationIds: ['s12', 's13', 's14'], answeredOnSite: false },
    { id: 'q-order', question: 'Where is my order?', conversationIds: ['s16', 's17', 's19'], answeredOnSite: true },
    { id: 'q-ship', question: 'Do you ship to my area, and how much?', conversationIds: ['s05', 's27'], answeredOnSite: true },
  ],
  history: [
    { caseId: 'opp-s24', minutesAgo: 4 * D + 2 * H, from: 'new', to: 'followed_up', note: 'Asked the studio about gift boxes. Will quote 12%.' },
    { caseId: 'opp-s09', minutesAgo: 6 * D, from: 'new', to: 'converted', note: 'Order SH-10471' },
    { caseId: 'opp-s27', minutesAgo: 5 * D + 20 * H, from: 'new', to: 'closed', note: 'Shipping cost' },
    { caseId: 'risk-s18', minutesAgo: D + 6 * H, from: 'open', to: 'in_progress', note: 'Courier claim opened.' },
    { caseId: 'risk-s21', minutesAgo: 2 * D + 7 * H, from: 'open', to: 'in_progress' },
    { caseId: 'risk-s06', minutesAgo: D + 45, from: 'open', to: 'in_progress', note: 'Checking the batch with the supplier.' },
    { caseId: 'risk-s21', minutesAgo: 8 * H, from: 'in_progress', to: 'resolved', note: 'Exchanged for Sand.' },
    { caseId: 'risk-s18', minutesAgo: 3 * H, from: 'in_progress', to: 'resolved', note: 'Resent by express, delivered.' },
    { caseId: 'risk-s17', minutesAgo: 4 * D + H, from: 'open', to: 'resolved', note: 'Delivered, customer thanked us.' },
    { caseId: 'risk-s22', minutesAgo: 6 * D, from: 'open', to: 'dismissed', note: 'Customer is happy' },
  ],
}

// ---------------------------------------------------------------------------
// Noor Skin: Dubai skincare brand, customers across the Gulf.

const NOOR: BrandSeed = {
  headline: 'Barrier mist is sold out and three customers are asking for it. One customer reports redness from the Vitamin C serum and needs a reply today.',
  account: '@noor.skin',
  staff: ['Aisha'],
  products: [
    { id: 'vitc-serum', name: 'Vitamin C serum', price: 48 },
    { id: 'hydra-gel', name: 'Hydra gel moisturiser', price: 42 },
    { id: 'spf50', name: 'SPF 50 fluid', price: 36 },
    { id: 'night-oil', name: 'Night repair oil', price: 58 },
    { id: 'clay-mask', name: 'Clay mask', price: 32 },
    { id: 'barrier-mist', name: 'Barrier mist', price: 29, outOfStock: ['100 ml'] },
  ],
  conversations: [
    {
      id: 'n01', name: 'Sara Al Mansoori', handle: 'sara.almansoori', city: 'Dubai', orders: 2,
      msgs: [
        ['c', 'Can I use the vitamin C serum with my SPF?', D + 5 * H],
        ['b', 'Yes! Serum first, then SPF once it has absorbed', D + 4 * H],
        ['c', 'Perfect. And the hydra gel goes in between?', D + 4 * H - 4],
        ['b', 'Exactly: serum, hydra gel, then SPF 50', D + 3 * H],
        ['c', 'Great, adding all three to my cart now', D + 3 * H - 2],
      ],
      a: {
        summary: 'Built a morning routine with the team and said she is adding serum, moisturiser and SPF to her cart.',
        intent: 'buy', topics: ['product_question'], products: [{ productId: 'vitc-serum' }, { productId: 'hydra-gel' }, { productId: 'spf50' }], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'opportunity', label: 'Three products in cart' }],
        nextStep: 'Check for her order. If none by tomorrow, a short reminder could close it.',
      },
    },
    {
      id: 'n02', name: 'Noura Al Shamsi', handle: 'noura.shamsi', city: 'Abu Dhabi', orders: 3,
      msgs: [
        ['c', 'صار لي أسبوعين على السيروم وبشرتي صارت أنعم بكثير 🤍', 2 * D + 6 * H],
        ['c', 'بطلب حبة ثانية، في عرض على الحبتين؟', 2 * D + 6 * H - 1],
        ['b', 'يسعدنا! عندنا ١٠٪ على الحبتين هالأسبوع', 2 * D + 5 * H],
        ['c', 'تم الطلب 👌', 2 * D + 3 * H],
      ],
      a: {
        summary: 'Happy with the serum after two weeks and reordered two bottles with the weekly offer.',
        intent: 'buy', topics: ['praise', 'pricing'], products: [{ productId: 'vitc-serum' }], sentiment: 'positive', language: 'ar',
        signals: [{ kind: 'feedback', label: 'Visible results' }, { kind: 'opportunity', label: 'Reorder placed' }],
        nextStep: 'Nothing needed. Order placed.',
      },
    },
    {
      id: 'n03', name: 'Fatima Al Zaabi', handle: 'fatimazb', city: 'Sharjah', orders: 1,
      msgs: [
        ['c', 'السيروم يحرقني شوي، طبيعي؟', 2 * D + 2 * H],
        ['b', 'الوخز الخفيف طبيعي أول أسبوع، جربيه يوم بعد يوم', 2 * D + H],
        ['c', 'بس صار احمرار وما راح لليوم الثاني', 7 * H, { kind: 'image', label: 'Photo: redness on cheek' }],
        ['c', 'أوقفه؟', 7 * H - 1],
      ],
      a: {
        summary: 'Redness that lasted into the next day after using the Vitamin C serum, with a photo. Asking whether to stop.',
        intent: 'complain', topics: ['product_quality'], products: [{ productId: 'vitc-serum' }], sentiment: 'negative', language: 'ar',
        signals: [{ kind: 'issue', label: 'Possible skin reaction' }, { kind: 'issue', label: 'Two messages unanswered' }],
        nextStep: 'Reply today: advise stopping, and offer a refund or a gentler product.',
      },
    },
    {
      id: 'n04', name: 'Aisha Rahman', handle: 'aisha.rahman', city: 'Dubai', orders: 2,
      msgs: [
        ['c', 'When is the barrier mist back?? Mine is almost empty', 3 * D + 4 * H],
        ['b', 'Next week! We’ll let you know', 3 * D + 2 * H],
      ],
      a: {
        summary: 'Repeat buyer running out of barrier mist, asked when it is back.',
        intent: 'restock', topics: ['availability'], products: [{ productId: 'barrier-mist' }], sentiment: 'neutral', language: 'en',
        signals: [{ kind: 'restock', label: 'Repeat buyer running out' }],
        nextStep: 'Notify on restock.',
      },
    },
    {
      id: 'n05', name: 'Maha Al Qahtani', handle: 'maha.qht', city: 'Riyadh',
      msgs: [
        ['c', 'Barrier mist متى يرجع؟ وتوصلون الرياض؟', D + 9 * H],
        ['b', 'الأسبوع الجاي إن شاء الله، ونعم نوصل الرياض خلال ٣ إلى ٥ أيام', D + 8 * H],
      ],
      a: {
        summary: 'Asked when barrier mist is back and whether Noor ships to Riyadh.',
        intent: 'restock', topics: ['availability', 'delivery'], products: [{ productId: 'barrier-mist' }], sentiment: 'neutral', language: 'mixed',
        signals: [{ kind: 'restock', label: 'Asked for restock date' }],
        nextStep: 'Notify on restock.',
      },
    },
    {
      id: 'n11', name: 'Shamma Al Ketbi', handle: 'shamma.k', city: 'Abu Dhabi',
      msgs: [
        ['c', 'Is the barrier mist fragrance free? And when is it back in stock?', 10 * H],
        ['b', 'Fully fragrance free, and it’s back next week', 9 * H],
        ['c', 'Then I’ll take two when it’s back', 9 * H - 5],
      ],
      a: {
        summary: 'Checked that barrier mist is fragrance free and wants two when it is back.',
        intent: 'restock', topics: ['availability', 'product_question'], products: [{ productId: 'barrier-mist' }], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'restock', label: 'Wants two on restock' }],
        nextStep: 'Notify on restock.',
      },
    },
    {
      id: 'n06', name: 'Huda Saeed', handle: 'huda.saeed', city: 'Al Ain', orders: 1,
      msgs: [
        ['c', 'My SPF order was meant to arrive in 2 days, it’s day 5', 2 * D + 8 * H],
        ['b', 'Sorry Huda, deliveries outside Dubai are running a little late. Checking now', 2 * D + 7 * H],
        ['c', 'I need it before my trip on Saturday', D + 2 * H],
      ],
      a: {
        summary: 'SPF order to Al Ain is three days late; she needs it before Saturday.',
        intent: 'complain', topics: ['delivery'], products: [{ productId: 'spf50' }], sentiment: 'negative', language: 'en',
        signals: [{ kind: 'issue', label: 'Late outside Dubai' }],
        nextStep: 'Give her a delivery date before Saturday or send a replacement by express.',
      },
    },
    {
      id: 'n07', name: 'Reem Yousef', handle: 'reem.yousef', city: 'Dubai', orders: 2,
      msgs: [
        ['c', 'The clay mask cap leaked all over the box', 3 * D + 6 * H, { kind: 'image', label: 'Photo: leaked mask inside the mailer' }],
        ['b', 'So sorry! We’re sending a new one today', 3 * D + 5 * H],
        ['c', 'Thank you 🙏', 3 * D + 5 * H - 3],
      ],
      a: {
        summary: 'Clay mask leaked in transit. Replacement promised the same day.',
        intent: 'return_or_exchange', topics: ['damaged'], products: [{ productId: 'clay-mask' }], sentiment: 'mixed', language: 'en',
        signals: [{ kind: 'issue', label: 'Leaking cap' }],
        nextStep: 'Confirm the replacement was delivered.',
      },
    },
    {
      id: 'n08', name: 'Lama Al Sabah', handle: 'lama.sabah', city: 'Kuwait City',
      msgs: [
        ['c', 'Do you have a set price for the serum and moisturiser together?', 4 * D + 5 * H],
        ['b', 'Not a set yet, but both together come to 90', 4 * D + 4 * H],
        ['c', 'Hmm, I’ll wait for a set then', 4 * D + 4 * H - 6],
      ],
      a: {
        summary: 'Wants serum and moisturiser as a set at a lower price. Waiting.',
        intent: 'ask_before_buying', topics: ['pricing'], products: [{ productId: 'vitc-serum' }, { productId: 'hydra-gel' }], sentiment: 'neutral', language: 'en',
        signals: [{ kind: 'price_objection', label: 'Wants a set price' }],
        nextStep: 'Tell her if a routine set launches.',
      },
    },
    {
      id: 'n09', name: 'Dana Mahdi', handle: 'danamahdi', city: 'Dubai',
      msgs: [
        ['c', 'Is the night repair oil ok for oily skin? I break out easily', 14 * H],
        ['b', 'It’s non-comedogenic and light, most oily skin types love it. Start with two drops', 13 * H],
        ['c', 'Ok, ordering one to try', 13 * H - 3],
      ],
      a: {
        summary: 'Checked the night oil suits oily, acne-prone skin and said she will order one.',
        intent: 'buy', topics: ['product_question'], products: [{ productId: 'night-oil' }], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'opportunity', label: 'Said she is ordering' }],
        nextStep: 'Check for her order.',
      },
    },
    {
      id: 'n10', name: 'Mariam Obaid', handle: 'mariam.obaid', city: 'Dubai', orders: 4,
      msgs: [
        ['c', 'Your packaging is the prettiest on my shelf 😍', 5 * D + 2 * H, { kind: 'image', label: 'Photo: shelf with Noor bottles' }],
        ['b', 'You made our day, Mariam!', 5 * D + H],
      ],
      a: {
        summary: 'Shared a photo of her shelf and praised the packaging.',
        intent: 'give_feedback', topics: ['praise'], products: [], sentiment: 'positive', language: 'en',
        signals: [{ kind: 'feedback', label: 'Packaging praise, photo shared' }],
        nextStep: 'Ask to repost her photo.',
      },
    },
    {
      id: 'n12', name: 'Alia Hamad', handle: 'alia.hamad', city: 'Dubai', orders: 2,
      msgs: [
        ['c', 'Does the SPF leave a white cast? I have medium skin', 9 * D + 3 * H],
        ['b', 'No cast at all, it’s a clear fluid', 9 * D + 2 * H],
        ['c', 'Perfect, thank you', 9 * D + 2 * H - 4],
      ],
      a: { summary: 'Checked the SPF leaves no white cast.', intent: 'ask_before_buying', topics: ['product_question'], products: [{ productId: 'spf50' }], sentiment: 'positive', language: 'en', signals: [{ kind: 'question', label: 'White cast' }], nextStep: 'No follow-up needed.' },
    },
    {
      id: 'n13', name: 'Hessa Al Mazrouei', handle: 'hessa.mz', city: 'Abu Dhabi', orders: 1,
      msgs: [
        ['c', 'طلبي متى يوصل؟', 11 * D + 5 * H],
        ['b', 'بكرة إن شاء الله', 11 * D + 4 * H],
      ],
      a: { summary: 'Routine delivery date question, answered.', intent: 'track_order', topics: ['order_status'], products: [], sentiment: 'neutral', language: 'ar', signals: [], nextStep: 'No follow-up needed.' },
    },
  ],
  opportunities: [
    { id: 'opp-n01', conversationId: 'n01', productIds: ['vitc-serum', 'hydra-gel', 'spf50'], productLabel: 'Morning routine, 3 products', title: 'Adding a full routine to her cart', explanation: 'Built a three-step routine with the team and said she was adding all three to her cart. No order seen yet.', intent: 'high', status: 'new', estimatedValue: 126, ev: [4] },
    { id: 'opp-n09', conversationId: 'n09', productIds: ['night-oil'], title: 'Ordering the night oil to try', explanation: 'Checked it suits oily skin and said she is ordering one.', intent: 'medium', status: 'new', estimatedValue: 58, ev: [2] },
    { id: 'opp-n08', conversationId: 'n08', productIds: ['vitc-serum', 'hydra-gel'], title: 'Waiting for a serum and moisturiser set', explanation: 'Would buy both as a set at a lower price.', intent: 'low', status: 'new', estimatedValue: 90, ev: [0, 2] },
    { id: 'opp-n02', conversationId: 'n02', productIds: ['vitc-serum'], productLabel: '2 bottles', title: 'Reordered two serums', explanation: 'Asked about a two-bottle offer and ordered.', intent: 'high', status: 'converted', orderRef: 'NS-5521', estimatedValue: 86, ev: [1, 3] },
  ],
  risks: [
    { id: 'risk-n03', conversationId: 'n03', productIds: ['vitc-serum'], issue: 'product_quality', title: 'Redness after using the serum', summary: 'Redness that lasted into the next day, with a photo. Asked whether to stop and has had no reply.', priority: 'high', status: 'open', unansweredCount: 2, ev: [0, 2, 3] },
    { id: 'risk-n06', conversationId: 'n06', productIds: ['spf50'], issue: 'delivery', title: 'SPF late before a trip', summary: 'Order to Al Ain three days late; she needs it before Saturday.', priority: 'medium', status: 'open', unansweredCount: 1, ev: [0, 2] },
    { id: 'risk-n07', conversationId: 'n07', productIds: ['clay-mask'], issue: 'damaged', title: 'Clay mask leaked in transit', summary: 'Cap leaked in the box. Replacement sent the same day.', priority: 'low', status: 'in_progress', ev: [0] },
  ],
  insights: [
    { id: 'ins-n-restock', kind: 'restock', important: true, productId: 'barrier-mist', title: 'Three customers waiting for barrier mist', previousCount: 1, detail: 'Barrier mist is sold out. A repeat buyer is running out and another wants two.', conversationIds: ['n04', 'n05', 'n11'], suggestedAction: 'Confirm next week’s restock and notify these customers.', relevantAgent: 'store' },
    { id: 'ins-n-reaction', kind: 'feedback', important: true, productId: 'vitc-serum', title: 'One reaction report on the Vitamin C serum', previousCount: 0, detail: 'A customer reports redness lasting into the next day. A single report, but worth a fast, careful reply.', conversationIds: ['n03'], suggestedAction: 'Reply today and keep watching for similar reports.' },
    { id: 'ins-n-routine', kind: 'price', title: 'Customers want routine sets', previousCount: 1, detail: 'Customers ask for serum, moisturiser and SPF together, ideally at a set price.', conversationIds: ['n01', 'n02', 'n08'], suggestedAction: 'Consider a morning routine set.', relevantAgent: 'ivy' },
    { id: 'ins-n-delivery', kind: 'delivery', title: 'Deliveries outside Dubai running late', previousCount: 2, detail: 'Late SPF order to Al Ain; Riyadh customers ask about delivery times.', conversationIds: ['n06', 'n05'], suggestedAction: 'Check the courier’s outside-Dubai times.' },
    { id: 'ins-n-praise', kind: 'praise', title: 'Packaging and results get praise', previousCount: 2, detail: 'Customers share shelf photos and visible results.', conversationIds: ['n02', 'n10'], suggestedAction: 'Ask to repost customer photos.' },
  ],
  questions: [
    { id: 'q-n-routine', question: 'How do I layer serum, moisturiser and SPF?', conversationIds: ['n01'], answeredOnSite: false },
    { id: 'q-n-mist', question: 'When is barrier mist back?', conversationIds: ['n04', 'n05', 'n11'], answeredOnSite: false },
    { id: 'q-n-skin', question: 'Is this right for my skin type?', conversationIds: ['n09', 'n03'], answeredOnSite: false },
    { id: 'q-n-set', question: 'Is there a set price?', conversationIds: ['n02', 'n08'], answeredOnSite: false },
  ],
  history: [
    { caseId: 'opp-n02', minutesAgo: 2 * D + 2 * H, from: 'new', to: 'converted', note: 'Order NS-5521' },
    { caseId: 'risk-n07', minutesAgo: 3 * D + 5 * H, from: 'open', to: 'in_progress', note: 'Replacement sent.' },
  ],
}

const BRANDS: Record<string, BrandSeed> = { sahra: SAHRA, noor: NOOR }
const cache = new Map<string, LunaDataset>()

/** The workspace's Luna sample, built once per session so timestamps stay put. */
export function lunaDataset(workspaceId: string): LunaDataset {
  const hit = cache.get(workspaceId)
  if (hit) return hit
  const data = build(BRANDS[workspaceId] ?? SAHRA)
  cache.set(workspaceId, data)
  return data
}
