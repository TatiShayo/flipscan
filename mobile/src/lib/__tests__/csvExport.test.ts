// Unit tests for CSV export functionality.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { historyToCsv, exportHistoryToCsv } from '@/lib/csvExport';
import type { ScanHistoryItem } from '@/types/scan';
import * as Sharing from 'expo-sharing';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

describe('CSV Export Subsystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCompletedItem: ScanHistoryItem = {
    id: 'scan-1',
    createdAt: '2026-08-15T12:00:00.000Z',
    imageUri: 'file:///photo1.jpg',
    identified: {
      name: 'Vintage Leather Jacket, "Brown"',
      brand: 'Schott NYC',
      model_or_era: '1970s',
      category: 'clothing',
      condition_notes: 'Great patina',
      confidence: 0.95,
      ebay_search_keywords: ['schott leather jacket'],
      needs_better_photo: false,
      photo_tip: null,
    },
    comps: {
      median: 300,
      low: 200,
      high: 450,
      count: 18,
      estimated_sold: 225,
      is_estimate: true,
      currency: 'USD',
      source: 'mock',
      sample_listings: [],
    },
    verdict: 'flip',
    condition: 'excellent',
    buyPrice: 45,
    platform: 'ebay',
    netProfit: 145.19,
    status: 'complete',
  };

  const mockQueuedItem: ScanHistoryItem = {
    id: 'queued-1',
    createdAt: '2026-08-15T13:00:00.000Z',
    imageUri: 'file:///queued.jpg',
    identified: null,
    comps: null,
    verdict: null,
    condition: 'good',
    buyPrice: null,
    platform: 'poshmark',
    netProfit: null,
    status: 'queued',
  };

  it('generates standard CSV headers', () => {
    const csv = historyToCsv([]);
    expect(csv).toBe('date,item,brand,category,condition,buy_price,estimated_sold,net_profit,verdict,platform');
  });

  it('formats completed scan history rows properly', () => {
    const csv = historyToCsv([mockCompletedItem]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);

    expect(lines[0]).toBe('date,item,brand,category,condition,buy_price,estimated_sold,net_profit,verdict,platform');
    // Name containing comma and quotes must be properly escaped
    expect(lines[1]).toContain('"Vintage Leather Jacket, ""Brown"""');
    expect(lines[1]).toContain('Schott NYC');
    expect(lines[1]).toContain('clothing');
    expect(lines[1]).toContain('excellent');
    expect(lines[1]).toContain('45.00');
    expect(lines[1]).toContain('225.00');
    expect(lines[1]).toContain('145.19');
    expect(lines[1]).toContain('flip');
    expect(lines[1]).toContain('ebay');
  });

  it('handles queued and failed items with blank identification fields rather than crashing', () => {
    const csv = historyToCsv([mockQueuedItem]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);

    const row = lines[1].split(',');
    expect(row[0]).toBe('2026-08-15'); // date
    expect(row[1]).toBe(''); // item name
    expect(row[2]).toBe(''); // brand
    expect(row[3]).toBe(''); // category
    expect(row[4]).toBe('good'); // condition
    expect(row[5]).toBe(''); // buyPrice
    expect(row[6]).toBe(''); // estimated_sold
    expect(row[7]).toBe(''); // netProfit
    expect(row[8]).toBe('queued'); // verdict fallback to status
    expect(row[9]).toBe('poshmark'); // platform
  });

  it('escapes multiline strings and commas properly in CSV', () => {
    const itemWithMultiline: ScanHistoryItem = {
      ...mockCompletedItem,
      identified: {
        ...mockCompletedItem.identified!,
        name: 'Item with\nnewline and, comma',
      },
    };

    const csv = historyToCsv([itemWithMultiline]);
    expect(csv).toContain('"Item with\nnewline and, comma"');
  });

  it('calls sharing service when exportHistoryToCsv is invoked', async () => {
    await exportHistoryToCsv([mockCompletedItem]);
    expect(Sharing.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  });
});
