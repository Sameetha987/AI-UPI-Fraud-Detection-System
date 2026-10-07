from pathlib import Path
import pandas as pd

INPUT_PATH = Path("data/processed/paysim_features.csv")

print("Loading dataset...")
df = pd.read_csv(INPUT_PATH)

print(f"Rows: {len(df):,}")

duplicates = df[df.duplicated(keep=False)].copy()

print(f"\nDuplicate rows: {len(duplicates):,}")

if len(duplicates) == 0:
    print("No duplicates found.")
    exit()

print("\n========== DUPLICATE TARGET DISTRIBUTION ==========")
print(
    duplicates["isFraud"]
    .value_counts()
)

print("\n========== DUPLICATE EXAMPLES ==========")
print(
    duplicates.head(20).to_string(index=False)
)

print("\n========== DUPLICATE GROUP SIZES ==========")

duplicate_groups = (
    duplicates
    .groupby(list(df.columns), dropna=False)
    .size()
    .sort_values(ascending=False)
)

print(duplicate_groups.head(20))

print("\n========== DUPLICATE FRAUD GROUPS ==========")

fraud_duplicates = duplicates[
    duplicates["isFraud"] == 1
]

print(
    f"Fraud duplicate rows: "
    f"{len(fraud_duplicates):,}"
)

print("\nDuplicate analysis completed.")