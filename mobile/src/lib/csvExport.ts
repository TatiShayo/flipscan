// CSV export of scan history (BUILD_PROMPT §15: annual-plan perk, resellers need it for
// bookkeeping/taxes). Writes to the cache directory then hands off to the OS share sheet
// via expo-sharing — no server round-trip, no PII beyond what's already on-device.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ScanHistoryItem } from '@/types/scan';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function historyToCsv(items: ScanHistoryItem[]): string {
  const header = [
    'date',
    'item',
    'brand',
    'category',
    'condition',
    'buy_price',
    'estimated_sold',
    'net_profit',
    'verdict',
    'platform',
  ];
  const rows = items.map((item) =>
    [
      new Date(item.createdAt).toISOString().slice(0, 10),
      item.identified.name,
      item.identified.brand ?? '',
      item.identified.category,
      item.condition,
      item.buyPrice != null ? item.buyPrice.toFixed(2) : '',
      item.comps.estimated_sold.toFixed(2),
      item.netProfit != null ? item.netProfit.toFixed(2) : '',
      item.verdict,
      item.platform,
    ]
      .map((v) => csvEscape(String(v)))
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export async function exportHistoryToCsv(items: ScanHistoryItem[]): Promise<void> {
  const csv = historyToCsv(items);
  const file = new File(Paths.cache, `flipscan-history-${Date.now()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export scan history' });
  }
}
