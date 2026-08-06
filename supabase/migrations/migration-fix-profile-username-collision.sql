-- ============================================================
-- PromptHub - 修复 profiles.username 唯一约束冲突
-- 站主创建同名客户时，user_metadata.username = 客户名会撞唯一键（创建失败）
-- → 触发器改为冲突时追加序号（Acme → Acme-2 → Acme-3…）
-- 对普通注册也生效，作为安全网（注册页已校验唯一性，正常不触发）
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  seq INT := 1;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1));
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    seq := seq + 1;
    final_username := base_username || '-' || seq;
  END LOOP;
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, final_username, NEW.raw_user_meta_data ->> 'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
