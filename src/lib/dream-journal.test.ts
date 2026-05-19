import { describe, expect, it } from 'vitest';
import {
  analyzeDreamContent,
  createDreamEntry,
  decryptDreamEntries,
  encryptDreamEntries,
  exportDreamJournalJson,
  filterDreamEntries,
  stripHtml,
} from './dream-journal';

describe('dream journal utilities', () => {
  it('analyzes known keywords', () => {
    const insights = analyzeDreamContent('我梦见自己在海洋上飞行');
    expect(insights.some((item) => item.keyword === '飞行')).toBe(true);
    expect(insights.some((item) => item.keyword === '海洋')).toBe(true);
  });

  it('creates dream entry with stripped plain text', () => {
    const entry = createDreamEntry({
      title: '测试梦境',
      html: '<p>梦见自己在门后面飞行</p>',
      themes: ['lucid'],
      tags: ['飞行'],
      attachments: [],
      personalInterpretation: '可能代表想突破限制',
    });

    expect(entry.title).toBe('测试梦境');
    expect(entry.plainText).toContain('飞行');
    expect(entry.autoInsights.length).toBeGreaterThan(0);
  });

  it('encrypts and decrypts entries', async () => {
    const entries = [
      createDreamEntry({
        title: '加密梦境',
        html: '<p>我在森林里追逐光</p>',
        themes: ['surreal'],
        tags: ['森林'],
        attachments: [],
        personalInterpretation: '',
      }),
    ];

    const encrypted = await encryptDreamEntries(entries, 'secret-123456');
    const decrypted = await decryptDreamEntries(encrypted, 'secret-123456');
    expect(decrypted[0].title).toBe('加密梦境');
  });

  it('filters entries by query and date', () => {
    const first = createDreamEntry({
      title: '海洋梦',
      html: '<p>海洋和飞行</p>',
      themes: ['lucid'],
      tags: ['海洋'],
      attachments: [],
      personalInterpretation: '',
    });
    const second = createDreamEntry({
      title: '森林梦',
      html: '<p>森林和门</p>',
      themes: ['healing'],
      tags: ['森林'],
      attachments: [],
      personalInterpretation: '',
    });

    const filtered = filterDreamEntries([first, second], {
      query: '森林',
      date: second.recordedAt.slice(0, 10),
      theme: 'healing',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('森林梦');
  });

  it('exports json backup with entry count', async () => {
    const entry = createDreamEntry({
      title: '备份梦境',
      html: '<p>光和门</p>',
      themes: ['premonition'],
      tags: [],
      attachments: [],
      personalInterpretation: '',
    });
    const blob = exportDreamJournalJson([entry]);
    const text = await blob.text();
    expect(text).toContain('"count": 1');
    expect(text).toContain('备份梦境');
  });

  it('strips html reliably', () => {
    expect(stripHtml('<p>Hello <strong>Dream</strong></p>')).toBe('Hello Dream');
  });
});
