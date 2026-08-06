// 可复用 CDP 测试脚本：headless Chrome 渲染任意 URL，可带 cookie，输出 title + body 文本 + 可选截图
// 用法:
//   node scripts/cdp-test.mjs --url "https://..." [--cookie "name=value"] [--screenshot out.png] [--wait 6000]
// 环境要求: Node 21+ (内置 WebSocket), Chrome 在标准路径

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL = opt('--url', '');
const COOKIES = opt('--cookie', null); // "name=value" 可逗号分隔多个
const SHOT = opt('--screenshot', null);
const WAIT = parseInt(opt('--wait', '6000'), 10);
const PORT = 9333 + Math.floor(Math.random() * 500);

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
                '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('chrome not found'); process.exit(1); }

const tmp = `C:/Users/lei/AppData/Local/Temp/cdp-${Date.now()}`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${tmp}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await sleep(200);
  }
  return false;
}

async function main() {
  await waitFor(`http://127.0.0.1:${PORT}/json/version`);
  // 新建页面 target
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await r.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(res => ws.onopen = res);

  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

  if (COOKIES) {
    const cookies = COOKIES.split(',').map(kv => {
      const [name, ...rest] = kv.split('=');
      return { name, value: rest.join('='), domain: '.vercel.app', path: '/', secure: true, httpOnly: false };
    });
    await send('Network.setCookies', { cookies });
  }

  await send('Page.navigate', { url: URL });
  await new Promise(res => { const h = e => { if (JSON.parse(e.data).method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } }; ws.addEventListener('message', h); });
  await sleep(WAIT); // 等客户端 JS

  const out = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({title: document.title, text: document.body ? document.body.innerText : ""})',
    returnByValue: true
  });
  const data = JSON.parse(out.result.value);

  if (SHOT) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
    console.log('[screenshot]', SHOT);
  }
  console.log('[title]', data.title);
  console.log('[body]');
  console.log(data.text.slice(0, 3000));

  ws.close(); chrome.kill();
  try { await new Promise(r => chrome.on('exit', r)); } catch {}
  // 清理临时 profile
  try { const { rmSync } = await import('node:fs'); rmSync(tmp, { recursive: true, force: true }); } catch {}
}
main().catch(e => { console.error('ERR', e.message); try { chrome.kill(); } catch {} process.exit(1); });
