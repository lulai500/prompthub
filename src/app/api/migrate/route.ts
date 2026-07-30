// ============================================================
// 一次性：执行数据库迁移（运行成功后请删除此文件）
// ============================================================
import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST() {
  const PW = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const REF = 'azwbgluryvlstsxcdvje';

  const client = new Client({
    host: `db.${REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: PW,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const results: string[] = [];

  try {
    await client.connect();
    results.push('Connected');

    const sqls = [
      `ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS example_output TEXT`,
      `CREATE OR REPLACE VIEW public.profiles_public AS SELECT id, username, avatar_url, bio, created_at FROM public.profiles`,
      `CREATE TABLE IF NOT EXISTS public.ratings (id SERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE, rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, prompt_id))`,
      `ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='public_read_ratings') THEN CREATE POLICY public_read_ratings ON public.ratings FOR SELECT USING (true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='user_manage_ratings') THEN CREATE POLICY user_manage_ratings ON public.ratings FOR ALL USING (auth.uid() = user_id); END IF; END $$`,
      `CREATE OR REPLACE VIEW public.prompt_stats AS SELECT p.id AS prompt_id, COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS rating_count, COUNT(f.id) AS favorite_count FROM public.prompts p LEFT JOIN public.ratings r ON r.prompt_id=p.id LEFT JOIN public.favorites f ON f.prompt_id=p.id GROUP BY p.id`,
    ];

    for (const sql of sqls) {
      await client.query(sql);
      results.push(`OK: ${sql.slice(0, 60).replace(/\n/g, ' ')}`);
    }

    await client.end();
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    try { await client.end(); } catch {}
    return NextResponse.json({ ok: false, error: e.message, results });
  }
}
