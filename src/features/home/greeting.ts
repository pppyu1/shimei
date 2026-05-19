import type { User } from '@supabase/supabase-js';

export type GreetingPeriod = 'morning' | 'noon' | 'afternoon' | 'evening';

export const getGreetingPeriod = (date: Date): GreetingPeriod => {
  const hour = date.getHours();

  if (hour >= 6 && hour <= 11) {
    return 'morning';
  }
  if (hour >= 12 && hour <= 13) {
    return 'noon';
  }
  if (hour >= 14 && hour <= 17) {
    return 'afternoon';
  }
  return 'evening';
};

export const getGreetingText = (date: Date) => {
  const period = getGreetingPeriod(date);

  switch (period) {
    case 'morning':
      return '早上好';
    case 'noon':
      return '中午好';
    case 'afternoon':
      return '下午好';
    case 'evening':
    default:
      return '晚上好';
  }
};

const normalizeDisplayName = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const getUserDisplayName = (user: User | null | undefined, profileDisplayName?: string | null) => {
  const metadata = user?.user_metadata ?? {};
  const fallbackFromEmail = user?.email?.split('@')[0];

  return (
    normalizeDisplayName(profileDisplayName) ??
    normalizeDisplayName(metadata.display_name as string | undefined) ??
    normalizeDisplayName(metadata.full_name as string | undefined) ??
    normalizeDisplayName(metadata.name as string | undefined) ??
    normalizeDisplayName(metadata.preferred_username as string | undefined) ??
    normalizeDisplayName(fallbackFromEmail) ??
    normalizeDisplayName(user?.phone) ??
    null
  );
};

export const buildGreetingMessage = (date: Date, user: User | null | undefined, profileDisplayName?: string | null) => {
  const greeting = getGreetingText(date);
  const displayName = getUserDisplayName(user, profileDisplayName);
  return displayName ? `${greeting}，${displayName}` : greeting;
};

