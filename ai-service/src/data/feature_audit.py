from pathlib import Path
import pandas as pd

DATA_PATH = Path("data/raw/PS_20174392719_1491204439457_log.csv")


def main():
    print("=" * 70)
    print("SAFE PAY AI - FEATURE & LEAKAGE AUDIT")
    print("=" * 70)

    df = pd.read_csv(DATA_PATH)

    # ---------------------------------------------------------
    # 1. Fraud rate by existing flag
    # ---------------------------------------------------------
    print("\n1. isFlaggedFraud ANALYSIS")

    print(
        pd.crosstab(
            df["isFlaggedFraud"],
            df["isFraud"],
            margins=True
        )
    )

    print("\nFraud rate by isFlaggedFraud:")
    print(
        df.groupby("isFlaggedFraud")["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    # ---------------------------------------------------------
    # 2. Fraud by transaction type
    # ---------------------------------------------------------
    print("\n2. FRAUD RATE BY TRANSACTION TYPE")

    fraud_type = (
        df.groupby("type")["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    fraud_type["fraud_rate_percent"] = fraud_type["mean"] * 100

    print(fraud_type)

    # ---------------------------------------------------------
    # 3. Fraud by amount ranges
    # ---------------------------------------------------------
    print("\n3. FRAUD RATE BY AMOUNT RANGE")

    df["amount_bucket"] = pd.qcut(
        df["amount"],
        q=10,
        duplicates="drop"
    )

    amount_analysis = (
        df.groupby("amount_bucket", observed=True)["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    amount_analysis["fraud_rate_percent"] = (
        amount_analysis["mean"] * 100
    )

    print(amount_analysis)

    # ---------------------------------------------------------
    # 4. Balance consistency
    # ---------------------------------------------------------
    print("\n4. BALANCE CONSISTENCY")

    df["sender_balance_change"] = (
        df["oldbalanceOrg"] - df["newbalanceOrig"]
    )

    df["receiver_balance_change"] = (
        df["newbalanceDest"] - df["oldbalanceDest"]
    )

    df["sender_balance_difference"] = (
        df["sender_balance_change"] - df["amount"]
    )

    df["receiver_balance_difference"] = (
        df["receiver_balance_change"] - df["amount"]
    )

    print("\nSender balance difference:")
    print(
        df.groupby("isFraud")["sender_balance_difference"]
        .agg(["mean", "median", "std", "min", "max"])
    )

    print("\nReceiver balance difference:")
    print(
        df.groupby("isFraud")["receiver_balance_difference"]
        .agg(["mean", "median", "std", "min", "max"])
    )

    # ---------------------------------------------------------
    # 5. Zero-balance patterns
    # ---------------------------------------------------------
    print("\n5. ZERO BALANCE PATTERNS")

    df["sender_zero_after"] = (
        df["newbalanceOrig"] == 0
    ).astype(int)

    df["receiver_zero_after"] = (
        df["newbalanceDest"] == 0
    ).astype(int)

    print("\nFraud rate when sender balance becomes zero:")
    print(
        df.groupby("sender_zero_after")["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    print("\nFraud rate when receiver balance becomes zero:")
    print(
        df.groupby("receiver_zero_after")["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    # ---------------------------------------------------------
    # 6. Fraud over time
    # ---------------------------------------------------------
    print("\n6. FRAUD RATE OVER TIME")

    time_analysis = (
        df.groupby("step")["isFraud"]
        .agg(["count", "sum", "mean"])
    )

    time_analysis["fraud_rate_percent"] = (
        time_analysis["mean"] * 100
    )

    print("\nHighest fraud-rate time steps:")
    print(
        time_analysis
        .sort_values("fraud_rate_percent", ascending=False)
        .head(15)
    )

    # ---------------------------------------------------------
    # 7. Fraud transaction amounts
    # ---------------------------------------------------------
    print("\n7. FRAUD TRANSACTION AMOUNT STATISTICS")

    print(
        df[df["isFraud"] == 1]["amount"]
        .describe()
    )

    # ---------------------------------------------------------
    # 8. Fraud sender/receiver behavior
    # ---------------------------------------------------------
    print("\n8. SENDER / RECEIVER FREQUENCY")

    sender_counts = df["nameOrig"].value_counts()

    receiver_counts = df["nameDest"].value_counts()

    df["sender_transaction_count"] = (
        df["nameOrig"].map(sender_counts)
    )

    df["receiver_transaction_count"] = (
        df["nameDest"].map(receiver_counts)
    )

    print("\nSender transaction count:")
    print(
        df.groupby("isFraud")["sender_transaction_count"]
        .agg(["mean", "median", "min", "max"])
    )

    print("\nReceiver transaction count:")
    print(
        df.groupby("isFraud")["receiver_transaction_count"]
        .agg(["mean", "median", "min", "max"])
    )

    # ---------------------------------------------------------
    # 9. Candidate feature correlation
    # ---------------------------------------------------------
    print("\n9. NUMERIC FEATURE CORRELATION WITH FRAUD")

    numeric_features = [
        "step",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "isFlaggedFraud",
        "sender_balance_change",
        "receiver_balance_change",
        "sender_balance_difference",
        "receiver_balance_difference",
        "sender_transaction_count",
        "receiver_transaction_count",
    ]

    print(
        df[numeric_features + ["isFraud"]]
        .corr(numeric_only=True)["isFraud"]
        .sort_values(ascending=False)
    )

    print("\n" + "=" * 70)
    print("FEATURE AUDIT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()