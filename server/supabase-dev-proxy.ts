import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';

const readRequestBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const createSupabaseDevProxy = (env: Record<string, string> = process.env as Record<string, string>): Plugin => ({
  name: 'supabase-dev-proxy',
  configureServer(server) {
    const upstream = (env.SUPABASE_UPSTREAM_URL || env.VITE_SUPABASE_URL)?.trim().replace(/\/$/, '');
    if (!upstream) return;

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/supabase-proxy')) {
        next();
        return;
      }

      const targetPath = req.url.replace(/^\/supabase-proxy(?=\/|\?|$)/, '') || '/';
      const targetUrl = `${upstream}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;

      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (!value || key === 'host' || key === 'connection' || key === 'content-length') continue;
          if (Array.isArray(value)) {
            value.forEach((item) => headers.append(key, item));
          } else {
            headers.set(key, value);
          }
        }

        const method = req.method ?? 'GET';
        const body =
          method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : await readRequestBody(req);

        const response = await fetch(targetUrl, { method, headers, body });

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'transfer-encoding') return;
          res.setHeader(key, value);
        });

        const payload = Buffer.from(await response.arrayBuffer());
        res.end(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Supabase 代理请求失败';
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: 'supabase_proxy_failed',
            message,
            upstream,
            hint:
              '无法解析或连接 Supabase 项目地址。请在 Supabase Dashboard → Project Settings → API 复制正确的 Project URL，并确认项目未被暂停或删除。',
          }),
        );
      }
    });

    server.config.logger.info(`[supabase-dev-proxy] upstream ${upstream}`);
  },
});
