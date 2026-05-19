import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { buildGreetingMessage, getGreetingPeriod, getGreetingText, getUserDisplayName } from './greeting';

const createUser = (overrides: Partial<User> = {}) =>
  ({
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as User;

describe('greeting helpers', () => {
  it('maps each time range to the expected greeting period', () => {
    expect(getGreetingPeriod(new Date('2026-04-18T06:00:00'))).toBe('morning');
    expect(getGreetingPeriod(new Date('2026-04-18T11:59:59'))).toBe('morning');
    expect(getGreetingPeriod(new Date('2026-04-18T12:00:00'))).toBe('noon');
    expect(getGreetingPeriod(new Date('2026-04-18T13:59:59'))).toBe('noon');
    expect(getGreetingPeriod(new Date('2026-04-18T14:00:00'))).toBe('afternoon');
    expect(getGreetingPeriod(new Date('2026-04-18T17:59:59'))).toBe('afternoon');
    expect(getGreetingPeriod(new Date('2026-04-18T18:00:00'))).toBe('evening');
    expect(getGreetingPeriod(new Date('2026-04-18T05:59:59'))).toBe('evening');
  });

  it('returns localized greeting text for each time period', () => {
    expect(getGreetingText(new Date('2026-04-18T09:00:00'))).toBe('早上好');
    expect(getGreetingText(new Date('2026-04-18T12:30:00'))).toBe('中午好');
    expect(getGreetingText(new Date('2026-04-18T15:30:00'))).toBe('下午好');
    expect(getGreetingText(new Date('2026-04-18T20:30:00'))).toBe('晚上好');
  });

  it('prefers profile display name and falls back to auth metadata', () => {
    const user = createUser({
      email: 'elena@example.com',
      user_metadata: { full_name: 'Elena Metadata' },
    });

    expect(getUserDisplayName(user, 'Elena Profile')).toBe('Elena Profile');
    expect(getUserDisplayName(user, '')).toBe('Elena Metadata');
  });

  it('falls back to email prefix when profile and metadata names are missing', () => {
    const user = createUser({
      email: 'moonlight@example.com',
      user_metadata: {},
    });

    expect(getUserDisplayName(user, null)).toBe('moonlight');
  });

  it('builds a greeting with or without a signed-in user name', () => {
    const user = createUser({
      email: 'elena@example.com',
      user_metadata: { preferred_username: 'Elena' },
    });

    expect(buildGreetingMessage(new Date('2026-04-18T07:30:00'), user, null)).toBe('早上好，Elena');
    expect(buildGreetingMessage(new Date('2026-04-18T19:30:00'), null, null)).toBe('晚上好');
  });
});

