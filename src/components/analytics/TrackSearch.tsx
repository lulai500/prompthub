'use client';
// ============================================================
// 搜索行为埋点
// 当页面带 search 参数加载时，向 Vercel Analytics 上报一次搜索事件
// 用 ref 去重，避免重复导航时重复上报同一次搜索
// ============================================================

import { useEffect, useRef } from 'react';
import { track } from '@vercel/analytics';

export default function TrackSearch({ query }: { query: string }) {
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (query && tracked.current !== query) {
      tracked.current = query;
      track('prompt_search', { query });
    }
  }, [query]);

  return null;
}
