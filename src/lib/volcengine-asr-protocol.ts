const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001;

export const VOLCENGINE_MESSAGE_TYPE = {
  fullClientRequest: 0b0001,
  audioOnlyRequest: 0b0010,
  fullServerResponse: 0b1001,
  error: 0b1111,
} as const;

export const VOLCENGINE_SERIALIZATION = {
  none: 0b0000,
  json: 0b0001,
} as const;

export const VOLCENGINE_COMPRESSION = {
  none: 0b0000,
  gzip: 0b0001,
} as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface VolcengineTranscriptUpdate {
  interim: string;
  finalSegment: string;
}

const createSignedInt32Buffer = (value: number) => {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setInt32(0, value, false);
  return new Uint8Array(buffer);
};

const createUnsignedInt32Buffer = (value: number) => {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, value, false);
  return new Uint8Array(buffer);
};

const concatBytes = (...chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
};

export const buildVolcengineBinaryFrame = (options: {
  messageType: number;
  messageTypeFlags: number;
  serialization: number;
  compression: number;
  prefixBuffers?: Uint8Array[];
  payload: Uint8Array;
}) => {
  const header = new Uint8Array(4);
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE;
  header[1] = (options.messageType << 4) | (options.messageTypeFlags & 0x0f);
  header[2] = (options.serialization << 4) | (options.compression & 0x0f);
  header[3] = 0;

  return concatBytes(
    header,
    ...(options.prefixBuffers ?? []),
    createUnsignedInt32Buffer(options.payload.length),
    options.payload,
  );
};

export const buildVolcengineStartFrame = (options: { sequence: number; userId: string }) => {
  const payload = textEncoder.encode(
    JSON.stringify({
      user: { uid: options.userId },
      audio: {
        format: 'pcm',
        codec: 'raw',
        rate: 16000,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
        show_utterances: true,
        result_type: 'single',
      },
    }),
  );

  return buildVolcengineBinaryFrame({
    messageType: VOLCENGINE_MESSAGE_TYPE.fullClientRequest,
    messageTypeFlags: 0b0001,
    serialization: VOLCENGINE_SERIALIZATION.json,
    compression: VOLCENGINE_COMPRESSION.none,
    prefixBuffers: [createSignedInt32Buffer(options.sequence)],
    payload,
  });
};

export const buildVolcengineAudioFrame = (options: { sequence: number; audioBytes: Uint8Array; isFinal: boolean }) =>
  buildVolcengineBinaryFrame({
    messageType: VOLCENGINE_MESSAGE_TYPE.audioOnlyRequest,
    messageTypeFlags: options.isFinal ? 0b0011 : 0b0001,
    serialization: VOLCENGINE_SERIALIZATION.none,
    compression: VOLCENGINE_COMPRESSION.none,
    prefixBuffers: [createSignedInt32Buffer(options.isFinal ? -Math.abs(options.sequence) : options.sequence)],
    payload: options.audioBytes,
  });

const decodeVolcenginePayload = async (payload: Uint8Array, compression: number) => {
  if (compression !== VOLCENGINE_COMPRESSION.gzip || payload.length === 0) {
    return payload;
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 gzip 解压。');
  }

  const stream = new Blob([payload.slice().buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const decodeSerializedPayload = (payload: Uint8Array, serialization: number) => {
  if (serialization === VOLCENGINE_SERIALIZATION.none) {
    return textDecoder.decode(payload);
  }

  const text = textDecoder.decode(payload);
  if (serialization === VOLCENGINE_SERIALIZATION.json) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extractVolcengineTranscript = (payload: unknown) => {
  if (!isRecord(payload)) return '';

  const result = payload.result;
  if (isRecord(result) && typeof result.text === 'string') {
    return result.text;
  }

  if (Array.isArray(result)) {
    return result
      .map((item) => (isRecord(item) && typeof item.text === 'string' ? item.text : ''))
      .join('');
  }

  return typeof payload.text === 'string' ? payload.text : '';
};

export const hasDefiniteVolcengineUtterance = (payload: unknown) => {
  if (!isRecord(payload) || !isRecord(payload.result)) return false;
  const utterances = payload.result.utterances;
  return Array.isArray(utterances) && utterances.some((item) => isRecord(item) && item.definite === true);
};

export const parseVolcengineTranscriptUpdate = (
  payload: unknown,
  isFinalPacket: boolean,
  lastFinalText: string,
): VolcengineTranscriptUpdate => {
  const text = extractVolcengineTranscript(payload).trim();
  if (!text) {
    return { interim: '', finalSegment: '' };
  }

  const definite = isFinalPacket || hasDefiniteVolcengineUtterance(payload);
  if (definite) {
    const finalSegment = text.startsWith(lastFinalText) ? text.slice(lastFinalText.length).trim() : text;
    return { interim: '', finalSegment };
  }

  return { interim: text, finalSegment: '' };
};

export const parseVolcengineServerPacket = async (rawData: ArrayBuffer) => {
  const data = new Uint8Array(rawData);
  if (data.length < 4) {
    return { type: 'unknown' as const };
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const messageType = (view.getUint8(1) >> 4) & 0x0f;
  const messageTypeFlags = view.getUint8(1) & 0x0f;
  const serialization = (view.getUint8(2) >> 4) & 0x0f;
  const compression = view.getUint8(2) & 0x0f;

  if (messageType === VOLCENGINE_MESSAGE_TYPE.error) {
    const code = data.length >= 8 ? view.getUint32(4, false) : 0;
    const size = data.length >= 12 ? view.getUint32(8, false) : 0;
    const message = textDecoder.decode(data.subarray(12, 12 + size));
    return { type: 'error' as const, code, message: message || '语音识别服务返回错误' };
  }

  if (messageType !== VOLCENGINE_MESSAGE_TYPE.fullServerResponse || data.length < 12) {
    return { type: 'unknown' as const };
  }

  const payloadSize = view.getUint32(8, false);
  const payloadStart = 12;
  const payloadEnd = payloadStart + payloadSize;
  if (data.length < payloadEnd) {
    return { type: 'unknown' as const };
  }

  const payload = await decodeVolcenginePayload(data.subarray(payloadStart, payloadEnd), compression);
  return {
    type: 'response' as const,
    data: decodeSerializedPayload(payload, serialization),
    isFinal: messageTypeFlags === 0b0010 || messageTypeFlags === 0b0011,
  };
};

export const toWebSocketBuffer = (data: Uint8Array) => {
  const { buffer, byteOffset, byteLength } = data;
  if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) {
    return buffer;
  }
  return data.slice().buffer;
};
