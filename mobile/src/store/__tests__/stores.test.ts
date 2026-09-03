// Unit tests for Zustand Store State Transitions & Persistence.
import { describe, it, expect, beforeEach } from '@jest/globals';
import { useScanStore } from '@/store/scanStore';
import { useCapturedImageStore } from '@/store/captureStore';
import { useSettingsStore } from '@/store/settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanHistoryItem, ScanResult } from '@/types/scan';

describe('Zustand Stores & State Management', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useScanStore.setState({
      freeScansUsed: 0,
      topupRemaining: 0,
      isSubscribed: false,
      history: [],
      watchlist: [],
    });
    useCapturedImageStore.getState().clear();
    useSettingsStore.setState({
      defaultPlatform: 'ebay',
      onboardingCompleted: false,
      thriftFrequency: null,
      hasSeenReviewPrompt: false,
    });
  });

  describe('useScanStore', () => {
    const sampleItem: ScanHistoryItem = {
      id: 'scan-abc',
      createdAt: '2026-08-15T10:00:00Z',
      imageUri: 'file:///image.jpg',
      identified: {
        name: 'Vintage Camera',
        brand: 'Olympus',
        model_or_era: 'OM-1',
        category: 'electronics',
        condition_notes: 'Clean lens',
        confidence: 0.9,
        ebay_search_keywords: ['olympus om-1'],
        needs_better_photo: false,
        photo_tip: null,
      },
      comps: {
        median: 150,
        low: 80,
        high: 220,
        count: 35,
        estimated_sold: 112.5,
        is_estimate: true,
        currency: 'USD',
        source: 'mock',
        sample_listings: [],
      },
      verdict: 'flip',
      condition: 'good',
      buyPrice: 20,
      platform: 'ebay',
      netProfit: 67.5,
      status: 'complete',
    };

    it('adds and prepends history items', () => {
      useScanStore.getState().addHistoryItem(sampleItem);
      const history = useScanStore.getState().history;
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('scan-abc');

      const secondItem = { ...sampleItem, id: 'scan-def' };
      useScanStore.getState().addHistoryItem(secondItem);
      expect(useScanStore.getState().history).toHaveLength(2);
      expect(useScanStore.getState().history[0].id).toBe('scan-def');
    });

    it('updates specific history item patches', () => {
      useScanStore.getState().addHistoryItem(sampleItem);
      useScanStore.getState().updateHistoryItem('scan-abc', {
        buyPrice: 30,
        netProfit: 57.5,
        condition: 'excellent',
      });

      const updated = useScanStore.getState().history.find((h) => h.id === 'scan-abc');
      expect(updated?.buyPrice).toBe(30);
      expect(updated?.netProfit).toBe(57.5);
      expect(updated?.condition).toBe('excellent');
    });

    it('removes history item and cleans up watchlist references', () => {
      useScanStore.getState().addHistoryItem(sampleItem);
      useScanStore.getState().toggleWatchlist('scan-abc');
      expect(useScanStore.getState().isWatchlisted('scan-abc')).toBe(true);

      useScanStore.getState().removeHistoryItem('scan-abc');
      expect(useScanStore.getState().history).toHaveLength(0);
      expect(useScanStore.getState().isWatchlisted('scan-abc')).toBe(false);
    });

    it('toggles watchlist state idempotently', () => {
      expect(useScanStore.getState().isWatchlisted('scan-123')).toBe(false);

      useScanStore.getState().toggleWatchlist('scan-123');
      expect(useScanStore.getState().isWatchlisted('scan-123')).toBe(true);

      useScanStore.getState().toggleWatchlist('scan-123');
      expect(useScanStore.getState().isWatchlisted('scan-123')).toBe(false);
    });

    it('calculates total potential profit found across completed scans', () => {
      useScanStore.getState().addHistoryItem({ ...sampleItem, id: 's1', netProfit: 50 });
      useScanStore.getState().addHistoryItem({ ...sampleItem, id: 's2', netProfit: 25.5 });
      useScanStore.getState().addHistoryItem({ ...sampleItem, id: 's3', netProfit: -10 }); // negative ignored in sum

      expect(useScanStore.getState().potentialProfitFound()).toBe(75.5);
    });
  });

  describe('useCapturedImageStore', () => {
    it('sets and clears pending capture', () => {
      const store = useCapturedImageStore.getState();
      store.setCaptured({
        images: [{ uri: 'file:///img.jpg', base64: 'b64' }],
        mode: 'photo',
      });

      expect(useCapturedImageStore.getState().pending).toBeDefined();
      expect(useCapturedImageStore.getState().pending?.mode).toBe('photo');

      useCapturedImageStore.getState().clear();
      expect(useCapturedImageStore.getState().pending).toBeNull();
      expect(useCapturedImageStore.getState().lastResult).toBeNull();
    });

    it('sets scan result and clears pending automatically', () => {
      const mockResult: ScanResult = {
        scan_id: 'res-1',
        identified: {
          name: 'Book',
          brand: null,
          model_or_era: null,
          category: 'books_media',
          condition_notes: '',
          confidence: 1,
          ebay_search_keywords: ['book'],
          needs_better_photo: false,
          photo_tip: null,
        },
        comps: {
          median: 20,
          low: 10,
          high: 30,
          count: 5,
          estimated_sold: 15,
          is_estimate: true,
          currency: 'USD',
          source: 'mock',
          sample_listings: [],
        },
        verdict: 'maybe',
        free_scans_used: 1,
        free_limit: 3,
        topup_remaining: 0,
      };

      useCapturedImageStore.getState().setCaptured({
        images: [{ uri: 'file:///book.jpg', base64: 'b64' }],
        mode: 'photo',
      });

      useCapturedImageStore.getState().setResult(mockResult, 'file:///book.jpg');

      expect(useCapturedImageStore.getState().pending).toBeNull();
      expect(useCapturedImageStore.getState().lastResult?.scan_id).toBe('res-1');
      expect(useCapturedImageStore.getState().lastImageUri).toBe('file:///book.jpg');
    });
  });

  describe('useSettingsStore', () => {
    it('updates default resale platform', () => {
      expect(useSettingsStore.getState().defaultPlatform).toBe('ebay');

      useSettingsStore.getState().setDefaultPlatform('poshmark');
      expect(useSettingsStore.getState().defaultPlatform).toBe('poshmark');
    });

    it('tracks onboarding completion state', () => {
      expect(useSettingsStore.getState().onboardingCompleted).toBe(false);

      useSettingsStore.getState().completeOnboarding();
      expect(useSettingsStore.getState().onboardingCompleted).toBe(true);
    });

    it('sets thrift frequency and marks review prompt as shown', () => {
      useSettingsStore.getState().setThriftFrequency('Weekly regular');
      expect(useSettingsStore.getState().thriftFrequency).toBe('Weekly regular');

      useSettingsStore.getState().markReviewPromptShown();
      expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(true);
    });
  });
});
