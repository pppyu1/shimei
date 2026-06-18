import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Plugin } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { getSpeechProviderConfig, transcribeSpeechAudio } from './speech-provider';

const UPSTREAM_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async';

const readJsonBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

export const createVolcengineSpeechProxy = (env: Record<string, string> = process.env as Record<string, string>): Plugin => ({
  name: 'volcengine-speech-proxy',
  configureServer(server) {
    const wss = new WebSocketServer({ noServer: true });

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/speech/')) {
        next();
        return;
      }

      const config = getSpeechProviderConfig(env);

      if (req.url === '/api/speech/status' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            provider: config.mode === 'asr' ? 'volcengine-asr' : config.mode === 'ark-speech' ? 'volcengine-ark' : 'browser',
            configured: config.configured,
            mode: config.mode,
            model: config.arkSpeechModel,
            message: config.message,
          }),
        );
        return;
      }

      if (req.url === '/api/speech/transcribe' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
          const format = typeof body.format === 'string' ? body.format : 'wav';

          if (!audioBase64) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: '缺少 audioBase64 参数。' }));
            return;
          }

          const result = await transcribeSpeechAudio(
            config,
            audioBase64,
            format as 'wav' | 'mp3' | 'ogg' | 'pcm',
          );
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : '语音识别失败' }));
        }
        return;
      }

      next();
    });

    server.httpServer?.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (!request.url?.startsWith('/api/speech/ws')) {
        return;
      }

      const config = getSpeechProviderConfig(env);
      if (config.mode !== 'asr') {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (clientWs) => {
        const upstream = new WebSocket(UPSTREAM_URL, {
          headers: {
            'X-Api-App-Key': config.asrAppKey,
            'X-Api-Access-Key': config.asrAccessKey,
            'X-Api-Resource-Id': config.asrResourceId,
            'X-Api-Connect-Id': randomUUID(),
          },
        });

        const queuedMessages: Buffer[] = [];

        clientWs.on('message', (data) => {
          const payload = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(payload, { binary: true });
            return;
          }
          queuedMessages.push(payload);
        });

        upstream.on('message', (data, isBinary) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
          }
        });

        upstream.on('open', () => {
          queuedMessages.forEach((payload) => upstream.send(payload, { binary: true }));
        });

        const closeBoth = () => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
          if (upstream.readyState === WebSocket.OPEN) upstream.close();
        };

        clientWs.on('close', closeBoth);
        clientWs.on('error', closeBoth);
        upstream.on('close', () => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        });
        upstream.on('error', () => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1011, 'upstream_error');
        });
      });
    });
  },
});
