import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).filter(l => !l.startsWith('#'));
const get = k => { const l = env.find(x => x.startsWith(k + '=')); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, '') : undefined; };
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

const { data } = await supabase.from('prompts').select('id, title, example_output').eq('is_published', true);
const list = data || [];
const has = list.filter(p => p.example_output && p.example_output.length > 50);
console.log('真实输出覆盖:', has.length + '/561');
console.log('平均长度:', Math.round(list.reduce((s, p) => s + (p.example_output || '').length, 0) / list.length), '字符');

const backslash = list.filter(p => (p.example_output || '').includes('\\'));
console.log('含反斜杠的输出条数:', backslash.length, '(>0 说明转义正确保存)');

const shell = list.filter(p => (p.example_output || '').includes('$LOCK_FILE'));
console.log('含 $LOCK_FILE 的行正确保存:', shell.length > 0 ? '是 ✓' : '否');

// 抽样看质量（之前请求输入类的提示词）
const sample = list.find(p => (p.title || '').includes('Analyze Python Code'));
if (sample) console.log('\n抽样 [' + sample.title + ']:\n' + (sample.example_output || '').slice(0, 200));
