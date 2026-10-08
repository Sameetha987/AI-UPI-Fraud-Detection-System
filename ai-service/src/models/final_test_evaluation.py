import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

TEST_PATH = DATA_DIR / "test.csv"
MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"

OUTPUT_DIR = MODEL_DIR / "final_evaluation"

THRESHOLD = 0.01


# ---------------------------------------------------------
# Prepare output directory
# ---------------------------------------------------------

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ---------------------------------------------------------
# Load model metadata
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
# Load untouched test set
# ---------------------------------------------------------

print("Loading untouched test dataset...")

test = pd.read_csv(
    TEST_PATH
)

TARGET = "isFraud"

X_test = test.drop(
    columns=[TARGET]
)

y_test = test[TARGET]


# ---------------------------------------------------------
# Encode transaction type
# ---------------------------------------------------------

X_test = pd.get_dummies(
    X_test,
    columns=["type"],
    dtype=np.int8
)

X_test = X_test.reindex(
    columns=expected_features,
    fill_value=0
)


print(f"Test rows: {len(X_test):,}")
print(f"Features:  {X_test.shape[1]}")
print(f"Fraud:     {int(y_test.sum()):,}")
print(
    f"Normal:    "
    f"{int((y_test == 0).sum()):,}"
)


# ---------------------------------------------------------
# Load candidate model
# ---------------------------------------------------------

print("\nLoading candidate XGBoost model...")

model = xgb.XGBClassifier()

model.load_model(
    MODEL_PATH
)


# ---------------------------------------------------------
# Generate predictions
# ---------------------------------------------------------

print("Generating test predictions...")

probabilities = model.predict_proba(
    X_test
)[:, 1]

predictions = (
    probabilities >= THRESHOLD
).astype(int)


# ---------------------------------------------------------
# Ranking metrics
# ---------------------------------------------------------

pr_auc = average_precision_score(
    y_test,
    probabilities
)

roc_auc = roc_auc_score(
    y_test,
    probabilities
)


# ---------------------------------------------------------
# Classification metrics
# ---------------------------------------------------------

precision = precision_score(
    y_test,
    predictions,
    zero_division=0
)

recall = recall_score(
    y_test,
    predictions,
    zero_division=0
)

f1 = f1_score(
    y_test,
    predictions,
    zero_division=0
)


# ---------------------------------------------------------
# Confusion matrix
# ---------------------------------------------------------

tn, fp, fn, tp = confusion_matrix(
    y_test,
    predictions,
    labels=[0, 1]
).ravel()


false_positive_rate = (
    fp / (fp + tn)
)

false_negative_rate = (
    fn / (fn + tp)
)

alert_rate = (
    (fp + tp)
    / len(y_test)
)

fraud_capture_rate = recall


# ---------------------------------------------------------
# Print final results
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("FINAL UNTOUCHED TEST EVALUATION")
print("=" * 80)

print(f"Threshold:            {THRESHOLD:.4f}")

print("\nRanking metrics")
print("----------------")
print(f"PR-AUC:               {pr_auc:.6f}")
print(f"ROC-AUC:              {roc_auc:.6f}")

print("\nClassification metrics")
print("-----------------------")
print(f"Precision:            {precision:.6f}")
print(f"Recall:               {recall:.6f}")
print(f"F1:                   {f1:.6f}")

print("\nConfusion matrix")
print("----------------")
print(f"True Negatives:       {tn:,}")
print(f"False Positives:      {fp:,}")
print(f"False Negatives:      {fn:,}")
print(f"True Positives:       {tp:,}")

print("\nOperational metrics")
print("-------------------")
print(f"False Positive Rate:  {false_positive_rate:.8f}")
print(f"False Negative Rate:  {false_negative_rate:.8f}")
print(f"Fraud Capture Rate:   {fraud_capture_rate:.6f}")
print(f"Alert Rate:           {alert_rate:.6f}")


# ---------------------------------------------------------
# Classification report
# ---------------------------------------------------------

print("\nClassification report")
print("---------------------")

print(
    classification_report(
        y_test,
        predictions,
        target_names=[
            "Normal",
            "Fraud"
        ],
        digits=6,
        zero_division=0
    )
)


# ---------------------------------------------------------
# Save final metrics
# ---------------------------------------------------------

results = {
    "model": str(MODEL_PATH),
    "dataset": str(TEST_PATH),
    "dataset_type": "untouched_future_test_period",

    "threshold": THRESHOLD,

    "sample_count": int(len(y_test)),
    "fraud_count": int(y_test.sum()),
    "normal_count": int((y_test == 0).sum()),

    "metrics": {
        "pr_auc": float(pr_auc),
        "roc_auc": float(roc_auc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
    },

    "confusion_matrix": {
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
    },

    "operational_metrics": {
        "false_positive_rate": float(
            false_positive_rate
        ),
        "false_negative_rate": float(
            false_negative_rate
        ),
        "fraud_capture_rate": float(
            fraud_capture_rate
        ),
        "alert_rate": float(
            alert_rate
        ),
    },

    "test_policy": (
        "The test dataset was not used for "
        "model training, hyperparameter tuning, "
        "threshold selection, or calibration."
    ),
}


results_path = (
    OUTPUT_DIR /
    "final_test_metrics.json"
)

with open(
    results_path,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        results,
        file,
        indent=4
    )


print("\n")
print("=" * 80)
print("FINAL TEST EVALUATION COMPLETED")
print("=" * 80)

print(
    f"Results: {results_path}"
)