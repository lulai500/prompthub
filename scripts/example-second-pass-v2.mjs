#!/usr/bin/env node
// 二轮补跑 v2：40 条"请求输入"类提示词 → 针对性示例输入 → DeepSeek 生成 → 写回 example_output
// 与 second-pass-deepseek.mjs 的区别：为每条设计了真正的对口输入
// （32 条创意写作类用一条贯穿的都市奇幻悬疑故事设定，8 条代码/数据类给具体代码/数据/品牌 brief）。
// 用 node fetch（生产同款）：Windows 上 Python urllib 长请求会卡死，node fetch 实测 3.1s。
// 断点续跑：成功 id 记入 scripts/data/second-pass-progress.json。
// 用法：node scripts/example-second-pass-v2.mjs
import fs from 'fs';

function getEnv(k) {
  const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).filter(l => !l.startsWith('#'));
  const line = env.find(x => x.startsWith(k + '=') || x.startsWith(k + ' ='));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '') : undefined;
}

const URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SRK = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const DKEY = getEnv('DEEPSEEK_API_KEY') || getEnv('DEEPSEEK_KEY');
const MODEL = 'deepseek-v4-flash';
const API = 'https://api.deepseek.com/chat/completions';

// V4 Flash 不稳定：部分调用会触发提示词里的 Fallback（"I need a bit more…"）即使输入已足够。
// 写作类输入末尾追加强制指令 + 生成后校验特征串并重试。
const REQUEST_MARKER = /i need a bit more|please provide|could you provide|please share|what (genre|premise|chapter|outline|text)/i;
const BOOTSTRAP = `

## Working instruction
You have been given complete context above. Do NOT reply that you need more information, and do NOT use the fallback response. Proceed immediately to produce the complete deliverable the prompt requests, in full.`;

// ---------------- 贯穿的故事设定（32 条创意写作类共用） ----------------
const PREMISE = `STORY PREMISE (context for this task):
Genre: urban fantasy / supernatural mystery
Premise: June Ellery, a 29-year-old night-shift assistant at a South London bookshop, can read the psychic residue imprinted on objects she touches — a gift that drove her late father to madness. She has sworn never to use it. When the diary of a murdered girl is left on the bookshop doorstep — a diary that accurately predicts the next three days of killings — June is forced to hunt the killer with her gift. Every clue she reads points back to herself.
Logline: A bookshop assistant who can read the memories of objects must catch a killer — even as every clue implicates her.
Characters:
- June Ellery: protagonist, 29, guarded and grieving, tactile reader of object-memories.
- Tomas Reyes: the bookshop's landlord, a retired forensic accountant, warm and observant; slow-burn love interest.
- Detective Chief Inspector Mona Voss: sharp, skeptical; suspects June.
- The Moth: the killer, who harvests the memories of the dying.
World rule: The stronger and more recent the emotion left on an object, the more vivid the read. June can read objects only — never people.`;

// ---------------- 每条的针对性输入 ----------------
const INPUTS = {
  // ---------- 8 条 代码 / SQL / 数据 / 品牌 ----------
  1640: `## Python code to analyze
\`\`\`python
import sqlite3
from flask import Flask, request

app = Flask(__name__)

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = '%s' AND password = '%s'" % (username, password))
    row = cur.fetchone()
    if row:
        return 'Welcome back, ' + username
    return 'Access denied'

@app.route('/admin', methods=['GET'])
def admin():
    session_token = request.cookies.get('session')
    if session_token == 'secret-admin-token':
        return 'Admin panel'
    return 'Forbidden', 403
\`\`\``,

  1647: `## PR changes to review
\`\`\`diff
diff --git a/src/cart.js b/src/cart.js
@@ -20,6 +20,25 @@ function addToCart(cart, item) {
   cart.items.push(item);
   cart.updatedAt = new Date().toISOString();
 }
+
+export function applyCoupon(cart, coupon) {
+  if (coupon === undefined) return cart;
+  const now = new Date();
+  if (new Date(coupon.expires) < now) return cart;
+
+  if (coupon.type === 'percent') {
+    cart.total = cart.items.reduce((sum, i) => sum + i.price, 0) * (1 - coupon.value / 100);
+  } else if (coupon.type === 'fixed') {
+    cart.total = Math.max(0, cart.items.reduce((sum, i) => sum + i.price, 0) - coupon.value);
+  }
+  cart.appliedCoupon = coupon.code;
+  return cart;
+}
+
+export function checkout(cart, payment) {
+  return api.post('/checkout', {
+    total: cart.total,
+    items: cart.items.map((i) => i.id),
+    appliedCoupon: cart.appliedCoupon,
+  });
+}
\`\`\`
Summarize the modifications, assess risk level (critical/major/minor/nit), and flag anything that would break in production.`,

  1691: `## Database schema
\`\`\`sql
users(id, name, country, signup_date)
orders(id, user_id, amount, created_at)
\`\`\`
## Sample rows
\`\`\`
users: (1, 'Alice', 'US', '2026-01-15'), (2, 'Bob', 'DE', '2026-02-01'), (3, 'Carol', 'US', '2026-03-10'), (4, 'Dave', 'FR', '2026-03-22'), (5, 'Eve', 'US', '2026-04-05')
orders: (101, 1, 45.0, '2026-01-20'), (102, 1, 12.5, '2026-02-10'), (103, 2, 89.0, '2026-02-15'), (104, 3, 33.0, '2026-04-01'), (105, 4, 210.0, '2026-04-02')
\`\`\`
Write SQL to compute Day-1 / Day-7 / Day-30 retention cohorts by signup month, plus average order value per active user.`,

  1693: `## Weekly behavioral data
| week | signups | retained_w1 | retained_w4 | avg_session_min | active_users |
|------|---------|-------------|-------------|-----------------|--------------|
| 1    | 1200    | 384         | 210         | 14.2            | 1800         |
| 2    | 980     | 310         | 172         | 15.8            | 1650         |
| 3    | 1120    | 361         | 198         | 13.9            | 1900         |
| 4    | 1050    | 346         | 181         | 16.4            | 1740         |
| 5    | 1180    | 402         | —           | 12.1            | 1850         |
Identify key churn indicators, the cohort most at risk, and three concrete retention levers ranked by expected impact.`,

  1721: `## Customer feedback dataset
| id | channel | date       | text                                                                           |
|----|---------|------------|--------------------------------------------------------------------------------|
| 1  | email   | 2026-07-01 | "Your export takes 6 minutes and then dies with no error. I lost a day of work." |
| 2  | chat    | 2026-07-02 | "How do I even cancel? I had to google it. There's no link anywhere."            |
| 3  | app     | 2026-07-03 | "Love the new dark mode. Sync actually works now."                               |
| 4  | email   | 2026-07-04 | "I was billed twice this month and support replied after 4 days."                |
| 5  | app     | 2026-07-05 | "Export keeps timing out on large projects. Frustrating."                        |
| 6  | chat    | 2026-07-06 | "Can't find billing settings on mobile."                                         |
| 7  | email   | 2026-07-07 | "The new export feature is a game changer. Thank you!"                           |
| 8  | app     | 2026-07-08 | "Duplicate charge hit my card twice. Need this fixed."                           |
| 9  | chat    | 2026-07-09 | "Where is the cancel button?? There literally is no cancel button."              |
| 10 | app     | 2026-07-10 | "Export failed silently again. I only noticed because the file was missing."     |
Identify the Top 5 highest-frequency issues. For each: root cause, affected customers, suggested fix with priority.`,

  1755: `## Brand brief
- Company: Aere — a direct-to-consumer brand selling rain-resistant, fully recyclable outerwear.
- Positioning: "Gear for the walk to anywhere." Technical but warm; anti-fast-fashion.
- Audience: urban commuters 25-40 who bike/walk daily; value durability and the environment.
- Existing assets: wordmark "aere" (lowercase, geometric sans), a seafoam-to-storm gradient they want to keep or evolve.
- Deliverable: a complete visual identity system spec — color palette with hex codes and usage ratios, type system (display/body/mono with scale), spacing & radius tokens, iconography style, photography direction, logo application on light/dark, and a one-line brand voice rule.`,

  1776: `## Concurrent code that deadlocks in production
\`\`\`python
import threading

lock_a = threading.Lock()
lock_b = threading.Lock()

def transfer_a_to_b(account_a, account_b):
    with lock_a:
        with lock_b:
            account_b['balance'] += account_a['balance']
            account_a['balance'] = 0

def transfer_b_to_a(account_b, account_a):
    with lock_b:
        with lock_a:
            account_a['balance'] += account_b['balance']
            account_b['balance'] = 0
\`\`\`
The deadlock is intermittent: two threads calling transfer_a_to_b and transfer_b_to_a simultaneously hang forever. Apply the happens-before principle and fix with a lock-ordering discipline.`,

  1793: `## Python pure function to test
\`\`\`python
def process_order(order):
    '''Compute final total after coupons.'''
    total = sum(item['price'] * item['quantity'] for item in order['items'])
    if order.get('coupon'):
        c = order['coupon']
        if c['type'] == 'percent':
            total *= 1 - c['value'] / 100
        elif c['type'] == 'fixed':
            total = max(0, total - c['value'])
    return round(total, 2)
\`\`\`
Apply property-based testing methodology: write a property list (invariants), then generate test cases with a Hypothesis-style generator covering edge values (empty items, negative prices, huge discounts, mixed coupon types).`,

  1798: `## React component to refactor
\`\`\`jsx
function CheckoutPage({ cart, user, coupon, onApplyCoupon, onPay, promoList }) {
  const [step, setStep] = useState('cart');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [shipping, setShipping] = useState({ name: user?.name || '', address: '', city: '', zip: '' });
  const [billing, setBilling] = useState({ sameAsShipping: true, name: user?.name || '', card: '', exp: '', cvc: '' });
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, shipping: 0 });
  // ~180 lines of validation, formatting, totals math, and JSX follow...
  return (/* large form with every field inline */);
}
\`\`\`
Refactor this component that has grown too large and tightly coupled. Extract custom hooks, pure helpers, and child components. Keep the exact same behavior.`,

  // ---------- 32 条 创意写作类（贯穿主设定） ----------
  1813: `Genre and target platform: urban fantasy / supernatural mystery, aimed at serialized webnovel readers (Kindle Vella, Royal Road) and a trad-published debut. Brainstorm five original high-concept premises. Rank them by marketability.`,

  1814: `Genre and target platform: urban fantasy / supernatural mystery, aimed at serialized webnovel readers (Kindle Vella, Royal Road) and a trad-published debut. Brainstorm five original high-concept premises with a distinctive hook, and rank them by marketability.`,

  1815: PREMISE + `\n\nConstruct a complete, publishable three-act novel outline from this premise and logline, with act-by-act chapter beats and a satisfying resolution.`,

  1816: PREMISE + `\n\nConstruct a complete, publishable three-act novel outline from this premise and logline, with act-by-act chapter beats, midpoint reversal, and a satisfying resolution.`,

  1818: PREMISE + `\n\nSerial format: webnovel, ~2,500 words per chapter. Produce a chapter-by-chapter outline for the opening arc (chapters 1-8), each chapter ending on a hook.`,

  1819: `Novel of 90,000 words, genre: urban fantasy mystery. Story:\n` + PREMISE + `\n\nDesign the full pacing and tension arc — rising action, peaks, valleys, the midpoint, the dark-night-of-the-soul, and the final sprint — as a chapter-grouped map.`,

  1820: `Novel of 90,000 words, genre: urban fantasy mystery. Story:\n` + PREMISE + `\n\nDesign the full pacing and tension arc — with measured tension levels per chapter group, where peaks and valleys land, and exactly which plot beats open each valve.`,

  1821: `Character to develop into a complete character bible:
June Ellery, 29, night-shift assistant at a South London bookshop. Psychometry gift: she reads the emotional memory imprinted on objects. Guarded, grieving, quietly brave; her father killed himself after his gift consumed him, and she has sworn off using it. Relationships: Tomas Reyes (landlord, forensic accountant, slow-burn warmth) and Detective Chief Inspector Mona Voss (skeptic who suspects June).
Produce the full bible: backstory, core wound, goals and fears, speech patterns, arc, flaws, and a day-in-the-life.`,

  1822: `Character to develop into a complete character bible:
June Ellery, 29, night-shift assistant at a South London bookshop. Psychometry gift: she reads the emotional memory imprinted on objects. Guarded, grieving, quietly brave; her father killed himself after his gift consumed him, and she has sworn off using it. Relationships: Tomas Reyes (landlord, forensic accountant, slow-burn warmth) and Detective Chief Inspector Mona Voss (skeptic who suspects June).
Produce the full bible: backstory, core wound, contradictory wants, speech patterns, arc, flaws, secret, and a day-in-the-life.`,

  1823: `Scene and cast: DCI Mona Voss interviews June about the diary at the police station; Tomas waits outside. Write character-specific dialogue — Voss probing and skeptical, June deflecting while concealing her gift, Tomas's single interjection — that reveals each character's voice and what they are hiding.`,

  1824: `Scene and cast: DCI Mona Voss interviews June about the diary at the police station; Tomas waits outside. Write character-specific dialogue — Voss probing and skeptical, June deflecting while concealing her gift, Tomas's single interjection — with subtext, interruptions, and pauses doing the work.`,

  1826: PREMISE + `\n\nMap June Ellery's character arc and relationship dynamics: June & Tomas (trust built and broken), June & Voss (antagonist-to-ally), June & her father's ghost (the fear she must outgrow). Show how each relationship changes the arc's direction.`,

  1828: PREMISE + `\n\nDesign the worldbuilding system: how psychometry actually works (rules, costs, limits), how the supernatural is known or hidden in this London, how the police treat it, and how The Moth operates inside this ecology. Keep the system coherent enough to enforce rules in every later scene.`,

  1830: `Scene to set: June alone in the closed bookshop at 2 a.m., the diary open on the counter, its third prediction stating that the next killing happens inside this shop before dawn. Set the atmosphere and sensory scene: rain on the skylight, the smell of old paper and dust, the lamp pool, the doorbell that must not ring.`,

  1831: PREMISE + `\n\nWrite the opening chapter — the first 1-2 pages must hook immediately: the moment June discovers the diary on the doorstep. Require a cold-open, an image that earns its place, and a reason to keep reading.`,

  1832: PREMISE + `\n\nWrite the opening chapter — the first 1-2 pages must hook immediately: the moment June discovers the diary on the doorstep. Use a cold-open, a controlling image, and plant the central question on page one.`,

  1833: `Rewrite this telling passage as vivid showing — preserve the exact information:
"June was terrified. She knew the killer would come to the shop tonight, because the diary had said so. She quickly hid behind the counter in the back room and waited, her heart pounding. Then she heard the bell over the door ring."`,

  1834: `Rewrite this telling passage as vivid showing — preserve the exact information, earn the emotion:
"June was terrified. She knew the killer would come to the shop tonight, because the diary had said so. She quickly hid behind the counter in the back room and waited, her heart pounding. Then she heard the bell over the door ring."`,

  1835: `Emotional beat: betrayal. Scene: June returns to the bookshop and finds Tomas photographing the diary and texting the photographs to DCI Voss. Write the scene with the betrayal landing — no melodrama, no announced emotions.`,

  1836: `Emotional beat: betrayal. Scene: June returns to the bookshop and finds Tomas photographing the diary and texting the photographs to DCI Voss. Write the scene with subtext and restraint — the betrayal lands in what is not said.`,

  1838: `Genre: epic / progression fantasy. Beat: write the scene where the moment a failed academy student, standing in the rain at a public execution, first awakens a forbidden mana-siphoning power.
Setting: the Academy of Seven Spires, where mana is measured at birth and the un-gifted are culled. Rin, 19, with a mana reading of zero, watches her best friend executed for a crime she did not commit — and the power that should not exist answers.`,

  1842: `Genre: slow-burn romance. Beat: the first moment of real intimacy — two guarded people share a late-night conversation that quietly shifts everything between them.
Setting: Dani runs a failing cafe in Lisbon; Jonas, a regular, orders the same coffee every morning and never speaks. When a storm traps them past closing, he finally talks.`,

  1843: `Genre: mystery / thriller / suspense. Beat: DCI Voss walks into the second crime scene — a flooded basement — and finds the calling card that matches the diary's next prediction. Write the scene with dread, observation, and the quiet horror of pattern recognition.`,

  1844: `Genre: mystery / thriller / suspense. Beat: DCI Voss walks into the second crime scene — a flooded basement — and finds the calling card that matches the diary's next prediction. Write the scene with dread, precise forensic observation, and the quiet horror of pattern recognition.`,

  1845: PREMISE + `\n\nDesign one major plot twist and two secondary twists. Each twist must be planted early, be earned, and change the reader's understanding of the story.`,

  1846: PREMISE + `\n\nDesign one major plot twist and two secondary twists. Each twist must be planted early, be earned, change the reader's understanding, and be fair (re-readable after the reveal).`,

  1847: `Serial continuation.
Previous chapter summary: June confronts DCI Voss with the diary's third prediction; Voss arrests her for the second murder.
Current scene: in her cell, June finds a fourth prediction slipped under the door — the diary predicts a killing in the police station itself.
Write the next chapter, continuing seamlessly from the established cast and world rule (June reads objects, not people).`,

  1849: `Line-edit and polish this manuscript excerpt:
"The night was dark and foreboding, and June felt a chill run down her spine as she entered the creepy old bookshop. She was very scared, because she knew something bad was going to happen. Suddenly, out of nowhere, a man appeared. It was the killer! He laughed evilly and brandished a knife, saying, 'Now you will die, June Ellery!'"
Deliver the polished version plus a tight list of the specific edits made.`,

  1850: `Line-edit and polish this manuscript excerpt:
"The night was dark and foreboding, and June felt a chill run down her spine as she entered the creepy old bookshop. She was very scared, because she knew something bad was going to happen. Suddenly, out of nowhere, a man appeared. It was the killer! He laughed evilly and brandished a knife, saying, 'Now you will die, June Ellery!'"
Deliver the polished version plus a scrupulous line-level edit list (every cliche, filter word, and flat verb).`,

  1851: PREMISE + `\n\nAudit this story for consistency and logical coherence. Establish the facts from the premise (character traits, the object-only world rule, timeline of the three predictions) and check: contradictions, timeline holes, character-behavior violations, and unplanted conveniences. Report each with severity and a fix.`,

  1852: PREMISE + `\n\nAudit this story for consistency and logical coherence. Establish the facts from the premise (character traits, the object-only world rule, timeline of the three predictions) and check: contradictions, timeline holes, character-behavior violations, and unplanted conveniences. Report each with severity, the exact inconsistent detail, and a fix that preserves the plot.`,
};

// ---------------- helpers ----------------
async function callDeepSeek(content, maxTokens, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + DKEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content }],
        max_tokens: maxTokens,
        temperature: 0.7,
        thinking: { type: 'disabled' }, // V4 Flash 默认 thinking，生成内容需显式关闭
      }),
      signal: controller.signal,
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) { clearTimeout(timer); await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); return callDeepSeek(content, maxTokens, attempt + 1); }
      throw new Error('HTTP ' + res.status);
    }
    if (!res.ok) { const t = await res.text(); throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 150)); }
    const j = await res.json();
    const out = (j.choices?.[0]?.message?.content || '').trim();
    if (!out) throw new Error('empty output');
    // 废响应校验：输出开头仍在"请求输入"则视为失败重试（最多 3 次）
    if (REQUEST_MARKER.test(out.slice(0, 300)) && attempt < 3) {
      clearTimeout(timer);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      return callDeepSeek(content, maxTokens, attempt + 1);
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

async function writeDb(pid, out) {
  const res = await fetch(`${URL}/rest/v1/prompts?id=eq.${pid}`, {
    method: 'PATCH',
    headers: { apikey: SRK, Authorization: 'Bearer ' + SRK, 'Content-Type': 'application/json' },
    body: JSON.stringify({ example_output: out }),
  });
  if (!(res.status === 200 || res.status === 204)) {
    throw new Error('write failed status ' + res.status + ': ' + (await res.text()).slice(0, 150));
  }
  return true;
}

// ---------------- main ----------------
const PROG = 'scripts/data/second-pass-progress.json';
const OUTS = 'scripts/data/batch-outputs.json';
const done = new Set(fs.existsSync(PROG) ? JSON.parse(fs.readFileSync(PROG, 'utf8')) : []);
const results = fs.existsSync(OUTS) ? JSON.parse(fs.readFileSync(OUTS, 'utf8')) : {};
const prompts = JSON.parse(fs.readFileSync('scripts/data/need-input-prompts.json', 'utf8')).sort((a, b) => a.id - b.id);

let ok = 0, fail = 0;
const failed = [];
for (const [i, p] of prompts.entries()) {
  if (done.has(p.id)) { console.log(`[${i + 1}/40] ${p.id} 跳过（已完成）`); continue; }
  const content = p.content + '\n\n' + (INPUTS[p.id] || '') + (p.id >= 1813 ? BOOTSTRAP : '');
  const maxTokens = p.id >= 1813 ? 2800 : 1600;
  try {
    const out = await callDeepSeek(content, maxTokens);
    await writeDb(p.id, out);
    results[String(p.id)] = { title: p.title, output: out };
    done.add(p.id); ok++;
    console.log(`[${i + 1}/40] ${p.id} | ${p.title.slice(0, 38)} -> OK (${out.length} chars)`);
  } catch (e) {
    fail++; failed.push(p.id);
    console.log(`[${i + 1}/40] ${p.id} | ${p.title.slice(0, 38)} -> FAIL: ${String(e).slice(0, 120)}`);
  }
  if ((i + 1) % 3 === 0) {
    fs.writeFileSync(PROG, JSON.stringify([...done]));
    fs.writeFileSync(OUTS, JSON.stringify(results));
  }
}
fs.writeFileSync(PROG, JSON.stringify([...done]));
fs.writeFileSync(OUTS, JSON.stringify(results));
console.log(`\n完成: 成功 ${ok}, 失败 ${fail}`);
if (failed.length) console.log('失败 id:', failed.join(', '));
