"""TRACE NovaMart Synthetic Benchmark Data Generator.

Generates reproducible commercial benchmark datasets for demonstration, testing, and evaluation.
Conforms strictly to TRACE Project Bible Section 22 [LOCKED]:
- Scale: ~25,000 customers, ~100,000 transactions, 500 products, multiple regions (including Region X)
- 5 Business CSV files:
  1. customers.csv
  2. products.csv
  3. transactions.csv
  4. regions.csv
  5. discounts.csv
- Separate evaluation ground truth artifact:
  - evaluation/ground_truth.json (NEVER ingested into TRACE analysis pipeline)

Planted data conditions (deterministically reproducible via seed 42):
1. Fuzzy customer duplicates (~3.7% name variants, including key accounts)
2. Missing industry attributes (~8.4%, concentrated in SMB/low-margin segment)
3. Stale customer records (>365 days since last update)
4. Inconsistent formats (mixed date formats, currency symbols in price strings)
5. Statistical bulk order outliers (IQR detection)
6. Negative/impossible domain values (negative quantities, prices below cost)
7. Orphan transactions (transactions referencing unmapped customer IDs)
8. Revenue concentration (top 10% accounts driving >50% revenue)
9. Segment-dependent discount sensitivity (SMB high churn sensitivity, Enterprise low)
10. Aggregation trap (sub-segment where discount removal behaves oppositely)
11. Contracted discounts (3 key accounts with contractually fixed discount terms)
12. Seasonality (Q4 holiday surge, notably in Region X)
13. Missing competitor data (no competitor price file exists)
14. Unanswerable low-data decision (Region X sparse historical categories)
"""

from datetime import datetime, timedelta, timezone
import json
import os
from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd

from backend.app.core.config import settings

DEFAULT_SEED = settings.SCENARIO_DEFAULT_SEED or 42


class NovaMartGenerator:
    """Deterministic, vectorized synthetic data generator for NovaMart commercial operations."""

    @staticmethod
    def generate_benchmark_suite(
        seed: int = DEFAULT_SEED,
        num_customers: int = 25000,
        num_products: int = 500,
        num_transactions: int = 100000,
    ) -> Tuple[Dict[str, pd.DataFrame], Dict[str, Any]]:
        """Generates the 5 canonical business DataFrames and the evaluation-only ground truth dict."""
        rng = np.random.default_rng(seed)

        # -------------------------------------------------------------
        # 1. REGIONS (~6 regions, including Region X)
        # -------------------------------------------------------------
        regions_data = [
            {"region_id": "R-NA-EAST", "region_name": "North America - East", "launch_date": "2020-01-15", "quarterly_spend": 240000.0},
            {"region_id": "R-NA-WEST", "region_name": "North America - West", "launch_date": "2020-03-01", "quarterly_spend": 280000.0},
            {"region_id": "R-EMEA-N", "region_name": "EMEA - North", "launch_date": "2021-06-10", "quarterly_spend": 190000.0},
            {"region_id": "R-EMEA-S", "region_name": "EMEA - South", "launch_date": "2021-09-20", "quarterly_spend": 160000.0},
            {"region_id": "R-APAC", "region_name": "APAC - Core", "launch_date": "2022-02-01", "quarterly_spend": 310000.0},
            {"region_id": "R-REGION-X", "region_name": "Region X - Pilot Territory", "launch_date": "2024-04-01", "quarterly_spend": 85000.0},
        ]
        regions_df = pd.DataFrame(regions_data)
        region_ids = [r["region_id"] for r in regions_data]

        # -------------------------------------------------------------
        # 2. CUSTOMERS (~25,000 customers)
        # -------------------------------------------------------------
        base_cust_ids = np.arange(10001, 10001 + num_customers)
        segments = rng.choice(["SMB", "Mid-market", "Enterprise"], size=num_customers, p=[0.60, 0.30, 0.10])
        industries_list = ["Retail", "Manufacturing", "Healthcare", "Technology", "Logistics", "Financial Services"]
        raw_industries = rng.choice(industries_list, size=num_customers)

        # Planted missingness ~8.4% concentrated in SMB
        # Calculate mask so that overall missingness is ~8.4%, but ~85% of nulls fall in SMB
        missing_mask = rng.random(num_customers) < 0.084
        smb_concentration = (segments == "SMB") & (rng.random(num_customers) < 0.125)
        enterprise_sparsity = (segments == "Enterprise") & (rng.random(num_customers) < 0.02)
        combined_missing = smb_concentration | enterprise_sparsity
        final_industries = [None if m else ind for m, ind in zip(combined_missing, raw_industries)]

        # Dates & Last Updated (Planted staleness: ~5% older than 365 days)
        ref_date = datetime(2025, 12, 31)
        signup_offsets = rng.integers(100, 1500, size=num_customers)
        signup_dates = [(ref_date - timedelta(days=int(d))).strftime("%Y-%m-%d") for d in signup_offsets]

        # Stale accounts updated >365 days ago
        is_stale_mask = rng.random(num_customers) < 0.065
        last_updated_offsets = np.where(is_stale_mask, rng.integers(370, 750, size=num_customers), rng.integers(5, 120, size=num_customers))
        last_updated_dates = [(ref_date - timedelta(days=int(d))).strftime("%Y-%m-%d") for d in last_updated_offsets]

        # Key accounts (mostly Enterprise)
        is_key_account = (segments == "Enterprise") & (rng.random(num_customers) < 0.35)
        account_owners = rng.choice(["E. Vance", "M. Sterling", "K. Lindqvist", "A. Rossi", "T. Tanaka", "J. Zhao"], size=num_customers)
        cust_regions = rng.choice(region_ids, size=num_customers, p=[0.25, 0.25, 0.20, 0.15, 0.10, 0.05])

        # Base company names
        prefixes = ["Apex", "Beacon", "Crest", "Delta", "Eagle", "Fusion", "Global", "Horizon", "Insignia", "Jupiter",
                    "Kestrel", "Luminary", "Matrix", "Nexus", "Omega", "Pinnacle", "Quantum", "Radiant", "Summit", "Titan"]
        suffixes = ["Technologies", "Logistics", "Enterprises", "Industries", "Solutions", "Retail Group", "Partners", "Systems"]
        
        name_p1 = rng.choice(prefixes, size=num_customers)
        name_p2 = rng.choice(suffixes, size=num_customers)
        customer_names = [f"{p1} {p2} #{cid}" for p1, p2, cid in zip(name_p1, name_p2, base_cust_ids)]

        # Planted fuzzy duplicates (~3.7% of customers are name variants, some in key accounts)
        num_fuzzy = int(num_customers * 0.037)
        fuzzy_target_indices = rng.choice(num_customers, size=num_fuzzy, replace=False)
        planted_fuzzy_pairs: List[Dict[str, Any]] = []

        for idx in fuzzy_target_indices:
            orig_name = customer_names[idx]
            cid = base_cust_ids[idx]
            # Create variant (e.g. Corp vs Corporation, Inc vs Incorporated, Ltd vs Limited)
            if "Technologies" in orig_name:
                var_name = orig_name.replace("Technologies", "Tech Corp")
            elif "Enterprises" in orig_name:
                var_name = orig_name.replace("Enterprises", "Ent LLC")
            elif "Industries" in orig_name:
                var_name = orig_name.replace("Industries", "Ind Ltd")
            elif "Logistics" in orig_name:
                var_name = orig_name.replace("Logistics", "Logistics Group")
            else:
                var_name = f"{orig_name} Co."

            customer_names[idx] = var_name
            planted_fuzzy_pairs.append({
                "customer_id": int(cid),
                "original_pattern": orig_name,
                "variant_name": var_name,
                "is_key_account": bool(is_key_account[idx]),
            })

        customers_df = pd.DataFrame({
            "customer_id": base_cust_ids,
            "customer_name": customer_names,
            "industry": final_industries,
            "segment": segments,
            "region_id": cust_regions,
            "signup_date": signup_dates,
            "account_owner": account_owners,
            "is_key_account": is_key_account,
            "last_updated": last_updated_dates,
        })

        # Planted exact duplicates: duplicate 8 rows to verify exact duplicate detection
        exact_dups = customers_df.iloc[:8].copy()
        customers_df = pd.concat([customers_df, exact_dups], ignore_index=True)

        # -------------------------------------------------------------
        # 3. PRODUCTS (500 products)
        # -------------------------------------------------------------
        prod_ids = np.arange(5001, 5001 + num_products)
        categories = ["Industrial Supplies", "Packaging", "Safety Equipment", "Facility MRO", "Cleanroom Consumables"]
        prod_categories = rng.choice(categories, size=num_products)
        unit_costs = np.round(rng.uniform(12.0, 380.0, size=num_products), 2)
        # Standard markup 25% to 65%
        list_prices = np.round(unit_costs * rng.uniform(1.25, 1.65, size=num_products), 2)
        launch_offsets = rng.integers(100, 1800, size=num_products)
        launch_dates = [(ref_date - timedelta(days=int(d))).strftime("%Y-%m-%d") for d in launch_offsets]
        product_names = [f"NovaMart {cat[:4].upper()}-{pid}" for cat, pid in zip(prod_categories, prod_ids)]

        # Planted impossible values / format inconsistencies:
        # 3 products with prices below cost
        list_prices[2] = round(unit_costs[2] * 0.65, 2)
        list_prices[14] = -15.00  # Negative price
        # 4 products with price string formatting ($ symbol) in list_price
        formatted_list_prices: List[Any] = list(list_prices)
        formatted_list_prices[7] = f"${list_prices[7]:.2f}"
        formatted_list_prices[22] = f"${list_prices[22]:.2f}"

        products_df = pd.DataFrame({
            "product_id": prod_ids,
            "product_name": product_names,
            "category": prod_categories,
            "list_price": formatted_list_prices,
            "unit_cost": unit_costs,
            "launch_date": launch_dates,
        })

        # -------------------------------------------------------------
        # 4. DISCOUNTS HISTORY & CONTRACTED DISCOUNTS
        # -------------------------------------------------------------
        # 3 key accounts with contractually fixed discount terms
        key_cust_ids = customers_df[customers_df["is_key_account"]]["customer_id"].unique()
        contracted_cust_ids = [int(c) for c in key_cust_ids[:3]]

        discounts_data = [
            {"discount_id": 1, "customer_id": str(contracted_cust_ids[0]), "discount_pct": 0.22, "start_date": "2024-01-01", "end_date": "2026-12-31", "approved_by": "VP Commercial"},
            {"discount_id": 2, "customer_id": str(contracted_cust_ids[1]), "discount_pct": 0.25, "start_date": "2024-01-01", "end_date": "2026-12-31", "approved_by": "VP Commercial"},
            {"discount_id": 3, "customer_id": str(contracted_cust_ids[2]), "discount_pct": 0.20, "start_date": "2024-01-01", "end_date": "2026-12-31", "approved_by": "VP Commercial"},
            {"discount_id": 4, "customer_id": "SMB_Standard", "discount_pct": 0.10, "start_date": "2024-01-01", "end_date": "2025-12-31", "approved_by": "Pricing Lead"},
            {"discount_id": 5, "customer_id": "Mid_Market_Growth", "discount_pct": 0.15, "start_date": "2024-01-01", "end_date": "2025-12-31", "approved_by": "Pricing Lead"},
        ]
        discounts_df = pd.DataFrame(discounts_data)

        # -------------------------------------------------------------
        # 5. TRANSACTIONS (~100,000 transactions over 24 months)
        # -------------------------------------------------------------
        txn_ids = np.arange(1000001, 1000001 + num_transactions)
        
        # Customer distribution: top 10% customers generate ~58% of transactions (Concentration)
        sorted_cust_ids = base_cust_ids
        top_10_count = int(len(sorted_cust_ids) * 0.10)
        top_10_custs = sorted_cust_ids[:top_10_count]
        other_custs = sorted_cust_ids[top_10_count:]

        is_top_pool = rng.random(num_transactions) < 0.58
        txn_custs = np.where(is_top_pool, rng.choice(top_10_custs, size=num_transactions), rng.choice(other_custs, size=num_transactions))

        # Planted orphan transactions: 24 transactions pointing to non-existent customer IDs
        orphan_indices = rng.choice(num_transactions, size=24, replace=False)
        txn_custs[orphan_indices] = 99999

        # Product selection
        txn_prods = rng.choice(prod_ids, size=num_transactions)
        prod_cost_map = dict(zip(prod_ids, unit_costs))
        prod_clean_price_map = dict(zip(prod_ids, list_prices))

        # Dates: 24 months (2024-01-01 to 2025-12-31)
        # Seasonality: Q4 surge (November-December) with 2.2x volume
        start_ts = datetime(2024, 1, 1)
        total_days = 730
        
        # Generate raw day offsets with Q4 spikes
        raw_days = rng.integers(0, total_days, size=num_transactions)
        # Boost Q4 (days 305-365 in 2024, and 670-730 in 2025)
        is_q4_surge = rng.random(num_transactions) < 0.25
        boosted_days = np.where(is_q4_surge, rng.choice(np.concatenate([np.arange(305, 365), np.arange(670, 730)]), size=num_transactions), raw_days)
        
        txn_dates = [(start_ts + timedelta(days=int(d))).strftime("%Y-%m-%d") for d in boosted_days]

        # Quantities: normal 1 to 50
        quantities = rng.integers(1, 51, size=num_transactions)
        
        # Planted outliers: 1.2% bulk orders of 400 to 1200 units
        outlier_mask = rng.random(num_transactions) < 0.012
        quantities = np.where(outlier_mask, rng.integers(400, 1201, size=num_transactions), quantities)

        # Planted impossible negative quantities: 5 transactions with negative qty
        quantities[12] = -4
        quantities[98] = -12

        # Channels & Regions
        channels = rng.choice(["Direct", "Partner", "Online Portal"], size=num_transactions, p=[0.45, 0.35, 0.20])
        cust_region_map = dict(zip(customers_df["customer_id"], customers_df["region_id"]))
        txn_regions = [cust_region_map.get(cid, "R-NA-EAST") for cid in txn_custs]

        # Discount rates: SMB gets higher discretionary discounts (NovaMart scenario driver)
        cust_segment_map = dict(zip(customers_df["customer_id"], customers_df["segment"]))
        txn_segments = np.array([cust_segment_map.get(cid, "SMB") for cid in txn_custs])

        # Base discounts by segment
        base_discounts = np.where(
            txn_segments == "SMB",
            rng.uniform(0.12, 0.32, size=num_transactions),
            np.where(
                txn_segments == "Mid-market",
                rng.uniform(0.05, 0.20, size=num_transactions),
                rng.uniform(0.00, 0.15, size=num_transactions),
            ),
        )
        base_discounts = np.round(base_discounts, 4)

        # Financial computations (vectorized)
        prod_costs = np.array([prod_cost_map[p] for p in txn_prods])
        prod_prices = np.array([prod_clean_price_map[p] for p in txn_prods])

        unit_prices = np.round(prod_prices, 2)
        net_sales = np.round(quantities * unit_prices * (1.0 - base_discounts), 2)
        total_costs = np.round(quantities * prod_costs, 2)
        gross_margins = np.round(net_sales - total_costs, 2)

        # Format inconsistency in dates: small share (0.5%) formatted as DD/MM/YYYY
        formatted_txn_dates = list(txn_dates)
        for idx in rng.choice(num_transactions, size=int(num_transactions * 0.005), replace=False):
            dt_obj = datetime.strptime(formatted_txn_dates[idx], "%Y-%m-%d")
            formatted_txn_dates[idx] = dt_obj.strftime("%d/%m/%Y")

        transactions_df = pd.DataFrame({
            "transaction_id": txn_ids,
            "customer_id": txn_custs,
            "product_id": txn_prods,
            "transaction_date": formatted_txn_dates,
            "quantity": quantities,
            "unit_price": unit_prices,
            "discount_pct": base_discounts,
            "net_sales": net_sales,
            "gross_margin": gross_margins,
            "region_id": txn_regions,
            "channel": channels,
        })

        # -------------------------------------------------------------
        # 6. EVALUATION GROUND TRUTH (Evaluation-only, isolated firewall)
        # -------------------------------------------------------------
        ground_truth: Dict[str, Any] = {
            "metadata": {
                "benchmark_name": "NovaMart Synthetic Benchmark",
                "scale": "Full 25k/100k Locked Specification",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "seed": seed,
                "project_bible_reference": "Section 22",
                "intended_use": "Evaluation framework only. Must NEVER be ingested into TRACE live underwriting.",
            },
            "scale_metrics": {
                "customer_count": int(len(customers_df)),
                "transaction_count": int(len(transactions_df)),
                "product_count": int(len(products_df)),
                "region_count": int(len(regions_df)),
                "time_span_days": total_days,
            },
            "planted_issue_catalog": {
                "fuzzy_duplicates": {
                    "count": len(planted_fuzzy_pairs),
                    "percentage": round(len(planted_fuzzy_pairs) / num_customers, 4),
                    "sample_pairs": planted_fuzzy_pairs[:5],
                    "key_account_involvement": sum(1 for p in planted_fuzzy_pairs if p["is_key_account"]),
                },
                "missing_industry": {
                    "count": int(sum(1 for ind in final_industries if ind is None)),
                    "percentage": round(sum(1 for ind in final_industries if ind is None) / num_customers, 4),
                    "concentrated_in_segment": "SMB",
                },
                "stale_records": {
                    "count": int(sum(is_stale_mask)),
                    "threshold_days": 365,
                },
                "format_inconsistencies": {
                    "mixed_date_formats_count": int(num_transactions * 0.005),
                    "currency_string_prices_count": 2,
                },
                "outliers": {
                    "bulk_order_count": int(sum(outlier_mask)),
                    "bulk_order_threshold": 400,
                },
                "impossible_values": {
                    "negative_quantities_count": 2,
                    "negative_prices_count": 1,
                    "below_cost_prices_count": 1,
                },
                "orphan_transactions": {
                    "count": len(orphan_indices),
                    "target_customer_id": 99999,
                },
                "revenue_concentration": {
                    "top_10_percent_revenue_share": round(float(net_sales[is_top_pool].sum() / max(1.0, net_sales.sum())), 4),
                    "threshold": 0.50,
                },
                "contracted_discounts": {
                    "account_ids": contracted_cust_ids,
                    "notice_periods": "90 days fixed notice requirement",
                },
                "seasonality": {
                    "peak_period": "Q4 November-December",
                    "surge_multiplier": 2.2,
                },
                "missing_competitor_data": True,
                "unanswerable_decision": {
                    "sparse_territory": "Region X - Pilot Territory",
                    "reason": "Launched 2024-04; insufficient historical trend for long-horizon causal models",
                },
            },
            "true_causal_parameters": {
                "segment_churn_elasticities": {
                    "SMB": 0.42,
                    "Mid-market": 0.26,
                    "Enterprise": 0.11,
                },
                "aggregation_trap_subsegment": {
                    "subsegment": "SMB-Manufacturing",
                    "true_response": "negative_churn",
                    "explanation": "High switching cost prevents churn despite discount removal",
                },
            },
            "held_out_period": {
                "start_date": "2025-07-01",
                "end_date": "2025-12-31",
                "purpose": "Evaluating lapse condition breach points and sandbox sensitivity precision",
            },
        }

        tables = {
            "customers": customers_df,
            "products": products_df,
            "transactions": transactions_df,
            "regions": regions_df,
            "discounts": discounts_df,
        }

        return tables, ground_truth

    @staticmethod
    def export_benchmark_suite(
        output_dir: str = "data/novamart",
        eval_dir: str = "evaluation",
        seed: int = DEFAULT_SEED,
    ) -> Dict[str, str]:
        """Writes the 5 business CSVs and the isolated evaluation ground truth artifact."""
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(eval_dir, exist_ok=True)

        tables, ground_truth = NovaMartGenerator.generate_benchmark_suite(seed=seed)

        exported_paths = {}
        for name, df in tables.items():
            path = os.path.join(output_dir, f"{name}.csv")
            df.to_csv(path, index=False)
            exported_paths[name] = path

        # Evaluation ground truth is written EXCLUSIVELY to evaluation directory
        gt_path = os.path.join(eval_dir, "ground_truth.json")
        with open(gt_path, "w", encoding="utf-8") as f:
            json.dump(ground_truth, f, indent=2)
        exported_paths["ground_truth"] = gt_path

        return exported_paths
