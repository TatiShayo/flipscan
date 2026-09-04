# TICKETS — FlipScan Logistics Pipeline

## [TICKET-001] Durable Offline Scan Queue & Retry Engine
- **Blocked by**: None
- **Delivers**: Local SQLite FIFO queue with exponential retry backoff.
- **Verification**: `mobile/src/lib/__tests__/offline-scan-queue-durability.test.ts`

## [TICKET-002] 1500ms Symbology Frame Debouncer
- **Blocked by**: TICKET-001
- **Delivers**: Fast camera buffer filter eliminating duplicate scan events.
- **Verification**: Timestamp threshold deduplication unit tests.
