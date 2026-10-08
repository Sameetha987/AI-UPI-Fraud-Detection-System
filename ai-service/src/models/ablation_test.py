from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
)

DATA_DIR = Path("data/processed")

TRAIN_PATH = DATA_DIR / "train.csv"
VALIDATION_PATH = DATA_DIR / "validation.csv"

print("Loading datasets...")

train = pd.read_csv(TRAIN_PATH)
validation = pd.read_csv(VALIDATION_PATH)

TARGET = "isFraud"

# ---------------------------------------------------------
# Feature groups
# ---------------------------------------------------------

SENDER_BALANCE_FEATURES = [
    "sender_balance_change",
    "sender_balance_difference",
    "sender_balance_consistency",
    "sender_zero_after",
]

ALL_BALANCE_FEATURES = [
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

    "sender_zero_after",
    "receiver_zero_after",
]

# ---------------------------------------------------------
# Prepare data
# ---------------------------------------------------------

X_train_full = train.drop(columns=[TARGET])
y_train = train[TARGET]

X_validation_full = validation.drop(columns=[TARGET])
y_validation = validation[TARGET]

# One-hot encode transaction type
X_train_full = pd.get_dummies(
    X_train_full,
    columns=["type"],
    dtype=np.int8
)

X_validation_full = pd.get_dummies(
    X_validation_full,
    columns=["type"],
    dtype=np.int8
)

X_validation_full = X_validation_full.reindex(
    columns=X_train_full.columns,
    fill_value=0
)

# ---------------------------------------------------------
# Class imbalance
# ---------------------------------------------------------

fraud_count = int(y_train.sum())
normal_count = int((y_train == 0).sum())

scale_pos_weight = normal_count / fraud_count

print("\nClass imbalance:")
print(f"Normal: {normal_count:,}")
print(f"Fraud:  {fraud_count:,}")
print(f"Weight: {scale_pos_weight:.2f}")


# ---------------------------------------------------------
# Training function
# ---------------------------------------------------------

def run_experiment(name, remove_features):

    print("\n" + "=" * 60)
    print(f"EXPERIMENT: {name}")
    print("=" * 60)

    available_remove = [
        feature
        for feature in remove_features
        if feature in X_train_full.columns
    ]

    print("\nRemoved features:")

    if available_remove:
        for feature in available_remove:
            print(f" - {feature}")
    else:
        print(" - None")

    X_train = X_train_full.drop(
        columns=available_remove
    )

    X_validation = X_validation_full.drop(
        columns=available_remove
    )

    print(
        f"\nRemaining features: "
        f"{X_train.shape[1]}"
    )

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,

        objective="binary:logistic",
        eval_metric="aucpr",

        scale_pos_weight=scale_pos_weight,

        tree_method="hist",
        n_jobs=-1,

        random_state=42,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[
            (X_validation, y_validation)
        ],
        verbose=False,
    )

    probabilities = model.predict_proba(
        X_validation
    )[:, 1]

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    pr_auc = average_precision_score(
        y_validation,
        probabilities
    )

    roc_auc = roc_auc_score(
        y_validation,
        probabilities
    )

    precision = precision_score(
        y_validation,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_validation,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_validation,
        predictions,
        zero_division=0
    )

    print("\nResults:")
    print(f"ROC-AUC : {roc_auc:.6f}")
    print(f"PR-AUC  : {pr_auc:.6f}")
    print(f"Precision: {precision:.6f}")
    print(f"Recall   : {recall:.6f}")
    print(f"F1       : {f1:.6f}")

    return {
        "experiment": name,
        "features": X_train.shape[1],
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


# ---------------------------------------------------------
# Experiments
# ---------------------------------------------------------

results = []

# A: Current model
results.append(
    run_experiment(
        "A - All features",
        []
    )
)

# B: Remove sender balance-derived features
results.append(
    run_experiment(
        "B - Remove sender-derived balance features",
        SENDER_BALANCE_FEATURES
    )
)

# C: Remove all balance-related features
results.append(
    run_experiment(
        "C - Remove all balance features",
        ALL_BALANCE_FEATURES
    )
)


# ---------------------------------------------------------
# Comparison
# ---------------------------------------------------------

results_df = pd.DataFrame(results)

print("\n")
print("=" * 75)
print("ABLATION COMPARISON")
print("=" * 75)

print(
    results_df.to_string(
        index=False,
        formatters={
            "roc_auc": "{:.6f}".format,
            "pr_auc": "{:.6f}".format,
            "precision": "{:.6f}".format,
            "recall": "{:.6f}".format,
            "f1": "{:.6f}".format,
        }
    )
)

print("\nAblation study completed.")