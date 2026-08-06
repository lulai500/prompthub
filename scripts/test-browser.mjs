// 真实登录 + 多页渲染测试（持久 Chrome 会话）
// 用法: node scripts/test-browser.mjs --base https://... --email x@y --password pwd
import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', '');
const EMAIL = opt('--email', '');
const PASS = opt('--password', '');
const PAGES = (opt('--pages', '/dashboard') || '').split(',');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const PROFILE = `C:/Users/lei/AppData/Local/Temp/browser-test-${Date.now()}`;
mkdirSync(PROFILE, { recursive: true });
const PORT = 9400 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(200); }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map();
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  await send('Page.enable'); await send('Runtime.enable');
  const nav = url => send('Page.navigate', { url });
  const waitLoad = () => new Promise(res => { const h = e => { if (JSON.parse(e.data).method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } }; ws.addEventListener('message', h); });
  const sleep2 = ms => sleep(ms);
  const evalJS = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; };

  const dump = async (label) => {
    const t = await evalJS('document.title');
    const txt = (await evalJS('document.body ? document.body.innerText : ""') || '');
    console.log(`\n===== ${label} | <title>${t}`);
    console.log(txt.slice(0, 1600).replace(/\n{2,}/g, '\n'));
  };

  // 1) 打开登录页
  await nav(BASE + '/auth/login'); await waitLoad(); await sleep2(2500);
  const hasForm = await evalJS(`!!document.querySelector('input[type=email],input[name=email]')`);
  if (!hasForm) { console.log('登录页未找到表单，尝试 /auth/login 直接判断'); await dump('login-page'); }
  else {
    // React 兼容填值
    await evalJS(`(() => {
      const setV = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
      const e = document.querySelector('input[type=email],input[name=email]');
      const p = document.querySelector('input[type=password],input[name=password]');
      if (e) setV(e, ${JSON.stringify(EMAIL)});
      if (p) setV(p, ${JSON.stringify(PASS)});
      return !!e && !!p;
    })()`);
    await sleep2(500);
    const clicked = await evalJS(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /sign\\s*in|log\\s*in/i.test(b.innerText));
      if (btn) { btn.click(); return true; } return false;
    })()`);
    console.log('登录表单填值+点击:', clicked);
    await sleep2(6000);
  }

  // 2) 遍历页面
  for (const p of PAGES) {
    await nav(BASE + p); await waitLoad(); await sleep2(5000);
    const url = await evalJS('location.pathname');
    await dump(`${p}  (实际路径: ${url})`);
  }

  ws.close(); chrome.kill();
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
main().catch(e => { console.error('ERR', e); try { chrome.kill(); } catch {} process.exit(1); });
