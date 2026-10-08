from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "baseline_xgboost.json"

print("Loading validation data...")

validation = pd.read_csv(VALIDATION_PATH)

TARGET = "isFraud"

X_validation = validation.drop(columns=[TARGET])
y_validation = validation[TARGET]

# Same encoding used during training
X_validation = pd.get_dummies(
    X_validation,
    columns=["type"],
    dtype=np.int8
)

print("Loading XGBoost model...")

model = xgb.XGBClassifier()
model.load_model(MODEL_PATH)

# ---------------------------------------------------------
# Generate probabilities
# ---------------------------------------------------------

probabilities = model.predict_proba(
    X_validation
)[:, 1]

y_true = y_validation.to_numpy()

pr_auc = average_precision_score(
    y_true,
    probabilities
)

print("\n========== MODEL ==========")
print(f"Validation PR-AUC: {pr_auc:.6f}")

# ---------------------------------------------------------
# Threshold analysis
# ---------------------------------------------------------

print("\n========== THRESHOLD ANALYSIS ==========")

thresholds = np.arange(
    0.01,
    1.00,
    0.01
)

results = []

for threshold in thresholds:

    predictions = (
        probabilities >= threshold
    ).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y_true,
        predictions,
        labels=[0, 1]
    ).ravel()

    precision = precision_score(
        y_true,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_true,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_true,
        predictions,
        zero_division=0
    )

    false_positive_rate = (
        fp / (fp + tn)
        if (fp + tn) > 0
        else 0
    )

    results.append({
        "threshold": threshold,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn,
        "alerts": tp + fp,
        "false_positive_rate": false_positive_rate,
    })

results_df = pd.DataFrame(results)

# ---------------------------------------------------------
# Best F1 threshold
# ---------------------------------------------------------

best_f1 = results_df.loc[
    results_df["f1"].idxmax()
]

print("\n========== BEST F1 THRESHOLD ==========")

print(
    best_f1.to_string()
)

# ---------------------------------------------------------
# High-recall threshold
# ---------------------------------------------------------

high_recall_candidates = results_df[
    results_df["recall"] >= 0.995
]

if not high_recall_candidates.empty:

    best_high_recall = (
        high_recall_candidates
        .sort_values(
            ["precision", "recall"],
            ascending=False
        )
        .iloc[0]
    )

    print("\n========== HIGH-RECALL THRESHOLD ==========")

    print(
        best_high_recall.to_string()
    )

# ---------------------------------------------------------
# High-precision threshold
# ---------------------------------------------------------

high_precision_candidates = results_df[
    results_df["precision"] >= 0.99
]

if not high_precision_candidates.empty:

    best_high_precision = (
        high_precision_candidates
        .sort_values(
            ["recall", "precision"],
            ascending=False
        )
        .iloc[0]
    )

    print("\n========== HIGH-PRECISION THRESHOLD ==========")

    print(
        best_high_precision.to_string()
    )

# ---------------------------------------------------------
# Selected operating points
# ---------------------------------------------------------

print("\n========== SELECTED OPERATING POINTS ==========")

selected_thresholds = [
    0.01,
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

selected = results_df[
    results_df["threshold"].round(2).isin(
        selected_thresholds
    )
]

print(
    selected[
        [
            "threshold",
            "precision",
            "recall",
            "f1",
            "alerts",
            "false_positives",
            "false_negatives",
        ]
    ].to_string(index=False)
)

# ---------------------------------------------------------
# Save threshold results
# ---------------------------------------------------------

output_path = (
    MODEL_DIR / "threshold_analysis.csv"
)

results_df.to_csv(
    output_path,
    index=False
)

print(
    f"\nThreshold analysis saved to: "
    f"{output_path}"
)

print("\nThreshold optimization completed.")