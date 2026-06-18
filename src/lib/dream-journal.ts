import { jsPDF } from 'jspdf';

export type DreamTheme = 'lucid' | 'nightmare' | 'recurring' | 'healing' | 'surreal' | 'premonition';

export interface DreamAttachment {
  id: string;
  kind: 'image' | 'video';
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface DreamInsight {
  keyword: string;
  meaning: string;
}

export interface DreamEntry {
  id: string;
  title: string;
  html: string;
  plainText: string;
  recordedAt: string;
  themes: DreamTheme[];
  tags: string[];
  attachments: DreamAttachment[];
  personalInterpretation: string;
  autoInsights: DreamInsight[];
}

export interface DreamReminderSettings {
  enabled: boolean;
  time: string;
  progressiveAlarm: boolean;
  guidanceVoice: boolean;
}

export interface DreamPrivacySettings {
  encryptionEnabled: boolean;
  biometricUnlock: boolean;
  locked: boolean;
  decoyEnabled: boolean;
  passphraseVerifier?: string;
  decoyVerifier?: string;
}

export interface DreamJournalStore {
  entries: DreamEntry[];
  reminder: DreamReminderSettings;
  privacy: DreamPrivacySettings;
}

export interface DreamJournalSummary {
  count: number;
  latestRecordedAt: string | null;
  latestTitle: string | null;
  encrypted: boolean;
}

type PersistedDreamJournalStore = Omit<DreamJournalStore, 'entries'> & {
  entries: DreamEntry[];
  encryptedVault?: string;
  decoyVault?: string;
};

const storeKey = 'shimei:dream-journal';
const fileSizeLimit = 5 * 1024 * 1024;

export const defaultDreamJournalStore: DreamJournalStore = {
  entries: [],
  reminder: {
    enabled: false,
    time: '07:30',
    progressiveAlarm: true,
    guidanceVoice: true,
  },
  privacy: {
    encryptionEnabled: false,
    biometricUnlock: false,
    locked: false,
    decoyEnabled: false,
  },
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const keywordMap: Record<string, string> = {
  飞行: '自由渴望与突破束缚的愿望',
  坠落: '对失控、压力或安全感缺失的担忧',
  海洋: '情绪深层流动与潜意识探索',
  森林: '自我修复、未知探索与回归自然',
  追逐: '未完成事务、逃避压力或内在焦虑',
  门: '新的阶段、机会或需要做出的选择',
  火车: '人生节奏、方向和他人期待',
  婴儿: '新的开始、脆弱感或照顾需求',
  水: '情绪释放、净化与流动',
  光: '希望、灵感和认知提升',
};

export const dreamThemeOptions: { id: DreamTheme; label: string }[] = [
  { id: 'lucid', label: '清醒梦' },
  { id: 'nightmare', label: '噩梦' },
  { id: 'recurring', label: '重复梦' },
  { id: 'healing', label: '疗愈梦' },
  { id: 'surreal', label: '超现实梦' },
  { id: 'premonition', label: '预感梦' },
];

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeStore = (raw?: Partial<PersistedDreamJournalStore> | null): PersistedDreamJournalStore => ({
  entries: Array.isArray(raw?.entries) ? raw.entries : [],
  reminder: {
    enabled: typeof raw?.reminder?.enabled === 'boolean' ? raw.reminder.enabled : defaultDreamJournalStore.reminder.enabled,
    time: raw?.reminder?.time ?? defaultDreamJournalStore.reminder.time,
    progressiveAlarm:
      typeof raw?.reminder?.progressiveAlarm === 'boolean'
        ? raw.reminder.progressiveAlarm
        : defaultDreamJournalStore.reminder.progressiveAlarm,
    guidanceVoice:
      typeof raw?.reminder?.guidanceVoice === 'boolean'
        ? raw.reminder.guidanceVoice
        : defaultDreamJournalStore.reminder.guidanceVoice,
  },
  privacy: {
    encryptionEnabled:
      typeof raw?.privacy?.encryptionEnabled === 'boolean'
        ? raw.privacy.encryptionEnabled
        : defaultDreamJournalStore.privacy.encryptionEnabled,
    biometricUnlock:
      typeof raw?.privacy?.biometricUnlock === 'boolean'
        ? raw.privacy.biometricUnlock
        : defaultDreamJournalStore.privacy.biometricUnlock,
    locked: typeof raw?.privacy?.locked === 'boolean' ? raw.privacy.locked : defaultDreamJournalStore.privacy.locked,
    decoyEnabled:
      typeof raw?.privacy?.decoyEnabled === 'boolean'
        ? raw.privacy.decoyEnabled
        : defaultDreamJournalStore.privacy.decoyEnabled,
    passphraseVerifier: raw?.privacy?.passphraseVerifier,
    decoyVerifier: raw?.privacy?.decoyVerifier,
  },
  encryptedVault: raw?.encryptedVault,
  decoyVault: raw?.decoyVault,
});

export const loadDreamJournalStore = (): PersistedDreamJournalStore => {
  if (!canUseStorage()) {
    return { ...defaultDreamJournalStore };
  }

  try {
    const raw = window.localStorage.getItem(storeKey);
    return normalizeStore(raw ? (JSON.parse(raw) as PersistedDreamJournalStore) : null);
  } catch {
    return { ...defaultDreamJournalStore };
  }
};

export const getDreamJournalSummary = (): DreamJournalSummary => {
  const store = loadDreamJournalStore();
  const latest = [...store.entries].sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt))[0];
  return {
    count: store.entries.length,
    latestRecordedAt: latest?.recordedAt ?? null,
    latestTitle: latest?.title ?? null,
    encrypted: store.privacy.encryptionEnabled,
  };
};

export const persistDreamJournalStore = (store: PersistedDreamJournalStore) => {
  if (!canUseStorage()) {
    return { ok: true as const };
  }

  try {
    window.localStorage.setItem(storeKey, JSON.stringify(store));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '梦境数据保存失败';
    return { ok: false as const, error: message };
  }
};

const deriveKey = async (secret: string, salt: Uint8Array) => {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const createSecretVerifier = async (secret: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${toBase64(salt)}:${secret}`));
  return `${toBase64(salt)}.${toBase64(new Uint8Array(digest))}`;
};

export const verifySecret = async (secret: string, verifier?: string) => {
  if (!verifier) return false;
  const [saltBase64, expected] = verifier.split('.');
  if (!saltBase64 || !expected) return false;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${saltBase64}:${secret}`));
  return toBase64(new Uint8Array(digest)) === expected;
};

export const encryptDreamEntries = async (entries: DreamEntry[], secret: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(secret, salt);
  const payload = encoder.encode(JSON.stringify(entries));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return JSON.stringify({
    salt: toBase64(salt),
    iv: toBase64(iv),
    cipher: toBase64(new Uint8Array(encrypted)),
  });
};

export const decryptDreamEntries = async (encryptedPayload: string, secret: string) => {
  const parsed = JSON.parse(encryptedPayload) as { salt: string; iv: string; cipher: string };
  const key = await deriveKey(secret, fromBase64(parsed.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
    key,
    fromBase64(parsed.cipher),
  );
  return JSON.parse(decoder.decode(decrypted)) as DreamEntry[];
};

export const analyzeDreamContent = (text: string, tags: string[] = []) => {
  const haystack = `${text} ${tags.join(' ')}`;
  const found = Object.entries(keywordMap)
    .filter(([keyword]) => haystack.includes(keyword))
    .map(([keyword, meaning]) => ({ keyword, meaning }));

  return found.length ? found : [{ keyword: '整体情绪', meaning: '当前梦境更适合结合个人经历进行主观解读。' }];
};

export const stripHtml = (html: string) => {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').trim();
  }
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent ?? '').trim();
};

export const createDreamEntry = (input: {
  title: string;
  html: string;
  themes: DreamTheme[];
  tags: string[];
  attachments: DreamAttachment[];
  personalInterpretation: string;
}) => {
  const plainText = stripHtml(input.html);
  return {
    id: createId(),
    title: input.title.trim() || '未命名梦境',
    html: input.html,
    plainText,
    recordedAt: new Date().toISOString(),
    themes: input.themes,
    tags: input.tags,
    attachments: input.attachments,
    personalInterpretation: input.personalInterpretation.trim(),
    autoInsights: analyzeDreamContent(plainText, input.tags),
  } satisfies DreamEntry;
};

export const filterDreamEntries = (entries: DreamEntry[], options: { query: string; date: string; theme: DreamTheme | 'all' }) =>
  entries
    .filter((entry) => {
      const matchesQuery =
        !options.query ||
        `${entry.title} ${entry.plainText} ${entry.tags.join(' ')} ${entry.personalInterpretation}`.toLowerCase().includes(options.query.toLowerCase());
      const matchesDate = !options.date || entry.recordedAt.slice(0, 10) === options.date;
      const matchesTheme = options.theme === 'all' || entry.themes.includes(options.theme);
      return matchesQuery && matchesDate && matchesTheme;
    })
    .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt));

export const serializeDreamJournalToJson = (entries: DreamEntry[]) =>
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    },
    null,
    2,
  );

export const exportDreamJournalJson = (entries: DreamEntry[]) => {
  const blob = new Blob([serializeDreamJournalToJson(entries)], { type: 'application/json;charset=utf-8' });
  return blob;
};

export const exportDreamJournalPdf = async (entries: DreamEntry[]) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 48;

  pdf.setFillColor(16, 18, 22);
  pdf.rect(0, 0, pageWidth, pdf.internal.pageSize.getHeight(), 'F');
  pdf.setTextColor(235, 235, 235);
  pdf.setFontSize(22);
  pdf.text('Dream Journal Report', 40, y);
  y += 26;
  pdf.setFontSize(11);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`Exported at ${new Date().toLocaleString('zh-CN')}`, 40, y);
  y += 32;

  const themeCounts = dreamThemeOptions.map((theme) => ({
    label: theme.label,
    count: entries.filter((entry) => entry.themes.includes(theme.id)).length,
  }));

  pdf.setFontSize(14);
  pdf.setTextColor(235, 195, 73);
  pdf.text('Statistics', 40, y);
  y += 18;

  themeCounts.forEach((item) => {
    pdf.setTextColor(220, 220, 220);
    pdf.setFontSize(11);
    pdf.text(`${item.label}`, 40, y);
    pdf.setFillColor(233, 195, 73);
    pdf.rect(130, y - 8, Math.max(8, item.count * 26), 10, 'F');
    pdf.text(String(item.count), 140 + Math.max(8, item.count * 26), y);
    y += 18;
  });

  y += 16;
  pdf.setTextColor(235, 195, 73);
  pdf.setFontSize(14);
  pdf.text('Entries', 40, y);
  y += 20;

  entries.slice(0, 12).forEach((entry) => {
    if (y > 730) {
      pdf.addPage();
      pdf.setFillColor(16, 18, 22);
      pdf.rect(0, 0, pageWidth, pdf.internal.pageSize.getHeight(), 'F');
      y = 48;
    }

    pdf.setFontSize(12);
    pdf.setTextColor(235, 235, 235);
    pdf.text(entry.title, 40, y);
    y += 14;
    pdf.setFontSize(10);
    pdf.setTextColor(180, 180, 180);
    pdf.text(`${new Date(entry.recordedAt).toLocaleString('zh-CN')} · ${entry.themes.map((t) => dreamThemeOptions.find((i) => i.id === t)?.label ?? t).join(' / ') || '未分类'}`, 40, y);
    y += 14;
    const lines = pdf.splitTextToSize(entry.plainText || '无正文', pageWidth - 80).slice(0, 4);
    pdf.text(lines, 40, y);
    y += lines.length * 12 + 18;
  });

  return pdf.output('blob');
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const fileToAttachment = async (file: File) => {
  if (file.size > fileSizeLimit) {
    throw new Error('附件需小于 5MB');
  }

  const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
  if (!kind) {
    throw new Error('仅支持图片或视频附件');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('附件读取失败'));
    reader.readAsDataURL(file);
  });

  return {
    id: createId(),
    kind,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl,
  } satisfies DreamAttachment;
};

export { supportsSpeechRecognition } from './speech-to-text';

export const supportsBiometricPrompt = () => typeof window !== 'undefined' && 'PublicKeyCredential' in window;
