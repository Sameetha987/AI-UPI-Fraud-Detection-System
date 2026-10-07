from pathlib import Path
import pandas as pd
import numpy as np

INPUT_PATH = Path("data/processed/paysim_features.csv")

print("Loading processed dataset...")
df = pd.read_csv(INPUT_PATH)

print(f"Rows: {len(df):,}")
print(f"Columns: {len(df.columns)}")

# ---------------------------------------------------------
# 1. Check missing values
# ---------------------------------------------------------

print("\n========== 1. MISSING VALUES ==========")

missing = df.isnull().sum()
missing = missing[missing > 0]

if missing.empty:
    print("PASS: No missing values.")
else:
    print("WARNING: Missing values found:")
    print(missing)


# ---------------------------------------------------------
# 2. Check duplicate rows
# ---------------------------------------------------------

print("\n========== 2. DUPLICATES ==========")

duplicates = df.duplicated().sum()

print(f"Duplicate rows: {duplicates:,}")

if duplicates == 0:
    print("PASS: No duplicate rows.")
else:
    print("WARNING: Duplicate rows detected.")


# ---------------------------------------------------------
# 3. Check target leakage
# ---------------------------------------------------------

print("\n========== 3. TARGET LEAKAGE ==========")

target = "isFraud"

print(f"Target column: {target}")

if target in df.columns:
    print("PASS: Target exists.")
else:
    print("ERROR: Target column missing.")


# ---------------------------------------------------------
# 4. Check suspiciously perfect features
# ---------------------------------------------------------

print("\n========== 4. FEATURE FRAUD RATES ==========")

features = [
    column for column in df.columns
    if column != target
]

for column in features:

    if df[column].nunique() <= 20:

        print(f"\nFeature: {column}")
        print(
            df.groupby(column)[target]
              .agg(["count", "sum", "mean"])
              .sort_values("mean", ascending=False)
              .head(20)
        )


# ---------------------------------------------------------
# 5. Correlation audit
# ---------------------------------------------------------

print("\n========== 5. CORRELATION AUDIT ==========")

numeric_df = df.select_dtypes(include=np.number)

correlations = (
    numeric_df.corr(numeric_only=True)[target]
    .drop(target)
    .sort_values(ascending=False)
)

print(correlations.to_string())


# ---------------------------------------------------------
# 6. Check infinite values
# ---------------------------------------------------------

print("\n========== 6. INFINITE VALUES ==========")

numeric_values = df.select_dtypes(include=np.number)

infinite_count = np.isinf(numeric_values).sum().sum()

print(f"Infinite values: {infinite_count:,}")

if infinite_count == 0:
    print("PASS: No infinite values.")
else:
    print("WARNING: Infinite values detected.")


# ---------------------------------------------------------
# 7. Historical feature sanity checks
# ---------------------------------------------------------

print("\n========== 7. HISTORICAL FEATURE CHECKS ==========")

historical_features = [
    "historical_sender_transaction_count",
    "historical_receiver_transaction_count",
    "historical_sender_receiver_count",
    "historical_sender_average_amount",
]

for feature in historical_features:

    if feature not in df.columns:
        print(f"WARNING: {feature} missing.")
        continue

    negative_count = (df[feature] < 0).sum()

    print(
        f"{feature}: "
        f"min={df[feature].min():.4f}, "
        f"max={df[feature].max():.4f}, "
        f"negative={negative_count:,}"
    )

    if negative_count == 0:
        print("  PASS")


# ---------------------------------------------------------
# 8. Beneficiary sanity check
# ---------------------------------------------------------

print("\n========== 8. BENEFICIARY CHECK ==========")

if "beneficiary_is_new" in df.columns:

    expected = (
        df["historical_sender_receiver_count"] == 0
    ).astype("int8")

    mismatches = (
        df["beneficiary_is_new"] != expected
    ).sum()

    print(f"Beneficiary mismatches: {mismatches:,}")

    if mismatches == 0:
        print("PASS: beneficiary_is_new is consistent.")
    else:
        print("WARNING: beneficiary feature mismatch.")


# ---------------------------------------------------------
# 9. Fraud distribution by historical features
# ---------------------------------------------------------

print("\n========== 9. FRAUD DISTRIBUTION ==========")

for feature in [
    "beneficiary_is_new",
    "sender_zero_after",
    "receiver_zero_after",
]:

    if feature in df.columns:

        print(f"\n{feature}")

        result = (
            df.groupby(feature)[target]
            .agg(
                transactions="count",
                fraud_count="sum",
                fraud_rate="mean"
            )
        )

        result["fraud_rate"] *= 100

        print(result)


# ---------------------------------------------------------
# 10. Final feature list
# ---------------------------------------------------------

print("\n========== 10. FINAL FEATURE LIST ==========")

for i, feature in enumerate(features, start=1):
    print(f"{i:2}. {feature}")


print("\n==========================================")
print("LEAKAGE AUDIT COMPLETED")
print("==========================================")