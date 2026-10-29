import { ago, ahead, D, H } from '@/data/seed-utils'
import type { RetentionCase, RetentionDataset, RetentionEvent } from './types'

// Retention's prepared results for each demo brand, built on Luna's sample (data/luna/mock.ts).
// Every customer, conversation and Luna case id here exists in Luna's data. Drafts are mock text.
// Customers whose threads were routine (questions answered, order updates, praise) are deliberately absent.

type Seed = Omit<RetentionCase, 'customerId' | 'createdAt' | 'preparedAt' | 'sentAt'> & { createdMinutesAgo: number; preparedMinutesAgo?: number; sentMinutesAgo?: number }

function build(seeds: Seed[]): RetentionDataset {
  const events: RetentionEvent[] = []
  const cases = seeds.map(({ createdMinutesAgo, preparedMinutesAgo, sentMinutesAgo, ...c }): RetentionCase => {
    const createdAt = ago(createdMinutesAgo)
    events.push({ id: `rev-${c.id}-0`, caseId: c.id, at: createdAt, by: 'retention', kind: 'suggested' })
    const preparedAt = preparedMinutesAgo !== undefined ? ago(preparedMinutesAgo) : undefined
    if (preparedAt) events.push({ id: `rev-${c.id}-1`, caseId: c.id, at: preparedAt, by: 'you', kind: 'prepared' })
    const sentAt = sentMinutesAgo !== undefined ? ago(sentMinutesAgo) : undefined
    if (sentAt) events.push({ id: `rev-${c.id}-2`, caseId: c.id, at: sentAt, by: 'you', kind: 'sent', note: 'Sent by hand in Instagram' })
    if (c.outcome) events.push({ id: `rev-${c.id}-3`, caseId: c.id, at: c.outcome.at, by: 'you', kind: 'outcome', note: c.outcome.note })
    if (c.status === 'dismissed') events.push({ id: `rev-${c.id}-4`, caseId: c.id, at: ago(createdMinutesAgo - 120), by: 'you', kind: 'dismissed', note: c.dismissReason })
    return { ...c, customerId: `cu-${c.conversationId}`, createdAt, preparedAt, sentAt }
  })
  return { cases, events }
}

// ---------------------------------------------------------------------------
// Sahra Home

const SAHRA: Seed[] = [
  // Recovery
  {
    id: 'rc-s18', conversationId: 's18', lunaCaseId: 'risk-s18', kind: 'recovery', priority: 'high', productIds: ['dune-bedding'], status: 'suggested', createdMinutesAgo: 2 * H,
    reason: 'His order went missing after it was marked delivered and took a week and a resend to reach him. It is fixed, but he called it a stressful week. A personal check-in now is the difference between a lost customer and a forgiving one.',
    action: { label: 'Send a personal check-in', detail: 'Acknowledge the week he had and offer help if anything about the set is wrong. No discount unless he raises a problem; he wants to feel heard, not bought.' },
    timing: { label: 'Tomorrow, late morning', rationale: 'Give him a day with the set first. He has written in the late morning and early afternoon.' },
    draft: {
      channel: 'instagram', language: 'en', signedAs: 'Salma',
      text: 'Hi Faisal, it’s Salma from Sahra Home. I wanted to check the Queen Dune set arrived in good shape after the resend. I’m sorry the last week was so stressful; losing a parcel after it’s marked delivered is the worst. If anything about the set isn’t right, reply here and I’ll sort it personally.',
      uses: ['Queen Dune set', 'Resent by express after a courier claim', 'He said it was a stressful week'],
    },
  },
  {
    id: 'rc-s21', conversationId: 's21', lunaCaseId: 'risk-s21', kind: 'recovery', priority: 'low', productIds: ['oasis-bowl'], status: 'suggested', createdMinutesAgo: 7 * H,
    reason: 'She received the wrong colour, but the exchange went smoothly and she sounds fine. A light, friendly note closes the loop; it is nice to have, not urgent.',
    action: { label: 'Send a light thank-you', detail: 'Thank her for her patience. Asking for a photo of the bowl in use turns a mistake into a warm moment.' },
    timing: { label: 'Any day this week', rationale: 'Nothing is waiting on it. Let her use the bowl first.' },
    draft: {
      channel: 'instagram', language: 'mixed', signedAs: 'Salma',
      text: 'Hi Salma! Ya rab el Sand bowl yekon 3agabek 😊 Sorry tany 3al lakhbata fel lon el awel. Law este3maltih, ab3atilna sora, we’d love to see it 🤍',
      uses: ['Sand glaze Oasis bowl', 'Charcoal was sent by mistake first', 'She confirmed the Sand bowl arrived'],
    },
  },
  {
    id: 'rc-s15', conversationId: 's15', lunaCaseId: 'risk-s15', kind: 'recovery', priority: 'high', productIds: ['dune-bedding'], status: 'suggested', createdMinutesAgo: 5 * H,
    reason: 'A gift order stuck in transit with a deadline, a refund request and two unanswered messages. A three-time customer. Once the delivery is sorted, she deserves a personal follow-up.',
    action: { label: 'Check in once it is resolved', detail: 'Ask whether the set made it in time for her sister’s move. If it did not, the follow-up should come with the refund answer, not before.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'A recovery message while her parcel is still stuck would land badly.' },
    draft: {
      channel: 'instagram', language: 'en', signedAs: 'Salma',
      text: 'Hi Reem, it’s Salma from Sahra Home. I hope the Dune set made it to your sister’s new flat in time. I’m really sorry for all the worry with the delivery. If anything wasn’t right, tell me and I’ll make it right.',
      uses: ['Gift for her sister’s new flat', 'Needed by Thursday', 'Shipment stuck on the Riyadh route'],
    },
  },
  {
    id: 'rc-s20', conversationId: 's20', lunaCaseId: 'risk-s20', kind: 'recovery', priority: 'high', productIds: ['terracotta-mugs'], status: 'suggested', createdMinutesAgo: 18 * H,
    reason: 'Two mugs arrived broken and he has waited two days for any reply. Breakage plus silence is how a one-time buyer stops buying.',
    action: { label: 'Follow up after the replacement', detail: 'First answer him and send the two mugs (Luna’s case). Then check they arrived intact and apologise for the slow reply.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'He needs a reply and replacement first.' },
    draft: {
      channel: 'instagram', language: 'ar-EG', signedAs: 'Omar',
      text: 'أهلاً يا مصطفى، اتمنى الكوبايتين البديل يكونوا وصلوا سليمين. آسفين جداً على الكسر وعلى التأخير في الرد. لو في أي حاجة تانية قولّي على طول.',
      uses: ['Two of four Terracotta mugs broken', 'Photo sent', 'Two days without a reply'],
    },
  },
  {
    id: 'rc-s16', conversationId: 's16', lunaCaseId: 'risk-s16', kind: 'recovery', priority: 'medium', productIds: [], status: 'suggested', createdMinutesAgo: 2 * H,
    reason: 'Her order is nine days late and three messages went unanswered. After it is sorted, an apology for the silence matters as much as the delay.',
    action: { label: 'Apologise once the order arrives', detail: 'Acknowledge both the late order and the unanswered messages.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'She needs the order status first.' },
    draft: {
      channel: 'instagram', language: 'mixed', signedAs: 'Salma',
      text: 'Hi Hana, sorry tany 3ala el ta2khir fel order w fel rod 🙏 Ya rab yekon kol 7aga wasalet tamam? Law fe ay 7aga ana hena.',
      uses: ['Order SH-10422, nine days late', 'Three messages unanswered'],
    },
  },
  {
    id: 'rc-s06', conversationId: 's06', lunaCaseId: 'risk-s06', kind: 'recovery', priority: 'medium', productIds: ['siwa-throw'], status: 'suggested', createdMinutesAgo: D,
    reason: 'She complained twice about the throw shedding and asked to return it. The team is checking the batch. Whatever the answer, she should hear from you after.',
    action: { label: 'Close the loop after the return', detail: 'Thank her for raising it, and tell her what you found about the batch if you can.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'The return is still being handled.' },
    draft: {
      channel: 'instagram', language: 'ar-EG', signedAs: 'Omar',
      text: 'أهلاً يا رنا، حبيت أتابع معاكي بعد موضوع الـ throw. شكراً إنك قولتيلنا، راجعنا الدفعة مع المورد. اتمنى يكون كل حاجة تمام دلوقتي، ولو في أي حاجة أنا موجود.',
      uses: ['Siwa throw shedding after two washes', 'Asked to return it'],
    },
  },
  {
    id: 'rc-s17', conversationId: 's17', lunaCaseId: 'risk-s17', kind: 'recovery', priority: 'low', productIds: ['oasis-bowl'], status: 'done', createdMinutesAgo: 4 * D, preparedMinutesAgo: 3 * D + 4 * H, sentMinutesAgo: 3 * D + 3 * H,
    evidence: ['s17-m0', 's17-m3', 's17-m4'],
    reason: 'His order was three days late. It was resolved quickly, so a short check-in was enough.',
    action: { label: 'Send a short check-in', detail: 'Make sure the bowl arrived safely and apologise once more for the delay.' },
    timing: { label: 'The day after delivery', rationale: 'Soon enough to feel personal.' },
    draft: { channel: 'instagram', language: 'ar-EG', signedAs: 'Omar', text: 'أهلاً يا عمر، حبينا نطمن إن الـ Oasis bowl وصل سليم وعجبك. وآسفين تاني على التأخير 🤍', uses: ['Oasis bowl', 'Delivered three days late'] },
    outcome: { kind: 'replied_positive', at: ago(3 * D + H), note: 'Said the bowl is lovely and he will order again.' },
  },
  // Purchase follow-ups
  {
    id: 'rc-s08', conversationId: 's08', lunaCaseId: 'opp-s08', kind: 'purchase_follow_up', priority: 'high', productIds: ['dune-bedding'], status: 'suggested', createdMinutesAgo: D,
    reason: 'She confirmed King fits her bed, picked Clay and asked how fast it reaches New Cairo, then said she would check with her husband. That was two days ago. We have not seen an order.',
    action: { label: 'Pick the conversation back up', detail: 'Remind her of what she chose and the delivery time. Offer to answer anything her husband asks. No discount: she was not hesitating on price.' },
    timing: { label: 'This evening', rationale: 'She wrote in the evening, and two days is long enough to not feel pushy.' },
    draft: {
      channel: 'instagram', language: 'mixed', signedAs: 'Salma',
      text: 'Hi Mariam 🤍 Just checking in on the King Dune set in Clay. It’s still in stock, and if you order today it reaches New Cairo in 2 to 3 working days. Law 3andek ay so2al tany enty aw gozik, ana hena!',
      uses: ['King, Clay', 'Bed is 200 x 200 cm', 'New Cairo, 2 to 3 working days', 'Checking with her husband'],
    },
  },
  {
    id: 'rc-s25', conversationId: 's25', lunaCaseId: 'opp-s25', kind: 'purchase_follow_up', priority: 'medium', productIds: ['oasis-bowl'], status: 'suggested', createdMinutesAgo: 2 * D,
    reason: 'She asked about cash on delivery and whether the Sand bowl looks like the photo. Both were answered four days ago and the conversation stopped there.',
    action: { label: 'Offer the link and a hand', detail: 'Short and warm: remind her what she asked about and send the product link.' },
    timing: { label: 'Tomorrow morning', rationale: 'She wrote in the morning.' },
    draft: {
      channel: 'instagram', language: 'ar-EG', signedAs: 'Omar',
      text: 'أهلاً يا ياسمين 🤍 كنتي بتسألي على الـ Oasis bowl الـ Sand والدفع عند الاستلام. لسه متاح، ولو حابة أبعتلك اللينك على طول. ولو في أي سؤال تاني أنا موجود.',
      uses: ['Oasis bowl, Sand glaze', 'Cash on delivery in Cairo', 'Colour matches the photo'],
    },
  },
  {
    id: 'rc-s01', conversationId: 's01', lunaCaseId: 'opp-s01', kind: 'purchase_follow_up', priority: 'high', productIds: ['siwa-throw'], status: 'prepared', createdMinutesAgo: 2 * D + 18 * H, preparedMinutesAgo: 2 * D,
    waitFor: [{ kind: 'restock', productId: 'siwa-throw', variant: 'Natural', expected: 'end of the month' }],
    reason: 'A returning customer asked you to reserve two Natural throws as gifts, needed before 15 November. The team promised to message him when they are back.',
    action: { label: 'Message him the day the throws land', detail: 'Reserve two first. If the restock slips past 10 November, offer Indigo instead so his mother’s birthday is not missed.' },
    timing: { label: 'The day the Natural throw is back', rationale: 'He has a deadline, so speed matters more than the hour.' },
    draft: {
      channel: 'instagram', language: 'ar-EG', signedAs: 'Omar',
      text: 'أهلاً يا يوسف 🤍 الـ Natural throw رجع! حجزنالك اتنين زي ما طلبت، ولو أكدت النهارده يوصلوا قبل ١٥ نوفمبر لعيد ميلاد مامتك.',
      uses: ['Two Natural throws', 'Gifts for his mother and aunt', 'Needed before 15 November'],
    },
  },
  {
    id: 'rc-s26', conversationId: 's26', lunaCaseId: 'opp-s26', kind: 're_engagement', priority: 'low', productIds: ['dune-bedding'], status: 'suggested', createdMinutesAgo: 3 * D,
    waitFor: [{ kind: 'date', at: ahead(29 * D), label: 'Black Friday' }],
    reason: 'He likes the Dune set but said he would wait for a discount. The team told him about Black Friday.',
    action: { label: 'Tell him when the offer starts', detail: 'One message on the first day of the offer. If Black Friday will not include the Dune set, dismiss this.' },
    timing: { label: 'First day of Black Friday', rationale: 'He asked to wait for it.' },
    draft: { channel: 'instagram', language: 'ar-EG', signedAs: 'Salma', text: 'أهلاً يا محمد، عرض الـ Black Friday بدأ والـ Dune set عليه خصم دلوقتي. لو لسه مهتم أبعتلك التفاصيل 🤍', uses: ['Dune set', 'Waiting for Black Friday'] },
  },
  {
    id: 'rc-s23', conversationId: 's23', lunaCaseId: 'opp-s23', kind: 're_engagement', priority: 'low', productIds: ['kilim-cushion'], status: 'dismissed', createdMinutesAgo: D + 2 * H, dismissReason: 'No bundle planned',
    reason: 'He would buy two Kilim covers for 100 instead of 116. Only worth a message if you decide to offer a bundle.',
    action: { label: 'Offer a two-cover bundle', detail: 'Only if a bundle exists.' },
    timing: { label: 'When a bundle exists', rationale: 'There is nothing new to tell him otherwise.' },
    draft: { channel: 'instagram', language: 'mixed', signedAs: 'Salma', text: 'Hi Karim! 3amalna offer 3al Kilim covers: etnein b 100. Law lessa 3ayez tegarrab, ab3atlak el link?', uses: ['Two covers for 100', 'Found one cover expensive'] },
  },
  // Unfinished conversations
  {
    id: 'rc-s24', conversationId: 's24', lunaCaseId: 'opp-s24', kind: 'unfinished_conversation', priority: 'high', productIds: ['ember-mug'], status: 'prepared', createdMinutesAgo: 3 * D, preparedMinutesAgo: 20 * H,
    reason: 'An agency wants 30 Ember mugs as client gifts. They asked for 15% and gift boxes, and the team said “let me check and come back”. That was four days ago; the next message is yours to send.',
    action: { label: 'Send the quote you promised', detail: 'The note on Luna’s case says 12%. The draft prices 30 mugs at 12% off plus kraft gift boxes.' },
    timing: { label: 'Today', rationale: 'You promised an answer four days ago. Every day lowers the chance they wait.' },
    draft: {
      channel: 'instagram', language: 'en', signedAs: 'Salma',
      text: 'Hi Nour, thanks for your patience. For 30 Ember mugs we can do 12% off, and we have kraft gift boxes at $3 each with a printed card for your clients’ names. That comes to $1,093 with boxes. Shall I reserve the 30 mugs for you?',
      uses: ['30 Ember mugs', 'Asked for 15% off and gift boxes', 'Team promised to come back', '12% agreed internally'],
    },
  },
  {
    id: 'rc-s10', conversationId: 's10', lunaSignal: 'Could not tell which size fits a 180 cm bed and left undecided. No case: a sizing question, not yet a sale.', evidence: ['s10-m0', 's10-m2'],
    kind: 'unfinished_conversation', priority: 'medium', productIds: ['dune-bedding'], status: 'sent', createdMinutesAgo: 2 * D, preparedMinutesAgo: D, sentMinutesAgo: 20 * H,
    reason: 'He could not tell which Dune size fits his bed and left saying he would think about it. A clear answer with the exact dimensions removes the reason he stopped.',
    action: { label: 'Answer the size question properly', detail: 'Give the centimetres he asked for. No sales push.' },
    timing: { label: 'Within a day or two', rationale: 'While he is still deciding.' },
    draft: {
      channel: 'instagram', language: 'en', signedAs: 'Salma',
      text: 'Hi Tamer, following up on your question: for a 180 cm bed the King set is the one. The fitted sheet is 200 x 200 cm with 30 cm depth, and the duvet cover is 260 x 240 cm. Happy to help if anything else would make the choice easier.',
      uses: ['180 cm bed', 'The site lists no centimetres'],
    },
  },
]

// ---------------------------------------------------------------------------
// Noor Skin

const NOOR: Seed[] = [
  {
    id: 'rc-n03', conversationId: 'n03', lunaCaseId: 'risk-n03', kind: 'recovery', priority: 'high', productIds: ['vitc-serum'], status: 'suggested', createdMinutesAgo: 6 * H,
    reason: 'She reports redness from the Vitamin C serum and has not had a reply. After the immediate answer, a caring check-in matters for trust in the whole brand.',
    action: { label: 'Check on her skin after the reply', detail: 'Ask how her skin is, and offer a refund or a gentler product. Never argue the reaction.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'She needs the immediate advice first.' },
    draft: { channel: 'instagram', language: 'ar', signedAs: 'Aisha', text: 'هلا فاطمة، حبينا نطمن عليك بعد موضوع الاحمرار. إن شاء الله صار أحسن؟ إذا تحتاجين أي شي أو تبين نسترجع السيروم، احنا موجودين 🤍', uses: ['Redness after the Vitamin C serum', 'Photo sent'] },
  },
  {
    id: 'rc-n07', conversationId: 'n07', lunaCaseId: 'risk-n07', kind: 'recovery', priority: 'low', productIds: ['clay-mask'], status: 'suggested', createdMinutesAgo: 3 * D,
    reason: 'Her clay mask leaked in transit and a replacement went out the same day. A short note confirms it arrived sealed.',
    action: { label: 'Confirm the replacement', detail: 'One line is enough.' },
    timing: { label: 'After Luna’s case is resolved', rationale: 'The replacement is still on its way.' },
    draft: { channel: 'instagram', language: 'en', signedAs: 'Aisha', text: 'Hi Reem, just checking the replacement clay mask arrived sealed this time. Sorry again for the mess!', uses: ['Clay mask leaked', 'Replacement sent the same day'] },
  },
  {
    id: 'rc-n01', conversationId: 'n01', lunaCaseId: 'opp-n01', kind: 'purchase_follow_up', priority: 'high', productIds: ['vitc-serum', 'hydra-gel', 'spf50'], status: 'suggested', createdMinutesAgo: 5 * H,
    reason: 'She built a three-step routine with the team and said she was adding all three to her cart. We have not seen an order.',
    action: { label: 'Offer help finishing the routine', detail: 'Restate the order of use she asked about. Do not assume she did or did not buy.' },
    timing: { label: 'This afternoon', rationale: 'She wrote yesterday afternoon.' },
    draft: { channel: 'instagram', language: 'en', signedAs: 'Aisha', text: 'Hi Sara! In case it helps with your routine: Vitamin C serum first, then Hydra gel, then SPF 50 once it has absorbed. If you have any questions before you order, I’m here 🌿', uses: ['Serum, Hydra gel, SPF 50', 'Said she was adding all three to her cart'] },
  },
  {
    id: 'rc-n09', conversationId: 'n09', lunaCaseId: 'opp-n09', kind: 'purchase_follow_up', priority: 'medium', productIds: ['night-oil'], status: 'suggested', createdMinutesAgo: 10 * H,
    waitFor: [{ kind: 'quiet', hours: 24 }],
    reason: 'She checked the night oil suits oily, acne-prone skin and said she was ordering one.',
    action: { label: 'Share a first-use tip', detail: 'Helpful, not salesy. Only if no order shows up.' },
    timing: { label: 'Tomorrow', rationale: 'She wrote this morning; a day of quiet first.' },
    draft: { channel: 'instagram', language: 'en', signedAs: 'Aisha', text: 'Hi Dana! A tip if you try the night repair oil: start with two drops every other night for the first week, then build up. Any questions, just ask.', uses: ['Oily, acne-prone skin', 'Said she was ordering one'] },
  },
  {
    id: 'rc-n08', conversationId: 'n08', lunaCaseId: 'opp-n08', kind: 're_engagement', priority: 'low', productIds: ['vitc-serum', 'hydra-gel'], status: 'suggested', createdMinutesAgo: 4 * D,
    waitFor: [{ kind: 'event', label: 'A serum and moisturiser set launches' }],
    reason: 'She would buy the serum and moisturiser together at a set price and said she would wait for one.',
    action: { label: 'Tell her when a set exists', detail: 'Only relevant if you launch a routine set.' },
    timing: { label: 'When the set launches', rationale: 'She asked to wait for it.' },
    draft: { channel: 'instagram', language: 'en', signedAs: 'Aisha', text: 'Hi Lama, you asked about the serum and moisturiser as a set. Our morning routine set just launched, and it comes in under buying them separately. Want the link?', uses: ['Wants serum and moisturiser as a set'] },
  },
]

const BRANDS: Record<string, Seed[]> = { sahra: SAHRA, noor: NOOR }
const cache = new Map<string, RetentionDataset>()

export function retentionDataset(workspaceId: string): RetentionDataset {
  const hit = cache.get(workspaceId)
  if (hit) return hit
  const data = build(BRANDS[workspaceId] ?? [])
  cache.set(workspaceId, data)
  return data
}
