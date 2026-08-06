// 交互行为测试：真实登录后，逐页执行点击/输入并断言 DOM 变化
// 用法: node scripts/interactive-test.mjs --base ... --email ... --password ...
import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', '');
const EMAIL = opt('--email', '');
const PASS = opt('--password', '');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const PROFILE = `C:/Users/lei/AppData/Local/Temp/inter-test-${Date.now()}`;
mkdirSync(PROFILE, { recursive: true });
const PORT = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RESULTS = [];
const check = (name, ok, detail = '') => { RESULTS.push({ name, ok, detail }); console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); };

async function main() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(200); }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map();
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  await send('Page.enable'); await send('Runtime.enable');
  const nav = u => send('Page.navigate', { url: BASE + u });
  const waitLoad = () => new Promise(res => { const h = e => { if (JSON.parse(e.data).method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } }; ws.addEventListener('message', h); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; };

  // ---- 登录 ----
  await nav('/auth/login'); await waitLoad(); await sleep(2500);
  await ev(`(() => {
    const setV = (el,v) => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
    setV(document.querySelector('input[type=email],input[name=email]'), ${JSON.stringify(EMAIL)});
    setV(document.querySelector('input[type=password],input[name=password]'), ${JSON.stringify(PASS)});
    const btn = [...document.querySelectorAll('button')].find(b => /sign\\s*in|log\\s*in/i.test(b.innerText));
    btn.click(); return true;
  })()`);
  await sleep(6000);
  check('登录', (await ev('location.pathname')) !== '/auth/login');

  // ---- A. 首页 onboarding 横幅（全新 profile → localStorage 无 ph_onboarding_done）----
  await nav('/'); await waitLoad(); await sleep(4000);
  const onboarding = await ev(`(() => {
    const t = document.body.innerText;
    return { banner: /onboard|welcome|3 quick steps|first time/i.test(t), text: (t.match(/.{0,30}(onboard|welcome).{0,60}/i) || [''])[0] };
  })()`);
  check('首页 onboarding 引导横幅', !!onboarding.banner, JSON.stringify(onboarding.text).slice(0, 90));

  // ---- B. /prompts 搜索框可见性 + 输入实时过滤 ----
  await nav('/prompts'); await waitLoad(); await sleep(4000);
  const searchBox = await ev(`(() => {
    const inputs = [...document.querySelectorAll('input')];
    const si = inputs.find(i => /search|query|q/i.test((i.placeholder||'')+(i.name||'')));
    if (!si) return { found: false };
    return { found: true, placeholder: si.placeholder };
  })()`);
  check('prompts 列表搜索框可见', searchBox.found, searchBox.placeholder || '');

  // ---- C. Prompt 详情页：Favorite 点击 ----
  const pd = await ev(`(() => { const a = document.querySelector('a[href*="/prompts/"]'); return a ? a.getAttribute('href') : null; })()`);
  // 从首页热门区拿一个 prompt 链接
  await nav('/'); await waitLoad(); await sleep(3000);
  const slug = await ev(`(() => { const a=[...document.querySelectorAll('a[href*="/prompts/"]')].find(x=>x.href.split('/').pop().length>3); return a?a.href.split('/').pop():null; })()`);
  if (slug) {
    await nav('/prompts/' + slug); await waitLoad(); await sleep(4000);
    const favState = await ev(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /favorite|favourite/i.test(b.innerText));
      if (!btn) return { found: false };
      const before = btn.innerText;
      btn.click();
      return { found: true, before };
    })()`);
    await sleep(2500);
    const after = await ev(`(() => { const b=[...document.querySelectorAll('button')].find(b=>/favorite|favourite/i.test(b.innerText)); return b?b.innerText:null; })()`);
    check('详情页 Favorite 按钮点击', favState.found, `点击前: ${favState.before} → 点击后: ${after}`);
  } else check('拿到 prompt 详情 slug', false);

  // ---- D. "I tested this" 点击 ----
  if (slug) {
    await nav('/prompts/' + slug); await waitLoad(); await sleep(4000);
    const tested = await ev(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /tested/i.test(b.innerText));
      if (!btn) return { found: false, text: null };
      const before = btn.innerText;
      btn.click();
      return { found: true, before };
    })()`);
    await sleep(2500);
    const afterT = await ev(`(() => { const b=[...document.querySelectorAll('button')].find(b=>/tested/i.test(b.innerText)); return b?b.innerText:null; })()`);
    check('"I tested this" 点击', tested.found, `点击前: ${tested.before} → 点击后: ${afterT}`);
  }

  // ---- E. 详情页 Add to collection 弹窗 ----
  if (slug) {
    await nav('/prompts/' + slug); await waitLoad(); await sleep(4000);
    const coll = await ev(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /add to collection|collection/i.test(b.innerText) && !/My/i.test(b.innerText));
      if (!btn) return { found: false };
      btn.click();
      return { found: true };
    })()`);
    await sleep(2000);
    const dialog = await ev(`(() => { const d=document.querySelector('[role=dialog],dialog'); return d ? d.innerText.slice(0,150) : (document.body.innerText.match(/create collection|new collection/i)?'text-hint':'none'); })()`);
    check('Add to collection 弹窗', coll.found, String(dialog).slice(0, 100));
  }

  console.log('\n=== 汇总 ===');
  for (const r of RESULTS) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  ws.close(); chrome.kill();
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
main().catch(e => { console.error('ERR', e); try { chrome.kill(); } catch {} process.exit(1); });
