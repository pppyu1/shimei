import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Download, FileText, ImagePlus, Mic, Search, Sparkles, Tags, Video, Wand2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  analyzeDreamContent,
  createDreamEntry,
  defaultDreamJournalStore,
  downloadBlob,
  dreamThemeOptions,
  exportDreamJournalJson,
  exportDreamJournalPdf,
  fileToAttachment,
  filterDreamEntries,
  loadDreamJournalStore,
  persistDreamJournalStore,
  supportsSpeechRecognition,
  type DreamAttachment,
  type DreamEntry,
  type DreamJournalStore,
  type DreamTheme,
} from '../../lib/dream-journal';

const reminderVoices = [
  '慢慢回想今晨最先浮现的画面。',
  '试着记下梦里最强烈的情绪和场景。',
  '不需要完整，只记录你还记得的片段。',
];

const getModuleThemeClasses = (visualTheme: 'obsidian' | 'dawn') =>
  visualTheme === 'dawn'
    ? {
        moduleShellClass:
          'space-y-6 rounded-[2rem] border border-amber-950/10 bg-[rgba(255,248,242,0.62)] p-5 sm:p-6 shadow-[0_24px_72px_rgba(120,86,42,0.14)] backdrop-blur-xl',
        glassCardClass:
          'rounded-3xl border border-amber-950/10 bg-[rgba(255,255,255,0.54)] p-4 sm:p-5 shadow-[0_18px_48px_rgba(120,86,42,0.1)] backdrop-blur-xl space-y-4',
        nestedGlassClass: 'rounded-2xl border border-amber-950/10 bg-[rgba(255,252,248,0.6)]',
        inputClass:
          'rounded-2xl border border-amber-950/12 bg-[rgba(255,252,248,0.84)] px-4 py-3 text-slate-950 outline-none placeholder:text-amber-950/35 focus:border-amber-700/35 focus:bg-white/90',
        ghostButtonClass:
          'rounded-2xl border border-amber-950/12 bg-[rgba(255,252,248,0.78)] text-slate-900 transition-colors hover:bg-white/90',
        primaryButtonClass:
          'rounded-2xl bg-gradient-to-r from-amber-500/88 via-orange-300/88 to-rose-200/88 px-5 py-3 font-semibold text-white shadow-[0_10px_28px_rgba(245,158,11,0.22)] transition-opacity disabled:opacity-50',
        secondaryTextClass: 'text-amber-950/68',
        chipIdleClass: 'border-amber-950/10 bg-[rgba(255,252,248,0.7)] text-amber-950/70',
        chipActiveClass: 'border-orange-400/25 bg-orange-200/40 text-amber-950',
        headingClass: 'text-slate-950',
        accentClass: 'text-amber-700',
        iconClass: 'text-amber-700',
        destructiveClass: 'text-rose-600/80',
        searchIconClass: 'text-amber-900/45',
        proseClass: 'prose max-w-none text-sm text-slate-800',
        toggleCardClass:
          'w-full rounded-2xl border border-amber-950/10 bg-[rgba(255,252,248,0.72)] px-4 py-4 text-left',
        toggleCardHoverClass: 'hover:bg-white/88',
        toggleTitleClass: 'text-sm font-semibold text-slate-950',
        toggleDescriptionClass: 'mt-1 text-xs text-amber-950/68',
        toggleTrackOnClass: 'bg-orange-300/90',
        toggleTrackOffClass: 'bg-amber-950/14',
      }
    : {
        moduleShellClass:
          'space-y-6 rounded-[2rem] border border-white/12 bg-[rgba(255,255,255,0.08)] p-5 sm:p-6 shadow-[0_24px_72px_rgba(2,6,23,0.32)] backdrop-blur-xl',
        glassCardClass:
          'rounded-3xl border border-white/12 bg-[rgba(255,255,255,0.1)] p-4 sm:p-5 shadow-[0_18px_48px_rgba(2,6,23,0.2)] backdrop-blur-xl space-y-4',
        nestedGlassClass: 'rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.08)]',
        inputClass:
          'rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-300/45 focus:border-sky-200/45 focus:bg-white/12',
        ghostButtonClass:
          'rounded-2xl border border-white/12 bg-white/10 text-slate-100 transition-colors hover:bg-white/14',
        primaryButtonClass:
          'rounded-2xl bg-gradient-to-r from-amber-200/85 via-amber-100/85 to-sky-100/80 px-5 py-3 font-semibold text-slate-950 shadow-[0_10px_28px_rgba(173,194,255,0.18)] transition-opacity disabled:opacity-50',
        secondaryTextClass: 'text-slate-200/72',
        chipIdleClass: 'border-white/10 bg-[rgba(255,255,255,0.08)] text-slate-200/72',
        chipActiveClass: 'border-sky-200/25 bg-sky-200/14 text-sky-50',
        headingClass: 'text-white',
        accentClass: 'text-sky-50',
        iconClass: 'text-sky-100',
        destructiveClass: 'text-rose-200/80',
        searchIconClass: 'text-slate-300/70',
        proseClass: 'prose prose-invert max-w-none text-sm text-white',
        toggleCardClass:
          'w-full rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-4 text-left',
        toggleCardHoverClass: 'hover:bg-white/10',
        toggleTitleClass: 'text-sm font-semibold text-white',
        toggleDescriptionClass: 'mt-1 text-xs text-slate-200/72',
        toggleTrackOnClass: 'bg-sky-200/70',
        toggleTrackOffClass: 'bg-white/18',
      };

export const DreamJournalModule = ({
  user,
  confirmSensitiveActions = true,
  visualTheme = 'obsidian',
}: {
  user?: User | null;
  confirmSensitiveActions?: boolean;
  visualTheme?: 'obsidian' | 'dawn';
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const reminderTimeoutRef = useRef<number | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [store, setStore] = useState<DreamJournalStore>(defaultDreamJournalStore);
  const [entries, setEntries] = useState<DreamEntry[]>([]);
  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('');
  const [attachments, setAttachments] = useState<DreamAttachment[]>([]);
  const [themes, setThemes] = useState<DreamTheme[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [personalInterpretation, setPersonalInterpretation] = useState('');
  const [search, setSearch] = useState('');
  const [jumpDate, setJumpDate] = useState('');
  const [timelineTheme, setTimelineTheme] = useState<DreamTheme | 'all'>('all');
  const [voiceListening, setVoiceListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    moduleShellClass,
    glassCardClass,
    nestedGlassClass,
    inputClass,
    ghostButtonClass,
    primaryButtonClass,
    secondaryTextClass,
    chipIdleClass,
    chipActiveClass,
    headingClass,
    accentClass,
    iconClass,
    destructiveClass,
    searchIconClass,
    proseClass,
    toggleCardClass,
    toggleCardHoverClass,
    toggleTitleClass,
    toggleDescriptionClass,
    toggleTrackOnClass,
    toggleTrackOffClass,
  } = getModuleThemeClasses(visualTheme);

  useEffect(() => {
    const loaded = loadDreamJournalStore();
    setStore(loaded);
    setEntries(loaded.entries);
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    if (!store.reminder.enabled) {
      if (reminderTimeoutRef.current) {
        window.clearTimeout(reminderTimeoutRef.current);
      }
      return;
    }

    const [hours, minutes] = store.reminder.time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours || 7, minutes || 30, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }

    const delay = Math.max(1000, next.getTime() - Date.now());
    reminderTimeoutRef.current = window.setTimeout(() => {
      void triggerReminder();
    }, delay);

    return () => {
      if (reminderTimeoutRef.current) {
        window.clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, [store.reminder]);

  const filteredEntries = useMemo(() => filterDreamEntries(entries, { query: search, date: jumpDate, theme: timelineTheme }), [entries, search, jumpDate, timelineTheme]);

  const currentInsights = useMemo(() => analyzeDreamContent(getEditorPlainText(), tags), [tags, title, personalInterpretation]);

  function getEditorHtml() {
    return editorRef.current?.innerHTML?.trim() || '';
  }

  function getEditorPlainText() {
    return editorRef.current?.textContent?.trim() || '';
  }

  const syncStore = async (nextEntries: DreamEntry[], nextStore: DreamJournalStore) => {
    const result = persistDreamJournalStore({ ...nextStore, entries: nextEntries });
    if (!result.ok) throw new Error(result.error);
  };

  const persistStoreOnly = async (nextStore: DreamJournalStore) => {
    try {
      await syncStore(entries, nextStore);
      setStore(nextStore);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存设置失败';
      setStatus(message);
    }
  };

  const resetEditor = () => {
    setTitle('');
    setAttachments([]);
    setThemes([]);
    setTags([]);
    setTagDraft('');
    setPersonalInterpretation('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  };

  const getEditorRange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const liveRange = selection.getRangeAt(0);
      if (editorRef.current?.contains(liveRange.commonAncestorContainer)) {
        selectionRef.current = liveRange.cloneRange();
        return liveRange;
      }
    }

    return restoreSelection();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) {
      return selectionRef.current;
    }

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
    return selectionRef.current;
  };

  const applyInlineFormat = (tagName: 'strong' | 'em') => {
    editorRef.current?.focus();
    const range = getEditorRange();
    if (!range || range.collapsed) {
      setStatus('请先选中要格式化的文字。');
      return;
    }

    const wrapper = document.createElement(tagName);
    try {
      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer as Text;
        const text = textNode.data;
        const selectedText = text.slice(range.startOffset, range.endOffset);
        const before = text.slice(0, range.startOffset);
        const after = text.slice(range.endOffset);
        const fragment = document.createDocumentFragment();

        if (before) {
          fragment.appendChild(document.createTextNode(before));
        }

        wrapper.textContent = selectedText;
        fragment.appendChild(wrapper);

        if (after) {
          fragment.appendChild(document.createTextNode(after));
        }

        textNode.parentNode?.replaceChild(fragment, textNode);
      } else {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
      }
      range.selectNodeContents(wrapper);
      saveSelection();
      setStatus(tagName === 'strong' ? '已应用加粗。' : '已应用斜体。');
    } catch {
      setStatus('当前选区无法直接格式化，请重新选择连续文本后再试。');
    }
  };

  const applyUnorderedList = () => {
    editorRef.current?.focus();
    const range = getEditorRange();
    const selectedText = range?.toString().trim() || getEditorPlainText();
    if (!selectedText) {
      setStatus('请先输入或选中要转换为列表的内容。');
      return;
    }

    const items = selectedText
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!items.length) {
      setStatus('列表内容不能为空。');
      return;
    }

    const list = document.createElement('ul');
    list.className = 'list-disc pl-5 space-y-1';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });

    if (range && !range.collapsed) {
      range.deleteContents();
      range.insertNode(list);
      range.selectNodeContents(list);
      saveSelection();
    } else if (editorRef.current) {
      editorRef.current.appendChild(list);
    }

    setStatus('已转换为列表。');
  };

  const addTag = () => {
    const next = tagDraft.trim();
    if (!next || tags.includes(next)) return;
    setTags((prev) => [...prev, next].slice(0, 10));
    setTagDraft('');
  };

  const toggleTheme = (theme: DreamTheme) => {
    setThemes((prev) => (prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]));
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoading(true);
    setStatus('');
    try {
      const next = await Promise.all(Array.from(files).map((file) => fileToAttachment(file)));
      setAttachments((prev) => [...prev, ...next].slice(0, 6));
      setStatus('附件已加入当前梦境。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '附件上传失败';
      setStatus(message);
    }
    setLoading(false);
  };

  const startSpeech = async () => {
    if (!supportsSpeechRecognition()) {
      setStatus('当前浏览器不支持语音转文字。');
      return;
    }

    const SpeechRecognitionCtor =
      (window as typeof window & { SpeechRecognition?: any }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (editorRef.current && transcript) {
        editorRef.current.innerHTML = `${getEditorHtml()}<p>${transcript}</p>`;
      }
      setStatus('语音内容已加入编辑器。');
    };
    recognition.onerror = () => setStatus('语音识别失败，请重试。');
    recognition.onend = () => setVoiceListening(false);
    recognition.start();
  };

  const saveEntry = async () => {
    const html = getEditorHtml();
    if (!html.trim()) {
      setStatus('请先写下一段梦境内容。');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      const nextEntry = createDreamEntry({
        title,
        html,
        themes,
        tags,
        attachments,
        personalInterpretation,
      });
      const nextEntries = [nextEntry, ...entries];
      await syncStore(nextEntries, store);
      setEntries(nextEntries);
      resetEditor();
      setStatus('梦境记录已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存梦境失败';
      setStatus(message);
    }
    setLoading(false);
  };

  const removeEntry = async (id: string) => {
    if (confirmSensitiveActions && !window.confirm('确认删除这条梦境记录吗？')) {
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      const nextEntries = entries.filter((entry) => entry.id !== id);
      await syncStore(nextEntries, store);
      setEntries(nextEntries);
      setStatus('梦境记录已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败';
      setStatus(message);
    }
    setLoading(false);
  };

  const triggerReminder = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('晨间梦境提醒', {
          body: '醒来后，试着先记下今天最鲜明的一段梦境。',
        });
      }

      if (store.reminder.progressiveAlarm) {
        const context = new AudioContext();
        [0, 1, 2].forEach((step) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 440 + step * 80;
          gain.gain.value = 0.0001;
          oscillator.connect(gain);
          gain.connect(context.destination);
          const start = context.currentTime + step * 0.35;
          gain.gain.exponentialRampToValueAtTime(0.05 + step * 0.02, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
          oscillator.start(start);
          oscillator.stop(start + 0.3);
        });
      }

      if (store.reminder.guidanceVoice && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(reminderVoices[Math.floor(Math.random() * reminderVoices.length)]);
        utterance.lang = 'zh-CN';
        window.speechSynthesis.speak(utterance);
      }

      setStatus('晨间提醒已触发。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '提醒触发失败';
      setStatus(message);
    }
  };

  const updateReminder = (patch: Partial<DreamJournalStore['reminder']>) => {
    const nextStore = { ...store, reminder: { ...store.reminder, ...patch } };
    void persistStoreOnly(nextStore);
    setStatus('提醒设置已更新。');
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setStatus('当前设备不支持浏览器通知。');
      return;
    }

    const result = await Notification.requestPermission();
    setStatus(result === 'granted' ? '浏览器通知权限已开启。' : '通知权限未开启。');
  };

  const exportJson = async () => {
    try {
      downloadBlob(exportDreamJournalJson(entries), `dream-journal-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus('JSON 备份已导出。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JSON 导出失败';
      setStatus(message);
    }
  };

  const exportPdf = async () => {
    try {
      const blob = await exportDreamJournalPdf(entries);
      downloadBlob(blob, `dream-journal-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setStatus('PDF 报告已导出。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF 导出失败';
      setStatus(message);
    }
  };

  const activeInsights = useMemo(() => analyzeDreamContent(getEditorPlainText(), tags), [tags, title, personalInterpretation, attachments.length]);

  return (
    <section className={moduleShellClass}>
      <div className="space-y-1">
        <h3 className={`font-headline text-xl sm:text-2xl ${headingClass}`}>晨间梦境记录</h3>
        <p className={`text-sm ${secondaryTextClass}`}>支持富文本、语音记录、附件、解析、时间轴、导出与晨间提醒。</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
        <div className="space-y-5">
          <div className={glassCardClass}>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="梦境标题，例如：在雾海上飞行"
                className={`flex-1 min-w-[220px] ${inputClass}`}
              />
              <div className="flex flex-wrap gap-2">
                <ToolbarButton icon={Wand2} label="加粗" onClick={applyInlineFormat.bind(null, 'strong')} activeClassName={chipActiveClass} idleClassName={chipIdleClass} />
                <ToolbarButton icon={Sparkles} label="斜体" onClick={applyInlineFormat.bind(null, 'em')} activeClassName={chipActiveClass} idleClassName={chipIdleClass} />
                <ToolbarButton icon={Tags} label="列表" onClick={applyUnorderedList} activeClassName={chipActiveClass} idleClassName={chipIdleClass} />
                <ToolbarButton icon={Mic} label={voiceListening ? '录音中' : '语音转文字'} onClick={startSpeech} active={voiceListening} activeClassName={chipActiveClass} idleClassName={chipIdleClass} />
              </div>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={`min-h-[180px] px-4 py-4 leading-7 ${inputClass}`}
              data-testid="dream-editor"
              onMouseUp={saveSelection}
              onTouchEnd={saveSelection}
              onKeyUp={saveSelection}
              onInput={saveSelection}
            />

            <div className="flex flex-wrap gap-2">
              {dreamThemeOptions.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => toggleTheme(theme.id)}
                  className={`px-4 py-2 rounded-full border text-xs font-label uppercase tracking-[0.25em] ${
                    themes.includes(theme.id) ? chipActiveClass : chipIdleClass
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入自定义标签后回车，例如：飞行、海浪、祖母"
                className={inputClass}
              />
              <button onClick={addTag} className={primaryButtonClass}>
                添加标签
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag} onClick={() => setTags((prev) => prev.filter((item) => item !== tag))} className={`px-3 py-2 rounded-full border text-xs ${chipIdleClass}`}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex cursor-pointer items-center gap-3 border border-dashed px-4 py-4 ${ghostButtonClass}`}>
                <ImagePlus size={18} className={iconClass} />
                <span className={`text-sm ${headingClass}`}>上传图片/视频附件</span>
                <input hidden type="file" accept="image/*,video/*" multiple onChange={(e) => void handleAttachmentUpload(e.target.files)} />
              </label>
              <button onClick={requestNotificationPermission} className={`flex items-center gap-3 px-4 py-4 text-sm ${ghostButtonClass}`}>
                <Bell size={18} className={iconClass} />
                开启浏览器提醒权限
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className={`${nestedGlassClass} overflow-hidden`}>
                    {attachment.kind === 'image' ? (
                      <img src={attachment.dataUrl} alt={attachment.name} className="w-full h-28 object-cover" />
                    ) : (
                      <video src={attachment.dataUrl} className="w-full h-28 object-cover" muted />
                    )}
                    <div className="p-3 space-y-2">
                      <p className={`text-xs truncate ${headingClass}`}>{attachment.name}</p>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                        className={`text-[10px] uppercase tracking-widest ${destructiveClass}`}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={personalInterpretation}
              onChange={(e) => setPersonalInterpretation(e.target.value)}
              rows={4}
              placeholder="补充你的个人解读：这段梦境与你最近的压力、关系或期待有什么联系？"
              className={`w-full resize-none ${inputClass}`}
            />

            <div className="flex flex-wrap gap-3 justify-between items-center">
              <p className={`text-xs ${secondaryTextClass}`}>本地优先保存，记录、提醒与导出操作都会即时同步到当前设备。</p>
              <button disabled={loading} onClick={saveEntry} className={primaryButtonClass}>
                保存梦境
              </button>
            </div>
          </div>

          <div className={glassCardClass}>
            <div className="flex items-center gap-3">
              <Wand2 size={18} className={iconClass} />
              <h4 className={`font-headline text-lg ${headingClass}`}>梦境解析引擎</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeInsights.map((insight) => (
                <div key={`${insight.keyword}-${insight.meaning}`} className={`${nestedGlassClass} p-4`}>
                  <p className={`text-sm font-semibold ${accentClass}`}>{insight.keyword}</p>
                  <p className={`mt-2 text-xs leading-6 ${secondaryTextClass}`}>{insight.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={glassCardClass}>
            <div className="flex items-center gap-3">
              <Bell size={18} className={iconClass} />
              <h4 className={`font-headline text-lg ${headingClass}`}>晨间提醒</h4>
            </div>
            <div className="space-y-3">
              <ToggleCard
                label="每日晨间提醒"
                description="在设定时间触发浏览器提醒与回忆引导。"
                checked={store.reminder.enabled}
                onChange={(value) => updateReminder({ enabled: value })}
                cardClassName={toggleCardClass}
                hoverClassName={toggleCardHoverClass}
                titleClassName={toggleTitleClass}
                descriptionClassName={toggleDescriptionClass}
                trackOnClassName={toggleTrackOnClass}
                trackOffClassName={toggleTrackOffClass}
              />
              <label className="block space-y-2">
                <span className={`text-xs ${secondaryTextClass}`}>提醒时间</span>
                <input type="time" value={store.reminder.time} onChange={(e) => updateReminder({ time: e.target.value })} className={`w-full ${inputClass}`} />
              </label>
              <ToggleCard
                label="渐进式闹钟"
                description="从轻到强逐步播放短促提示音。"
                checked={store.reminder.progressiveAlarm}
                onChange={(value) => updateReminder({ progressiveAlarm: value })}
                cardClassName={toggleCardClass}
                hoverClassName={toggleCardHoverClass}
                titleClassName={toggleTitleClass}
                descriptionClassName={toggleDescriptionClass}
                trackOnClassName={toggleTrackOnClass}
                trackOffClassName={toggleTrackOffClass}
              />
              <ToggleCard
                label="梦境回忆引导语音"
                description="使用浏览器语音合成提醒你记录片段。"
                checked={store.reminder.guidanceVoice}
                onChange={(value) => updateReminder({ guidanceVoice: value })}
                cardClassName={toggleCardClass}
                hoverClassName={toggleCardHoverClass}
                titleClassName={toggleTitleClass}
                descriptionClassName={toggleDescriptionClass}
                trackOnClassName={toggleTrackOnClass}
                trackOffClassName={toggleTrackOffClass}
              />
              <button onClick={() => void triggerReminder()} className={`w-full ${primaryButtonClass}`}>
                立即测试提醒
              </button>
            </div>
          </div>

          <div className={glassCardClass}>
            <div className="flex items-center gap-3">
              <Download size={18} className={iconClass} />
              <h4 className={`font-headline text-lg ${headingClass}`}>导出与备份</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => void exportJson()} className={`flex items-center justify-center gap-2 px-4 py-4 ${ghostButtonClass}`}>
                <FileText size={16} /> 导出 JSON 备份
              </button>
              <button onClick={() => void exportPdf()} className={`flex items-center justify-center gap-2 px-4 py-4 ${ghostButtonClass}`}>
                <Download size={16} /> 生成 PDF 报告
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={glassCardClass}>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h4 className={`font-headline text-lg ${headingClass}`}>梦境时间轴</h4>
            <p className={`text-sm ${secondaryTextClass}`}>按日期倒序查看全部记录，支持搜索、日期跳转和主题筛选。</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <label className="relative flex-1 lg:w-64">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${searchIconClass}`} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题、正文、标签、个人解析" className={`w-full pl-10 pr-4 ${inputClass}`} />
            </label>
            <input type="date" value={jumpDate} onChange={(e) => setJumpDate(e.target.value)} className={inputClass} />
            <select value={timelineTheme} onChange={(e) => setTimelineTheme(e.target.value as DreamTheme | 'all')} className={inputClass}>
              <option value="all">全部主题</option>
              {dreamThemeOptions.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredEntries.length ? (
            filteredEntries.map((entry) => (
              <article key={entry.id} className={`${glassCardClass} p-4 sm:p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h5 className={`font-headline text-lg ${headingClass}`}>{entry.title}</h5>
                    <p className={`mt-1 text-xs ${secondaryTextClass}`}>{new Date(entry.recordedAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <button onClick={() => void removeEntry(entry.id)} className={`text-[10px] uppercase tracking-widest sm:self-start ${destructiveClass}`}>
                    删除
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.themes.map((theme) => (
                    <span key={theme} className={`rounded-full border px-3 py-2 text-xs ${chipActiveClass}`}>
                      {dreamThemeOptions.find((item) => item.id === theme)?.label ?? theme}
                    </span>
                  ))}
                  {entry.tags.map((tag) => (
                    <span key={tag} className={`rounded-full border px-3 py-2 text-xs ${chipIdleClass}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className={proseClass} dangerouslySetInnerHTML={{ __html: entry.html }} />
                {(entry.personalInterpretation || entry.autoInsights.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className={`${nestedGlassClass} px-4 py-4`}>
                      <p className={`text-xs uppercase tracking-[0.25em] ${iconClass}`}>自动解析</p>
                      <ul className={`mt-3 space-y-2 text-sm ${secondaryTextClass}`}>
                        {entry.autoInsights.map((insight) => (
                          <li key={`${entry.id}-${insight.keyword}`}>{insight.keyword}：{insight.meaning}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={`${nestedGlassClass} px-4 py-4`}>
                      <p className={`text-xs uppercase tracking-[0.25em] ${iconClass}`}>个人解析</p>
                      <p className={`mt-3 text-sm ${secondaryTextClass}`}>{entry.personalInterpretation || '尚未补充个人解读。'}</p>
                    </div>
                  </div>
                )}
                {entry.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {entry.attachments.map((attachment) => (
                      <div key={attachment.id} className={`${nestedGlassClass} overflow-hidden`}>
                        {attachment.kind === 'image' ? (
                          <img src={attachment.dataUrl} alt={attachment.name} className="w-full h-24 object-cover" />
                        ) : (
                          <video src={attachment.dataUrl} className="w-full h-24 object-cover" controls muted />
                        )}
                        <div className={`truncate p-2 text-[11px] ${secondaryTextClass}`}>{attachment.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <p className={`text-sm ${secondaryTextClass}`}>还没有符合条件的梦境记录，试着记录今天的第一条梦境片段。</p>
          )}
        </div>
      </div>

      {!user && <p className={`text-xs ${secondaryTextClass}`}>当前模块为本地优先模式，未登录也可使用；登录后也不会把加密内容明文上传。</p>}
      {status && <p className={`text-xs ${secondaryTextClass}`}>{status}</p>}
    </section>
  );
};

const ToolbarButton = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  activeClassName,
  idleClassName,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClassName: string;
  idleClassName: string;
}) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${active ? activeClassName : idleClassName}`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const ToggleCard = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  cardClassName,
  hoverClassName,
  titleClassName,
  descriptionClassName,
  trackOnClassName,
  trackOffClassName,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  cardClassName: string;
  hoverClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  trackOnClassName: string;
  trackOffClassName: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={`${cardClassName} ${disabled ? 'cursor-default opacity-70' : hoverClassName}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={titleClassName}>{label}</p>
        <p className={descriptionClassName}>{description}</p>
      </div>
      <span className={`inline-flex h-6 w-11 rounded-full transition-colors ${checked ? trackOnClassName : trackOffClassName}`}>
        <span className={`h-5 w-5 rounded-full bg-white mt-0.5 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </div>
  </button>
);
