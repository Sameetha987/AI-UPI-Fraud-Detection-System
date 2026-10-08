import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"

OUTPUT_DIR = MODEL_DIR / "decision_policy"

RANDOM_STATE = 42


# ---------------------------------------------------------
# Prepare output directory
# ---------------------------------------------------------

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ---------------------------------------------------------
# Load metadata
# ---------------------------------------------------------

print("Loading model metadata...")

with open(
    METADATA_PATH,
    "r",
    encoding="utf-8"
) as file:
    metadata = json.load(file)

expected_features = metadata["features"]


# ---------------------------------------------------------
# Load validation data
# ---------------------------------------------------------

print("Loading validation dataset...")

validation = pd.read_csv(
    VALIDATION_PATH
)

TARGET = "isFraud"

X_validation = validation.drop(
    columns=[TARGET]
)

y_validation = validation[TARGET]


# ---------------------------------------------------------
# Encode transaction type
# ---------------------------------------------------------

X_validation = pd.get_dummies(
    X_validation,
    columns=["type"],
    dtype=np.int8
)

X_validation = X_validation.reindex(
    columns=expected_features,
    fill_value=0
)


print(f"Validation rows: {len(X_validation):,}")
print(f"Features:        {X_validation.shape[1]}")


# ---------------------------------------------------------
# Load candidate model
# ---------------------------------------------------------

print("\nLoading candidate XGBoost model...")

model = xgb.XGBClassifier()

model.load_model(
    MODEL_PATH
)


# ---------------------------------------------------------
# Generate probabilities
# ---------------------------------------------------------

print("Generating fraud probabilities...")

probabilities = model.predict_proba(
    X_validation
)[:, 1]


# ---------------------------------------------------------
# Overall ranking metrics
# ---------------------------------------------------------

pr_auc = average_precision_score(
    y_validation,
    probabilities
)

roc_auc = roc_auc_score(
    y_validation,
    probabilities
)

print("\n========== RANKING PERFORMANCE ==========")

print(f"PR-AUC:  {pr_auc:.6f}")
print(f"ROC-AUC: {roc_auc:.6f}")


# ---------------------------------------------------------
# Probability distribution
# ---------------------------------------------------------

normal_probabilities = probabilities[
    y_validation.to_numpy() == 0
]

fraud_probabilities = probabilities[
    y_validation.to_numpy() == 1
]


def print_distribution(
    name,
    values
):
    print(f"\n{name}")

    print(f"Count:  {len(values):,}")
    print(f"Min:    {np.min(values):.12f}")
    print(f"25%:    {np.percentile(values, 25):.12f}")
    print(f"Median: {np.median(values):.12f}")
    print(f"75%:    {np.percentile(values, 75):.12f}")
    print(f"Max:    {np.max(values):.12f}")


print("\n========== SCORE DISTRIBUTION ==========")

print_distribution(
    "NORMAL TRANSACTIONS",
    normal_probabilities
)

print_distribution(
    "FRAUD TRANSACTIONS",
    fraud_probabilities
)


# ---------------------------------------------------------
# Threshold evaluation
# ---------------------------------------------------------

thresholds = [
    0.001,
    0.005,
    0.01,
    0.02,
    0.05,
    0.10,
    0.20,
    0.30,
    0.40,
    0.50,
    0.60,
    0.70,
    0.80,
    0.90,
    0.95,
    0.99,
]


threshold_results = []


for threshold in thresholds:

    predictions = (
        probabilities >= threshold
    ).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y_validation,
        predictions,
        labels=[0, 1]
    ).ravel()

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

    alert_rate = (
        (fp + tp)
        / len(y_validation)
    )

    false_positive_rate = (
        fp
        / (fp + tn)
    )

    false_negative_rate = (
        fn
        / (fn + tp)
    )

    fraud_capture_rate = recall

    threshold_results.append(
        {
            "threshold": threshold,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "alert_rate": alert_rate,
            "false_positive_rate": false_positive_rate,
            "false_negative_rate": false_negative_rate,
            "fraud_capture_rate": fraud_capture_rate,
        }
    )


threshold_df = pd.DataFrame(
    threshold_results
)


# ---------------------------------------------------------
# Print threshold results
# ---------------------------------------------------------

print("\n")
print("=" * 110)
print("THRESHOLD ANALYSIS")
print("=" * 110)

print(
    threshold_df.to_string(
        index=False,
        formatters={
            "threshold": "{:.3f}".format,
            "precision": "{:.6f}".format,
            "recall": "{:.6f}".format,
            "f1": "{:.6f}".format,
            "alert_rate": "{:.6f}".format,
            "false_positive_rate": "{:.8f}".format,
            "false_negative_rate": "{:.8f}".format,
            "fraud_capture_rate": "{:.6f}".format,
        }
    )
)


# ---------------------------------------------------------
# Recommended policy candidates
# ---------------------------------------------------------

# Candidate 1:
# Maximum F1.
best_f1_row = threshold_df.loc[
    threshold_df["f1"].idxmax()
]


# Candidate 2:
# Highest threshold that still captures
# at least 99% of validation fraud.
high_recall_candidates = threshold_df[
    threshold_df["recall"] >= 0.99
]

if not high_recall_candidates.empty:

    conservative_row = (
        high_recall_candidates
        .sort_values(
            "threshold",
            ascending=False
        )
        .iloc[0]
    )

else:

    conservative_row = None


print("\n")
print("=" * 80)
print("POLICY CANDIDATES")
print("=" * 80)

print("\nMaximum-F1 threshold:")
print(
    best_f1_row.to_string()
)

if conservative_row is not None:

    print(
        "\nHighest threshold with "
        ">=99% fraud recall:"
    )

    print(
        conservative_row.to_string()
    )


# ---------------------------------------------------------
# Save threshold analysis
# ---------------------------------------------------------

threshold_path = (
    OUTPUT_DIR /
    "threshold_analysis.csv"
)

threshold_df.to_csv(
    threshold_path,
    index=False
)


# ---------------------------------------------------------
# Save policy analysis
# ---------------------------------------------------------

policy = {
    "model": str(MODEL_PATH),

    "validation_metrics": {
        "pr_auc": float(pr_auc),
        "roc_auc": float(roc_auc),
    },

    "max_f1_candidate": {
        key: (
            float(value)
            if isinstance(value, (np.floating, float))
            else int(value)
            if isinstance(value, (np.integer, int))
            else value
        )
        for key, value in best_f1_row.to_dict().items()
    },

    "high_recall_candidate": (
        {
            key: (
                float(value)
                if isinstance(value, (np.floating, float))
                else int(value)
                if isinstance(value, (np.integer, int))
                else value
            )
            for key, value in conservative_row.to_dict().items()
        }
        if conservative_row is not None
        else None
    ),

    "note": (
        "Thresholds are evaluated on the validation period only. "
        "The final test period remains untouched."
    ),
}


policy_path = (
    OUTPUT_DIR /
    "decision_policy_analysis.json"
)

with open(
    policy_path,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        policy,
        file,
        indent=4
    )


# ---------------------------------------------------------
# Completed
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("DECISION POLICY ANALYSIS COMPLETED")
print("=" * 80)

print(f"Thresholds: {threshold_path}")
print(f"Policy:     {policy_path}")