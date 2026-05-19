import { supabase } from './supabase';

export interface FavoriteRecord {
  content_id: string;
  content_type: string;
  created_at: string;
}

export interface PlayHistoryRecord {
  content_id: string;
  progress_seconds: number;
  played_at: string;
}

export interface DreamJournalRecord {
  id: string;
  mood: string | null;
  content: string | null;
  recorded_at: string;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: { display_name?: string; avatar_url?: string }) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function syncPlayHistory(contentId: string, progressSeconds: number) {
  const { data, error } = await supabase.functions.invoke('sync-play-history', {
    body: { content_id: contentId, progress_seconds: progressSeconds },
  });
  if (error) throw error;
  return data;
}

export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('content_id, content_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FavoriteRecord[];
}

export async function addFavorite(userId: string, contentId: string, contentType: string) {
  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    content_id: contentId,
    content_type: contentType,
  });
  if (error) throw error;
}

export async function removeFavorite(userId: string, contentId: string) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('content_id', contentId);
  if (error) throw error;
}

export async function fetchPlayHistory(userId: string) {
  const { data, error } = await supabase
    .from('play_history')
    .select('content_id, progress_seconds, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as PlayHistoryRecord[];
}

export async function fetchDreamJournals(userId: string) {
  const { data, error } = await supabase
    .from('dream_journals')
    .select('id, mood, content, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as DreamJournalRecord[];
}

export async function createDreamJournal(userId: string, mood: string, content: string) {
  const { error } = await supabase.from('dream_journals').insert({
    user_id: userId,
    mood,
    content,
  });
  if (error) throw error;
}

export async function deleteDreamJournal(entryId: string) {
  const { error } = await supabase.from('dream_journals').delete().eq('id', entryId);
  if (error) throw error;
}
