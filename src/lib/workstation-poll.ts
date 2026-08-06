// ============================================================
// 客户工作站 - 客户端轮询助手（提交 / 重试 / 重新生成共用）
// 轮询 GET /api/workstation/tasks/[id] 直至终态（completed/failed）
// ============================================================

export interface TaskPollState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'timeout';
  result?: string | null;
  error?: string | null;
}

/**
 * 轮询任务状态直至终态或超时。
 * - 默认每 2.5s 一次、75s 超时（run 端点 maxDuration=60 + 余量）
 * - 网络抖动静默忽略，继续轮询
 */
export async function pollTaskStatus(
  taskId: number,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<TaskPollState> {
  const interval = opts.intervalMs ?? 2500;
  const timeout = opts.timeoutMs ?? 75_000;
  const deadline = Date.now() + timeout;

  while (true) {
    try {
      const res = await fetch(`/api/workstation/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          return { status: data.status, result: data.result, error: data.error };
        }
      }
    } catch {
      // 网络抖动：忽略继续轮询
    }
    if (Date.now() > deadline) return { status: 'timeout' };
    await new Promise((r) => setTimeout(r, interval));
  }
}
