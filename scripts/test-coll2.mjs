import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
const BASE='https://prompthub-pi-hdrjmou30-lin-8f77.vercel.app', EMAIL='demo-client@prompthub.app', PASS='DemoPass2026!';
const CHROME=['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const PROFILE=`C:/Users/lei/AppData/Local/Temp/c2-${Date.now()}`;mkdirSync(PROFILE,{recursive:true});
const PORT=9830+Math.floor(Math.random()*10);
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await new Promise(r=>{const i=setInterval(async()=>{try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok){clearInterval(i);r();}}catch{}},200);});
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();
const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}};
await send('Page.enable');await send('Runtime.enable');
const nav=u=>send('Page.navigate',{url:BASE+u});
const load=()=>new Promise(res=>{const h=e=>{if(JSON.parse(e.data).method==='Page.loadEventFired'){ws.removeEventListener('message',h);res();}};ws.addEventListener('message',h);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
const waitFor=async(expr,ms=20000,step=500)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(expr))return true;await sleep(step);}return false;};

await nav('/auth/login');await load();await sleep(5000);
await ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');
const sV=(el,v)=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
sV(e,${JSON.stringify(EMAIL)});sV(p,${JSON.stringify(PASS)});p.closest('form').requestSubmit();return true;})()`);
await waitFor(`location.pathname!=='/auth/login'`,25000);
console.log('登录路径:',await ev('location.pathname'));

await nav('/');await load();await sleep(3500);
const slug=await ev(`(()=>{const a=[...document.querySelectorAll('a[href*="/prompts/"]')].find(x=>x.href.split('/').pop().length>3);return a?a.href.split('/').pop():null;})()`);
await nav('/prompts/'+slug);await load();await sleep(5000);
console.log('详情页路径:',await ev('location.pathname'));
const btnText=await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/add to collection/i.test(b.innerText));return b?b.innerText:'NO-BTN';})()`);
console.log('Add to collection 按钮:',btnText);
await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/add to collection/i.test(b.innerText));if(b)b.click();return true;})()`);
await sleep(2500);
const diag=await ev(`(()=>{const t=document.body.innerText;
return JSON.stringify({path:location.pathname, hasPanel:t.includes('Save to a collection'), hasNoColl:t.includes('No collections yet'), hasInput:!!document.querySelector('input[placeholder="New collection name"]')});})()`);
console.log('点击后诊断:',diag);
if((JSON.parse(diag)).hasInput){
  await ev(`(()=>{const i=document.querySelector('input[placeholder="New collection name"]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(i,'Claude 测试合集');i.dispatchEvent(new Event('input',{bubbles:true}));
  const b=[...document.querySelectorAll('button')].find(b=>/create\s*&\s*add/i.test(b.innerText));if(b)b.click();return true;})()`);
  await sleep(4500);
  console.log('创建后按钮:',await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/saved|add to collection/i.test(b.innerText));return b?b.innerText:'-';})()`));
  await nav('/dashboard');await load();await sleep(4500);
  console.log('Dashboard 含测试合集:',(await ev('document.body.innerText')).includes('Claude 测试合集'));
}
ws.close();chrome.kill();try{rmSync(PROFILE,{recursive:true,force:true});}catch{}
