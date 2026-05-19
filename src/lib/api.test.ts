import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProfile, updateProfile, syncPlayHistory } from './api';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Data Layer (API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProfile', () => {
    it('should fetch profile data successfully', async () => {
      const mockData = { id: '123', display_name: 'Test User' };
      
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const result = await fetchProfile('123');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockData);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = new Error('Database error');
      
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(fetchProfile('123')).rejects.toThrow('Database error');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { display_name: 'New Name' };
      const mockData = { id: '123', display_name: 'New Name' };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      const result = await updateProfile('123', updates);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockData);
    });
  });

  describe('syncPlayHistory', () => {
    it('should call edge function correctly', async () => {
      const mockData = { success: true };
      (supabase.functions.invoke as any).mockResolvedValue({ data: mockData, error: null });

      const result = await syncPlayHistory('content-1', 120);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('sync-play-history', {
        body: { content_id: 'content-1', progress_seconds: 120 },
      });
      expect(result).toEqual(mockData);
    });

    it('should throw error when edge function fails', async () => {
      const mockError = new Error('Edge function error');
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: mockError });

      await expect(syncPlayHistory('content-1', 120)).rejects.toThrow('Edge function error');
    });
  });
});
