from pathlib import Path
import pandas as pd

DATA_PATH = Path("data/raw/PS_20174392719_1491204439457_log.csv")


def main():
    print("=" * 70)
    print("SAFE PAY AI - DATASET INSPECTION")
    print("=" * 70)

    # Load dataset
    df = pd.read_csv(DATA_PATH)

    print("\n1. DATASET SHAPE")
    print(f"Rows    : {len(df):,}")
    print(f"Columns : {len(df.columns)}")

    print("\n2. COLUMNS")
    for i, column in enumerate(df.columns, start=1):
        print(f"{i:2}. {column}")

    print("\n3. DATA TYPES")
    print(df.dtypes)

    print("\n4. MISSING VALUES")
    missing = df.isnull().sum()
    print(missing[missing > 0])

    if missing.sum() == 0:
        print("No missing values.")

    print("\n5. DUPLICATE ROWS")
    print(f"Duplicates: {df.duplicated().sum():,}")

    print("\n6. FRAUD DISTRIBUTION")
    fraud_counts = df["isFraud"].value_counts()
    print(fraud_counts)

    fraud_percentage = df["isFraud"].mean() * 100
    print(f"\nFraud percentage: {fraud_percentage:.4f}%")

    print("\n7. FRAUD BY TRANSACTION TYPE")
    fraud_by_type = (
        df.groupby("type")["isFraud"]
        .agg(["count", "sum", "mean"])
        .sort_values("sum", ascending=False)
    )

    fraud_by_type["fraud_percentage"] = fraud_by_type["mean"] * 100
    print(fraud_by_type)

    print("\n8. TIME RANGE")
    print(f"Minimum step: {df['step'].min()}")
    print(f"Maximum step: {df['step'].max()}")
    print(f"Unique steps: {df['step'].nunique():,}")

    print("\n9. UNIQUE ENTITIES")
    print(f"Unique senders  : {df['nameOrig'].nunique():,}")
    print(f"Unique receivers: {df['nameDest'].nunique():,}")

    print("\n10. FRAUD BY TRANSACTION TYPE")
    for transaction_type in df["type"].unique():
        subset = df[df["type"] == transaction_type]

        print(
            f"{transaction_type:10} | "
            f"transactions={len(subset):,} | "
            f"fraud={subset['isFraud'].sum():,}"
        )

    print("\n11. NUMERIC SUMMARY")
    print(
        df[
            [
                "amount",
                "oldbalanceOrg",
                "newbalanceOrig",
                "oldbalanceDest",
                "newbalanceDest",
            ]
        ].describe()
    )

    print("\n12. SAMPLE TRANSACTIONS")
    print(df.head(5).to_string())

    print("\n" + "=" * 70)
    print("INSPECTION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()