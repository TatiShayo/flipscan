# CONTEXT.md — Ubiquitous Domain Language (FlipScan)

## Core Entities
- **ScanBatch**: Grouped sequence of physical barcode readings captured in an inventory cycle.
- **OfflineScanQueue**: Persistent local FIFO queue retaining scans until cloud sync succeeds.
- **SymbologyDebouncer**: Frame-rate filter preventing repeated scan events on the same physical code.
- **InventoryReconciliation**: Cloud matching confirming local scan counts against warehouse database records.

## Domain Invariants
- No scan may be evicted from the local offline queue until HTTP 200/201 confirmation is returned by the server.
- Scans of the same barcode within 1500ms are deduplicated automatically.

## Forbidden Terminology
- Do not call barcodes "QR codes" when referencing 1D formats (UPC, Code128).
- Do not refer to the scan buffer as "memory cache"; use "OfflineScanQueue".
