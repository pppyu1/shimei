import { randomUUID } from 'node:crypto';

const appKey = process.env.VOLCENGINE_ASR_APP_KEY || process.env.VOLCENGINE_ARK_API_KEY;
const accessKey = process.env.VOLCENGINE_ASR_ACCESS_KEY || process.env.VOLCENGINE_ARK_API_KEY;

// silent PCM wav 0.5s 16k mono
const pcm = Buffer.alloc(16000, 0);
const wavHeader = Buffer.alloc(44);
wavHeader.write('RIFF', 0);
wavHeader.writeUInt32LE(36 + pcm.length, 4);
wavHeader.write('WAVE', 8);
wavHeader.write('fmt ', 12);
wavHeader.writeUInt32LE(16, 16);
wavHeader.writeUInt16LE(1, 20);
wavHeader.writeUInt16LE(1, 22);
wavHeader.writeUInt32LE(16000, 24);
wavHeader.writeUInt32LE(32000, 28);
wavHeader.writeUInt16LE(2, 32);
wavHeader.writeUInt16LE(16, 34);
wavHeader.write('data', 36);
wavHeader.writeUInt32LE(pcm.length, 40);
const audioBase64 = Buffer.concat([wavHeader, pcm]).toString('base64');

const body = JSON.stringify({
  user: { uid: appKey },
  audio: { data: audioBase64, format: 'wav' },
  request: { model_name: 'bigmodel', enable_itn: true, enable_punc: true },
});

const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
    'X-Api-Request-Id': randomUUID(),
    'X-Api-Sequence': '-1',
  },
  body,
});

console.log('status', response.status);
console.log('headers', Object.fromEntries(response.headers.entries()));
console.log('body', (await response.text()).slice(0, 500));
