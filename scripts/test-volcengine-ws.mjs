import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';

const appKey = process.env.VOLCENGINE_ASR_APP_KEY || process.env.VOLCENGINE_ARK_API_KEY;
const accessKey = process.env.VOLCENGINE_ASR_ACCESS_KEY || process.env.VOLCENGINE_ARK_API_KEY;
const resourceId = process.env.VOLCENGINE_ASR_RESOURCE_ID || 'volc.seedasr.sauc.duration';

const buildStartFrame = () => {
  const payload = Buffer.from(
    JSON.stringify({
      user: { uid: 'test-user' },
      audio: { format: 'pcm', codec: 'raw', rate: 16000, bits: 16, channel: 1 },
      request: { model_name: 'bigmodel', enable_itn: true, enable_punc: true, show_utterances: true },
    }),
  );
  const header = Buffer.from([0x11, 0x11, 0x10, 0x00]);
  const seq = Buffer.alloc(4);
  seq.writeInt32BE(1, 0);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, seq, size, payload]);
};

console.log('Testing upstream with appKey prefix:', appKey?.slice(0, 12), 'resourceId:', resourceId);

const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async', {
  headers: {
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Connect-Id': randomUUID(),
  },
});

ws.on('unexpected-response', (_req, res) => {
  console.error('HTTP upgrade failed:', res.statusCode, res.statusMessage);
  res.on('data', (chunk) => console.error(chunk.toString()));
});

ws.on('open', () => {
  console.log('upstream open, response headers:', ws.protocol);
  ws.send(buildStartFrame());
  setTimeout(() => ws.close(), 3000);
});

ws.on('message', (data) => {
  const buf = Buffer.from(data);
  console.log('message bytes:', buf.length, 'header:', buf.subarray(0, 4).toString('hex'));
  if (buf.length >= 12) {
    const msgType = (buf[1] >> 4) & 0x0f;
    const size = buf.readUInt32BE(8);
    const body = buf.subarray(12, 12 + size).toString('utf8');
    console.log('msgType:', msgType, 'body preview:', body.slice(0, 500));
  }
});

ws.on('error', (err) => console.error('error:', err.message));
ws.on('close', (code, reason) => console.log('close:', code, reason.toString()));
