import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Award, Bell, ChevronRight, Flower2, Heart, History, LayoutGrid, LockKeyhole, LogOut, Settings, Shield, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { featuredJourneys } from '../home/data';
import { formatTime } from '../player/model';
import type { PlayerContent } from '../shared/types';
import { addFavorite, fetchDreamJournals, fetchFavorites, fetchPlayHistory, removeFavorite, syncPlayHistory } from '../../lib/api';
import { isSupabaseBrowserConfigured, isSupabaseDevProxyEnabled, supabase } from '../../lib/supabase';
import { tryExplainFetchFailure } from '../../lib/supabaseErrors';
import { pingSupabaseAuthHealth } from '../../lib/supabaseReachability';
import { isAdmin } from '../../lib/admin';
import type { AppPreferences, AppTheme } from '../../lib/preferences';

function friendlySupabaseMessage(message: string): string {
  return tryExplainFetchFailure(message) ?? message;
}

function formatOtpSendError(message: string): string {
  const net = tryExplainFetchFailure(message);
  if (net) return net;
  const lower = message.toLowerCase();
  if (
    lower.includes('redirect') ||
    lower.includes('not allowed') ||
    (lower.includes('invalid') && (lower.includes('request') || lower.includes('url')))
  ) {
    return `${message} 请在 Supabase「Authentication → URL Configuration」的 Redirect URLs 中加入当前访问地址（如 http://localhost:3000），或设置 .env 中的 VITE_AUTH_REDIRECT_URL 为已登记的地址。`;
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('email rate')) {
    return `${message} 发送过于频繁，请稍后再试。`;
  }
  if (lower.includes('signups not allowed')) {
    return `${message} 请在 Supabase 控制台检查是否允许邮箱注册。`;
  }
  return message;
}

export const MeView = ({
  user,
  currentContent,
  onOpenContent,
  preferences,
  preferencesStatus,
  onThemeChange,
  onCompactModeChange,
  onReduceMotionChange,
  onNotificationToggle,
  onSecurityToggle,
}: {
  user: User | null;
  currentContent: PlayerContent;
  onOpenContent: (content: PlayerContent) => void;
  preferences: AppPreferences;
  preferencesStatus: string;
  onThemeChange: (theme: AppTheme) => void;
  onCompactModeChange: (value: boolean) => void;
  onReduceMotionChange: (value: boolean) => void;
  onNotificationToggle: (key: keyof AppPreferences['notifications'], value: boolean) => void;
  onSecurityToggle: (key: keyof AppPreferences['security'], value: boolean) => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'otp' | 'login' | 'signup' | 'reset'>('otp');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [favorites, setFavorites] = useState<{ content_id: string; content_type: string; created_at: string }[]>([]);
  const [historyItems, setHistoryItems] = useState<{ content_id: string; progress_seconds: number; played_at: string }[]>([]);
  const [dreamEntries, setDreamEntries] = useState<{ id: string; mood: string | null; content: string | null; recorded_at: string }[]>([]);
  const admin = useMemo(() => isAdmin(user?.email ?? null), [user]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  const contentLookup = useMemo(() => new Map(featuredJourneys.map((content) => [content.id, content])), []);
  const isCurrentFavorite = favorites.some((item) => item.content_id === currentContent.id);

  const stats = [
    { label: '冥想时长', value: '1,240', unit: '分钟', icon: Flower2 },
    { label: '连续天数', value: '14', unit: '天', icon: Award },
    { label: '收藏内容', value: String(favorites.length), unit: '项', icon: Heart },
  ];

  useEffect(() => {
    const hydrateMe = async () => {
      if (!user) {
        setDisplayName('');
        setFavorites([]);
        setHistoryItems([]);
        setDreamEntries([]);
        return;
      }

      const { data, error } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
      if (!error && data?.display_name) setDisplayName(data.display_name);

      try {
        const [favoriteRows, historyRows, dreamRows] = await Promise.all([fetchFavorites(user.id), fetchPlayHistory(user.id), fetchDreamJournals(user.id)]);
        setFavorites(favoriteRows);
        setHistoryItems(historyRows);
        setDreamEntries(dreamRows);
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取收藏与历史失败';
        setStatus(`同步失败：${friendlySupabaseMessage(message)}`);
      }
    };

    void hydrateMe();
  }, [user]);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const sendOtp = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('请输入有效的邮箱地址');
      return;
    }
    if (!isSupabaseBrowserConfigured) {
      setStatus('未配置 Supabase（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY），无法发送登录链接。');
      return;
    }
    if (resendSeconds) return;
    setLoading(true);
    setStatus('');
    const fromEnv = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
    const redirectTo = fromEnv || (typeof window !== 'undefined' ? window.location.origin : undefined);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    setStatus(error ? `发送失败：${formatOtpSendError(error.message)}` : '登录链接已发送到邮箱，请查收。');
    if (!error) setResendSeconds(60);
  };

  const testSupabaseReachability = async () => {
    if (!isSupabaseBrowserConfigured) {
      setStatus('未配置 Supabase，无法测试连接。请在 .env.local 设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。');
      return;
    }
    setPingLoading(true);
    setStatus('');
    const url = isSupabaseDevProxyEnabled()
      ? `${window.location.origin}/supabase-proxy`
      : (import.meta.env.VITE_SUPABASE_URL?.trim() ?? '');
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
    const { userMessage } = await pingSupabaseAuthHealth(url, key);
    setPingLoading(false);
    setStatus(
      isSupabaseDevProxyEnabled() && userMessage.startsWith('连接失败')
        ? `${userMessage}（当前经 localhost 代理访问上游项目）`
        : userMessage,
    );
  };

  const canUsePasswordAuth = typeof (supabase as any)?.auth?.signUp === 'function' && typeof (supabase as any)?.auth?.signInWithPassword === 'function';

  const signUp = async () => {
    if (!canUsePasswordAuth) {
      setStatus('未配置 Supabase，无法使用邮箱密码注册。');
      return;
    }
    if (!email || password.length < 6) {
      setStatus('请输入有效邮箱，密码至少 6 位。');
      return;
    }
    setLoading(true);
    setStatus('');
    const { error } = await (supabase as any).auth.signUp({ email, password });
    setLoading(false);
    setStatus(error ? `注册失败：${friendlySupabaseMessage(error.message)}` : '注册成功，请查收邮箱进行验证。');
  };

  const signIn = async () => {
    if (!canUsePasswordAuth) {
      setStatus('未配置 Supabase，无法使用邮箱密码登录。');
      return;
    }
    if (!email || !password) {
      setStatus('请输入邮箱与密码。');
      return;
    }
    setLoading(true);
    setStatus('');
    const { error } = await (supabase as any).auth.signInWithPassword({ email, password });
    setLoading(false);
    setStatus(error ? `登录失败：${friendlySupabaseMessage(error.message)}` : '登录成功。');
  };

  const resetPassword = async () => {
    if (typeof (supabase as any)?.auth?.resetPasswordForEmail !== 'function') {
      setStatus('未配置 Supabase，无法发送重置链接。');
      return;
    }
    if (!email) {
      setStatus('请输入邮箱地址。');
      return;
    }
    setLoading(true);
    setStatus('');
    const redirectTo = (import.meta.env.APP_URL as string | undefined) ?? window.location.origin;
    const { error } = await (supabase as any).auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    setStatus(error ? `发送失败：${friendlySupabaseMessage(error.message)}` : '已发送密码重置邮件，请查收。');
  };

  const updatePassword = async () => {
    if (!user) return;
    if (newPassword.length < 6) {
      setStatus('密码至少 6 位。');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('两次输入的密码不一致。');
      return;
    }
    if (typeof (supabase as any)?.auth?.updateUser !== 'function') {
      setStatus('未配置 Supabase，无法修改密码。');
      return;
    }
    setLoading(true);
    setStatus('');
    const { error } = await (supabase as any).auth.updateUser({ password: newPassword });
    setLoading(false);
    setStatus(error ? `修改失败：${friendlySupabaseMessage(error.message)}` : '密码已更新。');
    if (!error) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const signOut = async () => {
    if (preferences.security.confirmSensitiveActions && typeof window !== 'undefined' && !window.confirm('确认退出当前账号吗？')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    setStatus(error ? `退出失败：${friendlySupabaseMessage(error.message)}` : '已退出登录。');
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName.trim() || null });
    setLoading(false);
    setStatus(error ? `保存失败：${friendlySupabaseMessage(error.message)}` : '昵称已保存。');
  };

  const toggleFavorite = async () => {
    if (!user) return;
    setLoading(true);
    setStatus('');
    try {
      if (isCurrentFavorite) {
        await removeFavorite(user.id, currentContent.id);
        setFavorites((prev) => prev.filter((item) => item.content_id !== currentContent.id));
        setStatus('已从收藏中移除当前内容。');
      } else {
        await addFavorite(user.id, currentContent.id, currentContent.category);
        const nextFavorites = await fetchFavorites(user.id);
        setFavorites(nextFavorites);
        setStatus('已收藏当前播放内容。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '收藏更新失败';
      setStatus(`收藏更新失败：${friendlySupabaseMessage(message)}`);
    }
    setLoading(false);
  };

  const saveCurrentHistory = async () => {
    if (!user) return;
    setLoading(true);
    setStatus('');
    try {
      await syncPlayHistory(currentContent.id, 120);
      const nextHistory = await fetchPlayHistory(user.id);
      setHistoryItems(nextHistory);
      setStatus('已记录一条当前内容的试听历史。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '历史写入失败';
      setStatus(`历史写入失败：${friendlySupabaseMessage(message)}`);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-24 px-6 max-w-4xl mx-auto pb-32 space-y-12">
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="space-y-1">
          <h2 className="font-headline text-3xl text-on-surface">{displayName || 'Elena Gilbert'}</h2>
          <p className="font-label text-xs tracking-widest text-primary uppercase">高级探索者</p>
        </div>
      </section>

      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-4">
        <h3 className="font-headline text-xl text-on-surface">账号与数据同步（Supabase）</h3>
        {!user ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setAuthMode('otp')} className={`px-3 py-2 rounded-lg border text-xs ${authMode==='otp'?'border-primary/30 bg-primary/10 text-primary':'border-outline-variant/20 text-on-surface-variant'}`}>邮箱 OTP</button>
              <button onClick={() => setAuthMode('login')} className={`px-3 py-2 rounded-lg border text-xs ${authMode==='login'?'border-primary/30 bg-primary/10 text-primary':'border-outline-variant/20 text-on-surface-variant'}`}>密码登录</button>
              <button onClick={() => setAuthMode('signup')} className={`px-3 py-2 rounded-lg border text-xs ${authMode==='signup'?'border-primary/30 bg-primary/10 text-primary':'border-outline-variant/20 text-on-surface-variant'}`}>注册</button>
              <button onClick={() => setAuthMode('reset')} className={`px-3 py-2 rounded-lg border text-xs ${authMode==='reset'?'border-primary/30 bg-primary/10 text-primary':'border-outline-variant/20 text-on-surface-variant'}`}>重置密码</button>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface outline-none border border-outline-variant/20"
            />
            {(authMode === 'login' || authMode === 'signup') && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface outline-none border border-outline-variant/20"
              />
            )}

            {authMode === 'otp' && (
              <div className="flex flex-col gap-2">
                <button
                  disabled={loading || !email || resendSeconds > 0}
                  onClick={sendOtp}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50"
                >
                  {resendSeconds > 0 ? `稍后可重发（${resendSeconds}s）` : '发送 OTP 登录链接'}
                </button>
                {isSupabaseBrowserConfigured && (
                  <button
                    type="button"
                    disabled={pingLoading}
                    onClick={testSupabaseReachability}
                    className="px-3 py-2 rounded-lg border border-outline-variant/30 text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                  >
                    {pingLoading ? '正在测试连接…' : '测试与 Supabase 的连接（不发邮件）'}
                  </button>
                )}
              </div>
            )}
            {authMode === 'login' && (
              <button
                disabled={loading || !email || !password}
                onClick={signIn}
                className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50"
              >
                登录
              </button>
            )}
            {authMode === 'signup' && (
              <button
                disabled={loading || !email || password.length < 6}
                onClick={signUp}
                className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50"
              >
                注册
              </button>
            )}
            {authMode === 'reset' && (
              <button
                disabled={loading || !email}
                onClick={resetPassword}
                className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50"
              >
                发送密码重置邮件
              </button>
            )}
            {!isSupabaseBrowserConfigured ? (
              <p className="text-xs text-on-surface-variant">
                未配置 Supabase（缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY），密码登录不可用；配置后请重启 dev 服务器。
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant">
                已配置 Supabase{isSupabaseDevProxyEnabled() ? '（本地开发代理已开启）' : ''}。若发送失败，先点「测试与 Supabase 的连接」。
              </p>
            )}
          </div>
        ) : (
            <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">当前登录：{user.email}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="设置昵称"
                className="flex-1 px-4 py-3 rounded-xl bg-surface-container-high text-on-surface outline-none border border-outline-variant/20"
              />
              <button disabled={loading} onClick={saveProfile} className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50">
                保存
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/20 text-sm"
                disabled={loading}
              >
                修改密码
              </button>
              <button disabled={loading} onClick={toggleFavorite} className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/20 text-sm">
                {isCurrentFavorite ? '取消收藏当前内容' : '收藏当前内容'}
              </button>
              <button disabled={loading} onClick={saveCurrentHistory} className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/20 text-sm">
                记录当前试听历史
              </button>
              <button disabled={loading} onClick={signOut} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                退出登录
              </button>
              {admin && (
                <a href="#/admin" className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm flex items-center gap-2">
                  <Shield size={14} /> 管理后台
                </a>
              )}
            </div>
            {showChangePassword && (
              <div className="mt-3 rounded-2xl border border-outline-variant/20 bg-surface-container-high p-4 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新密码（至少 6 位）"
                    className="px-4 py-3 rounded-xl bg-surface-container-high text-on-surface outline-none border border-outline-variant/20"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="px-4 py-3 rounded-xl bg-surface-container-high text-on-surface outline-none border border-outline-variant/20"
                  />
                  <button
                    disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                    onClick={updatePassword}
                    className="px-4 py-3 rounded-xl bg-primary text-primary-container font-semibold disabled:opacity-50"
                  >
                    保存密码
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {status && <p className="text-xs text-on-surface-variant max-w-md mx-auto break-words leading-relaxed">{status}</p>}
      </section>

      <section className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10 flex flex-col items-center space-y-2">
            <stat.icon size={16} className="text-primary/60" />
            <div className="text-center">
              <span className="block text-xl font-light text-on-surface">{stat.value}</span>
              <span className="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest">{stat.unit}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollectionPanel
          title="我的收藏"
          emptyText="先收藏一段你想反复回访的夜间旅程。"
          items={favorites.map((item) => ({
            id: item.content_id,
            meta: contentLookup.get(item.content_id),
            detail: '已加入收藏',
          }))}
          onOpenContent={onOpenContent}
        />
        <CollectionPanel
          title="最近播放"
          emptyText="开始一次播放后，这里会自动记录你的最近收听进度。"
          items={historyItems.map((item) => ({
            id: `${item.content_id}-${item.played_at}`,
            meta: contentLookup.get(item.content_id),
            detail: `上次停在 ${formatTime(item.progress_seconds)}`,
          }))}
          onOpenContent={onOpenContent}
        />
      </section>

      

      <section className="space-y-4">
        <h3 className="font-headline text-xl text-on-surface px-2">设置与偏好</h3>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PreferenceCard title="主题与显示" description="切换主题、布局密度与动效强度，保存后全局立即生效。">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                ['obsidian', '曜夜'],
                ['dawn', '晨曦'],
                ['system', '跟随系统'],
              ] as [AppTheme, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={`rounded-xl px-4 py-3 border text-sm transition-colors ${
                    preferences.theme === value ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-variant/20 bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <PreferenceToggle
              icon={LayoutGrid}
              label="紧凑布局"
              description="在小屏幕下展示更高的信息密度。"
              checked={preferences.compactMode}
              onChange={onCompactModeChange}
            />
            <PreferenceToggle
              icon={Sparkles}
              label="减少动态效果"
              description="降低动画强度，提升低性能设备与敏感用户体验。"
              checked={preferences.reduceMotion}
              onChange={onReduceMotionChange}
            />
          </PreferenceCard>

          <PreferenceCard title="通知设置" description="统一管理夜间提醒、周报与邮件通知。">
            <PreferenceToggle
              icon={Bell}
              label="睡前提醒"
              description="晚间固定时段提醒你开始放松。"
              checked={preferences.notifications.bedtimeReminder}
              onChange={(value) => onNotificationToggle('bedtimeReminder', value)}
            />
            <PreferenceToggle
              icon={History}
              label="每周睡眠回顾"
              description="每周汇总播放、练习与晨间记录趋势。"
              checked={preferences.notifications.weeklyDigest}
              onChange={(value) => onNotificationToggle('weeklyDigest', value)}
            />
            <PreferenceToggle
              icon={Settings}
              label="功能更新通知"
              description="新功能、新内容上线时发送提醒。"
              checked={preferences.notifications.productUpdates}
              onChange={(value) => onNotificationToggle('productUpdates', value)}
            />
            <PreferenceToggle
              icon={Bell}
              label="邮件提醒"
              description="允许通过邮件接收登录与摘要提醒。"
              checked={preferences.notifications.emailAlerts}
              onChange={(value) => onNotificationToggle('emailAlerts', value)}
            />
          </PreferenceCard>

          <PreferenceCard title="账号安全" description="控制会话记忆、敏感操作确认与安全提醒。">
            <PreferenceToggle
              icon={LockKeyhole}
              label="记住登录状态"
              description="减少重复登录，但仅建议在个人设备开启。"
              checked={preferences.security.rememberSession}
              onChange={(value) => onSecurityToggle('rememberSession', value)}
            />
            <PreferenceToggle
              icon={Shield}
              label="敏感操作二次确认"
              description="退出登录、删除类操作前进行再次确认。"
              checked={preferences.security.confirmSensitiveActions}
              onChange={(value) => onSecurityToggle('confirmSensitiveActions', value)}
            />
            <PreferenceToggle
              icon={Shield}
              label="生物识别提示"
              description="为后续接入指纹或人脸保护预留偏好。"
              checked={preferences.security.biometricLock}
              onChange={(value) => onSecurityToggle('biometricLock', value)}
            />
            <div className="rounded-xl bg-surface-container-high px-4 py-3 border border-outline-variant/10">
              <p className="text-sm text-on-surface">最近播放 {historyItems.length} 条</p>
              <p className="text-xs text-on-surface-variant mt-1">当前内容：{currentContent.title}，晨间记录 {dreamEntries.length} 条。</p>
            </div>
          </PreferenceCard>
        </div>
        {preferencesStatus && <p className="px-2 text-xs text-on-surface-variant">{preferencesStatus}</p>}
      </section>
    </motion.div>
  );
};

const PreferenceCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 space-y-4">
    <div className="space-y-1">
      <h4 className="font-headline text-lg text-on-surface">{title}</h4>
      <p className="text-sm text-on-surface-variant">{description}</p>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const PreferenceToggle = ({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className="w-full rounded-2xl bg-surface-container-high px-4 py-4 border border-outline-variant/10 hover:bg-surface-container-highest transition-colors text-left"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Icon size={18} className={checked ? 'text-primary' : 'text-secondary'} />
        <div>
          <p className="text-sm font-semibold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant mt-1">{description}</p>
        </div>
      </div>
      <span className={`inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary/80' : 'bg-outline-variant/50'}`}>
        <span className={`h-5 w-5 rounded-full bg-white mt-0.5 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </div>
  </button>
);

const CollectionPanel = ({
  title,
  emptyText,
  items,
  onOpenContent,
}: {
  title: string;
  emptyText: string;
  items: { id: string; meta: PlayerContent | undefined; detail: string }[];
  onOpenContent: (content: PlayerContent) => void;
}) => (
  <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-headline text-xl text-on-surface">{title}</h3>
      <span className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">{items.length} 条</span>
    </div>
    {items.length ? (
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => item.meta && onOpenContent(item.meta)}
            className="w-full flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-4 text-left hover:bg-surface-container-highest transition-colors"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-on-surface">{item.meta?.title ?? item.id}</p>
              <p className="text-xs text-on-surface-variant">{item.detail}</p>
            </div>
            <ChevronRight size={16} className="text-on-surface-variant/60" />
          </button>
        ))}
      </div>
    ) : (
      <p className="text-sm text-on-surface-variant">{emptyText}</p>
    )}
  </div>
);
