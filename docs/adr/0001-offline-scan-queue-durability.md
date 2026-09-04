# ADR 0001: Persistent Local Scan Queue and Hardware Frame Debouncing

## Context
Warehouse inventory workers operate in steel and concrete environments with severe wireless interference.

## Decision
1. **Persistent SQLite FIFO Queue**: Scans persist locally before transmission to cloud endpoints.
2. **1500ms Frame Debounce**: Symbology filter eliminates multi-frame double scans.
3. **Background Worker Processing**: Decoding algorithms run off the main UI thread.

## Consequences
- **Positive**: Zero dropped scans in dead zones and responsive 60 FPS camera preview.
- **Negative**: Requires background sync service management on mobile OS suspend states.
