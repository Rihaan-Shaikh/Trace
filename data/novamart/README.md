# NovaMart Synthetic Dataset Specification

NovaMart is the synthetic multi-table retail testbed specified in Project Bible Section 22.

## Target Scale (Phase 2 Target)
- **Customers**: ~25,000 accounts with tiered margin classification.
- **Transactions**: ~100,000 purchase records spanning multiple fiscal quarters.
- **Products**: ~500 catalog items with cost of goods sold (COGS) and price histories.
- **Regions**: Multi-regional operations (Region 1 through 4) with store locations.
- **Discount Structure**: Tiered contractual terms vs discretionary discounts.

## Phase 1 Status
Phase 1 establishes the storage directory and relational schema tables (`datasets`, `dataset_tables`, `dataset_columns`). Synthetic generator scripts will be implemented in later phases.
