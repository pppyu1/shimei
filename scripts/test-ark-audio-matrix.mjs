import { writeFileSync } from 'node:fs';

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const models = ['doubao-seed-2-0-pro-260215', 'doubao-seed-2-0-lite-260428', 'doubao-seed-2-0-mini-260428'];

if (!apiKey) {
  console.error('Set VOLCENGINE_ARK_API_KEY before running this script.');
  process.exit(1);
}

const pcm = Buffer.alloc(32000, 0);
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

const payloads = [
  {
    name: 'responses-input_audio-data',
    url: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    body: (model) => ({
      model,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: '转写语音，只输出文字' },
          { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } },
        ],
      }],
    }),
  },
  {
    name: 'responses-audio_url',
    url: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    body: (model) => ({
      model,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: '转写语音，只输出文字' },
          { type: 'input_audio', audio_url: `data:audio/wav;base64,${audioBase64}` },
        ],
      }],
    }),
  },
  {
    name: 'chat-input_audio-data',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    body: (model) => ({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '转写语音，只输出文字' },
          { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } },
        ],
      }],
    }),
  },
  {
    name: 'chat-audio_url-data-uri',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    body: (model) => ({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '转写语音，只输出文字' },
          { type: 'audio_url', audio_url: { url: `data:audio/wav;base64,${audioBase64}` } },
        ],
      }],
    }),
  },
];

for (const model of models) {
  for (const payload of payloads) {
    const response = await fetch(payload.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.body(model)),
    });
    const text = await response.text();
    console.log('\n===', payload.name, model, response.status, '===');
    console.log(text.slice(0, 400));
  }
}

writeFileSync('scripts/test-ark-audio-matrix.done', 'ok');
