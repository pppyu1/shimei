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
      '无法连接 Supabase（Failed to fetch）。请按顺序检查：' +
      '① 在 Supabase Dashboard → Project Settings → API 复制正确的 Project URL 与 anon key 到 .env.local；' +
      '② 在浏览器直接打开「你的项目URL/auth/v1/health」，若打不开说明项目不存在、已删除或被网络拦截；' +
      '③ 本地开发可在 .env.local 设置 VITE_SUPABASE_DEV_PROXY=true 后重启 npm run dev，走 localhost 代理；' +
      '④ 关闭杀毒 HTTPS 扫描或换手机热点。控制台若为 net::ERR_CONNECTION_CLOSED，多为 TLS/防火墙/地区网络问题。'
    );
  }
  if (lower.includes('supabase_proxy_failed') || lower.includes('could not resolve host')) {
    return (
      'Supabase 项目地址无效或无法解析。请登录 Supabase 控制台确认项目存在，并更新 .env.local 中的 VITE_SUPABASE_URL（形如 https://xxxx.supabase.co）。'
    );
  }
  return null;
}
