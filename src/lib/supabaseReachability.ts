import { tryExplainFetchFailure } from './supabaseErrors';

/** GET /auth/v1/health — same host as OTP; uses fetch so failures match browser reality. */
export async function pingSupabaseAuthHealth(baseUrl: string, anonKey: string): Promise<{ ok: boolean; userMessage: string }> {
  const base = baseUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (res.ok) {
      return { ok: true, userMessage: '连接正常：已能访问 Supabase Auth，可再试「发送 OTP 登录链接」。若仍失败，多为 Redirect URL 或邮件频率限制。' };
    }
    const text = await res.text().catch(() => '');
    return { ok: false, userMessage: `连接异常：HTTP ${res.status} ${text.slice(0, 120)}` };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const hint = tryExplainFetchFailure(raw) ?? raw;
    return { ok: false, userMessage: `连接失败：${hint}` };
  }
}
