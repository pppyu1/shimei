import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Trash2, ClipboardList, Shield } from 'lucide-react';
import { isAdmin } from '../../lib/admin';
import { trackEvent } from '../../lib/telemetry';

const readLocalArray = (key: string) => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const eventStorageKey = 'shimei:telemetry-events';
const errorStorageKey = 'shimei:telemetry-errors';

export const AdminView: React.FC<{ user: User | null }> = ({ user }) => {
  const admin = useMemo(() => isAdmin(user?.email ?? null), [user]);
  const [events, setEvents] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      setEvents(readLocalArray(eventStorageKey));
      setErrors(readLocalArray(errorStorageKey));
    };
    sync();
    const t = window.setInterval(sync, 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!admin) {
    return (
      <div className="pt-24 px-6 max-w-4xl mx-auto pb-32">
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 flex items-center gap-4">
          <Shield className="text-secondary" />
          <div>
            <h3 className="font-headline text-xl text-on-surface">无权限</h3>
            <p className="text-sm text-on-surface-variant">该页面仅对管理员邮箱开放。请联系维护者将你的邮箱加入白名单。</p>
          </div>
        </div>
      </div>
    );
  }

  const clearLocal = async () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(eventStorageKey);
        window.localStorage.removeItem(errorStorageKey);
        window.localStorage.removeItem('shimei:last-player-state');
        window.localStorage.removeItem('shimei:offline-content-ids');
      }
      setStatus('本地事件、错误与播放器缓存已清空');
      trackEvent('admin_clear_local');
    } catch (e) {
      setStatus('清理失败');
    }
  };

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-32 space-y-8">
      <div className="space-y-1">
        <h2 className="font-headline text-3xl text-on-surface">管理后台</h2>
        <p className="text-sm text-on-surface-variant">仅管理员邮箱可访问。可查看本地事件与错误、清理本地缓存。</p>
        {status && <p className="text-xs text-primary">{status}</p>}
      </div>

      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-xl text-on-surface flex items-center gap-2"><ClipboardList size={18} /> 本地事件</h3>
          <button onClick={clearLocal} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <Trash2 size={16} /> 清空本地缓存
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto pr-2">
          {events.length ? events.slice().reverse().map((e, idx) => (
            <div key={idx} className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span className="text-primary font-mono">{e.name}</span>
                <span>{e.at}</span>
              </div>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(e.payload ?? {}, null, 2)}</pre>
            </div>
          )) : <p className="text-sm text-on-surface-variant">暂无事件</p>}
        </div>
      </section>

      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-3">
        <h3 className="font-headline text-xl text-on-surface">本地错误</h3>
        <div className="space-y-2 max-h-72 overflow-auto pr-2">
          {errors.length ? errors.slice().reverse().map((e, idx) => (
            <div key={idx} className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span className="text-primary font-mono">{e.source}</span>
                <span>{e.at}</span>
              </div>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(e, null, 2)}</pre>
            </div>
          )) : <p className="text-sm text-on-surface-variant">暂无错误</p>}
        </div>
      </section>
    </div>
  );
};
