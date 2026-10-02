import pandas as pd
import numpy as np

np.random.seed(42)
n_rows = 50000

df = pd.DataFrame({
    'transaction_id': [f'TXN-{i}' for i in range(n_rows)],
    'customer_id': np.random.choice([f'CUST-{i}' for i in range(1000)], n_rows),
    'amount': np.random.normal(500, 100, n_rows).round(2),
    'margin_pct': np.random.normal(0.40, 0.05, n_rows).round(2),
    'discount_applied': np.random.choice([True, False], n_rows, p=[0.7, 0.3]),
    'region': np.random.choice(['East', 'West', 'North', 'South'], n_rows)
})

df.to_csv('novamart_transactions_large.csv', index=False)
