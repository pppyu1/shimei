const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const model = process.env.VOLCENGINE_ARK_SPEECH_MODEL || 'doubao-seed-2-0-mini-260428';

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

const body = {
  model,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '请将这段语音转写为文字，只输出转写结果，不要解释。' },
        { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } },
      ],
    },
  ],
};

const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await response.text();
console.log('status', response.status);
console.log(text.slice(0, 1200));
