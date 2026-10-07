from pathlib import Path
import pandas as pd

INPUT_PATH = Path("data/processed/paysim_features.csv")
OUTPUT_DIR = Path("data/processed")

print("Loading processed dataset...")

df = pd.read_csv(INPUT_PATH)

print(f"Total rows: {len(df):,}")
print(f"Step range: {df['step'].min()} -> {df['step'].max()}")

# ---------------------------------------------------------
# Remove useless features discovered during leakage audit
# ---------------------------------------------------------

REMOVE_COLUMNS = [
    "historical_sender_receiver_count",
    "beneficiary_is_new",
]

df = df.drop(columns=REMOVE_COLUMNS)

print("\nRemoved features:")
for column in REMOVE_COLUMNS:
    print(f" - {column}")

# ---------------------------------------------------------
# Temporal split
#
# PaySim:
# step 1 -> 743
#
# 70% -> training
# 15% -> validation
# 15% -> test
# ---------------------------------------------------------

min_step = df["step"].min()
max_step = df["step"].max()

step_range = max_step - min_step

train_end = int(min_step + step_range * 0.70)
validation_end = int(min_step + step_range * 0.85)

print("\n========== TEMPORAL SPLIT ==========")

print(f"Training:   step {min_step} -> {train_end}")
print(f"Validation: step {train_end + 1} -> {validation_end}")
print(f"Test:       step {validation_end + 1} -> {max_step}")

train = df[
    df["step"] <= train_end
].copy()

validation = df[
    (df["step"] > train_end) &
    (df["step"] <= validation_end)
].copy()

test = df[
    df["step"] > validation_end
].copy()

# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

train_path = OUTPUT_DIR / "train.csv"
validation_path = OUTPUT_DIR / "validation.csv"
test_path = OUTPUT_DIR / "test.csv"

print("\nSaving datasets...")

train.to_csv(train_path, index=False)
validation.to_csv(validation_path, index=False)
test.to_csv(test_path, index=False)

# ---------------------------------------------------------
# Dataset statistics
# ---------------------------------------------------------

def print_stats(name, data):

    fraud_count = int(data["isFraud"].sum())
    total = len(data)

    fraud_rate = (
        fraud_count / total * 100
        if total > 0
        else 0
    )

    print(f"\n{name}")
    print("-" * 40)
    print(f"Rows:       {total:,}")
    print(f"Step range: {data['step'].min()} -> {data['step'].max()}")
    print(f"Fraud:      {fraud_count:,}")
    print(f"Normal:     {total - fraud_count:,}")
    print(f"Fraud rate: {fraud_rate:.4f}%")

print_stats("TRAIN", train)
print_stats("VALIDATION", validation)
print_stats("TEST", test)

print("\n========== FINAL CHECK ==========")

if train["step"].max() < validation["step"].min():
    print("PASS: Training occurs before validation.")

if validation["step"].max() < test["step"].min():
    print("PASS: Validation occurs before test.")

if len(train) + len(validation) + len(test) == len(df):
    print("PASS: No rows lost during split.")

print("\nTemporal split completed successfully.")