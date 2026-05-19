/**
 * Explains generic browser `fetch` failures (Supabase JS uses `fetch` for Auth and PostgREST).
 * Returns `null` when the message is not a known network-level failure.
 */
export function tryExplainFetchFailure(message: string): string | null {
  const lower = message.trim().toLowerCase();
  if (
    lower === 'failed to fetch' ||
    lower.includes('networkerror when attempting to fetch resource') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return (
      '无法连接 Supabase（Failed to fetch）。优先尝试：用 Chrome/Edge 直接打开 http://localhost:3000；' +
      '暂时关闭杀毒「HTTPS 扫描」或换手机热点；核对 .env 中 VITE_SUPABASE_URL。' +
      '若控制台为 net::ERR_CONNECTION_CLOSED，多为 TLS 被代理/防火墙/地区网络中断。'
    );
  }
  return null;
}
