from pathlib import Path
import numpy as np
import pandas as pd

INPUT_PATH = Path("data/raw/PS_20174392719_1491204439457_log.csv")
OUTPUT_PATH = Path("data/processed/paysim_features.csv")

print("Loading dataset...")

df = pd.read_csv(
    INPUT_PATH,
    usecols=[
        "step",
        "type",
        "amount",
        "nameOrig",
        "oldbalanceOrg",
        "newbalanceOrig",
        "nameDest",
        "oldbalanceDest",
        "newbalanceDest",
        "isFraud",
    ]
)

print(f"Loaded {len(df):,} rows")

# PaySim is already ordered by time.
# Only sort if necessary.
if not df["step"].is_monotonic_increasing:
    print("Sorting by step...")
    df = df.sort_values("step", kind="stable").reset_index(drop=True)

print("Building features...")

# ---------------------------------------------------------
# 1. Basic transaction features
# ---------------------------------------------------------

df["transaction_hour"] = df["step"] % 24
df["transaction_day"] = df["step"] // 24

# ---------------------------------------------------------
# 2. Balance features
# ---------------------------------------------------------

df["sender_balance_change"] = (
    df["oldbalanceOrg"] - df["newbalanceOrig"]
)

df["receiver_balance_change"] = (
    df["newbalanceDest"] - df["oldbalanceDest"]
)

df["sender_balance_difference"] = (
    df["oldbalanceOrg"] - df["amount"] - df["newbalanceOrig"]
)

df["receiver_balance_difference"] = (
    df["oldbalanceDest"] + df["amount"] - df["newbalanceDest"]
)

df["sender_balance_consistency"] = (
    df["sender_balance_difference"].abs()
)

df["receiver_balance_consistency"] = (
    df["receiver_balance_difference"].abs()
)

# ---------------------------------------------------------
# 3. Amount-related features
# ---------------------------------------------------------

df["amount_to_sender_balance_ratio"] = np.where(
    df["oldbalanceOrg"] > 0,
    df["amount"] / df["oldbalanceOrg"],
    0
)

df["sender_zero_after"] = (
    df["newbalanceOrig"] == 0
).astype("int8")

df["receiver_zero_after"] = (
    df["newbalanceDest"] == 0
).astype("int8")

# ---------------------------------------------------------
# 4. Historical sender count
#    IMPORTANT:
#    Only transactions from PREVIOUS steps are counted.
# ---------------------------------------------------------

print("Calculating historical sender counts...")

sender_total_before = (
    df.groupby("nameOrig", sort=False)
      .cumcount()
)

sender_same_step_before = (
    df.groupby(["nameOrig", "step"], sort=False)
      .cumcount()
)

df["historical_sender_transaction_count"] = (
    sender_total_before - sender_same_step_before
)

# ---------------------------------------------------------
# 5. Historical receiver count
# ---------------------------------------------------------

print("Calculating historical receiver counts...")

receiver_total_before = (
    df.groupby("nameDest", sort=False)
      .cumcount()
)

receiver_same_step_before = (
    df.groupby(["nameDest", "step"], sort=False)
      .cumcount()
)

df["historical_receiver_transaction_count"] = (
    receiver_total_before - receiver_same_step_before
)

# ---------------------------------------------------------
# 6. Historical sender -> receiver relationship count
# ---------------------------------------------------------

print("Calculating historical sender-receiver counts...")

pair_total_before = (
    df.groupby(["nameOrig", "nameDest"], sort=False)
      .cumcount()
)

pair_same_step_before = (
    df.groupby(
        ["nameOrig", "nameDest", "step"],
        sort=False
    ).cumcount()
)

df["historical_sender_receiver_count"] = (
    pair_total_before - pair_same_step_before
)

df["beneficiary_is_new"] = (
    df["historical_sender_receiver_count"] == 0
).astype("int8")

# ---------------------------------------------------------
# 7. Historical average transaction amount for sender
# ---------------------------------------------------------

print("Calculating historical sender amount statistics...")

sender_cumsum = (
    df.groupby("nameOrig", sort=False)["amount"]
      .cumsum()
)

sender_step_cumsum = (
    df.groupby(
        ["nameOrig", "step"],
        sort=False
    )["amount"].cumsum()
)

# Remove current transaction
sender_previous_sum = sender_cumsum - df["amount"]

# Remove transactions from the current step
sender_current_step_previous_sum = (
    sender_step_cumsum - df["amount"]
)

historical_sender_amount_sum = (
    sender_previous_sum -
    sender_current_step_previous_sum
)

sender_history_count = (
    df["historical_sender_transaction_count"]
)

df["historical_sender_average_amount"] = np.divide(
    historical_sender_amount_sum,
    sender_history_count,
    out=np.zeros(len(df), dtype=np.float64),
    where=sender_history_count > 0
)

# ---------------------------------------------------------
# 8. Transaction amount deviation from sender history
# ---------------------------------------------------------

df["amount_vs_sender_history"] = np.where(
    df["historical_sender_average_amount"] > 0,
    df["amount"] /
    df["historical_sender_average_amount"],
    0
)

# ---------------------------------------------------------
# 9. Select model features
# ---------------------------------------------------------

feature_columns = [
    "step",
    "transaction_hour",
    "transaction_day",
    "type",

    "amount",

    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",

    "sender_balance_change",
    "receiver_balance_change",

    "sender_balance_difference",
    "receiver_balance_difference",

    "sender_balance_consistency",
    "receiver_balance_consistency",

    "amount_to_sender_balance_ratio",

    "sender_zero_after",
    "receiver_zero_after",

    "historical_sender_transaction_count",
    "historical_receiver_transaction_count",

    "historical_sender_receiver_count",
    "beneficiary_is_new",

    "historical_sender_average_amount",
    "amount_vs_sender_history",

    "isFraud",
]

output = df[feature_columns].copy()

# ---------------------------------------------------------
# 10. Memory reduction
# ---------------------------------------------------------

float_columns = output.select_dtypes(
    include=["float64"]
).columns

output[float_columns] = output[float_columns].astype("float32")

integer_columns = output.select_dtypes(
    include=["int64"]
).columns

for column in integer_columns:
    if column != "step":
        output[column] = output[column].astype("int32")

# ---------------------------------------------------------
# 11. Save
# ---------------------------------------------------------

OUTPUT_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

print("Saving processed dataset...")

output.to_csv(
    OUTPUT_PATH,
    index=False
)

print("\nFeature engineering completed.")
print(f"Output: {OUTPUT_PATH}")
print(f"Rows: {len(output):,}")
print(f"Columns: {len(output.columns)}")

print("\nFraud distribution:")
print(output["isFraud"].value_counts())

print("\nFeatures:")
for column in output.columns:
    print(f" - {column}")