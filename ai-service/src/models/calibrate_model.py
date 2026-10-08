import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    brier_score_loss,
    log_loss,
)
from sklearn.calibration import calibration_curve


DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"

OUTPUT_DIR = MODEL_DIR / "calibration"

RANDOM_STATE = 42


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
# Preserve temporal order
# ---------------------------------------------------------

# Validation contains steps 521–631.
#
# First 70%:
#     calibration fitting
#
# Last 30%:
#     independent calibration evaluation
#
# This keeps the calibration experiment chronological.

split_index = int(
    len(X_validation) * 0.70
)

X_calibration = X_validation.iloc[
    :split_index
]

y_calibration = y_validation.iloc[
    :split_index
]

X_calibration_eval = X_validation.iloc[
    split_index:
]

y_calibration_eval = y_validation.iloc[
    split_index:
]


print("\n========== CALIBRATION SPLIT ==========")

print(
    f"Calibration rows:       "
    f"{len(X_calibration):,}"
)

print(
    f"Calibration eval rows:  "
    f"{len(X_calibration_eval):,}"
)

print(
    f"Calibration fraud:      "
    f"{int(y_calibration.sum()):,}"
)

print(
    f"Calibration eval fraud: "
    f"{int(y_calibration_eval.sum()):,}"
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
# Generate raw probabilities
# ---------------------------------------------------------

print("Generating raw probabilities...")

calibration_probabilities = model.predict_proba(
    X_calibration
)[:, 1]

evaluation_probabilities = model.predict_proba(
    X_calibration_eval
)[:, 1]


# ---------------------------------------------------------
# Baseline calibration metrics
# ---------------------------------------------------------

raw_brier = brier_score_loss(
    y_calibration_eval,
    evaluation_probabilities
)

raw_log_loss = log_loss(
    y_calibration_eval,
    evaluation_probabilities,
    labels=[0, 1]
)


print("\n========== RAW MODEL ==========")

print(
    f"Brier score: {raw_brier:.8f}"
)

print(
    f"Log loss:    {raw_log_loss:.8f}"
)


# ---------------------------------------------------------
# Fit isotonic calibration
# ---------------------------------------------------------

print("\nFitting isotonic calibration...")

calibrator = IsotonicRegression(
    y_min=0.0,
    y_max=1.0,
    out_of_bounds="clip"
)

calibrator.fit(
    calibration_probabilities,
    y_calibration
)


# ---------------------------------------------------------
# Apply calibration
# ---------------------------------------------------------

calibrated_probabilities = calibrator.predict(
    evaluation_probabilities
)


# ---------------------------------------------------------
# Calibrated metrics
# ---------------------------------------------------------

calibrated_brier = brier_score_loss(
    y_calibration_eval,
    calibrated_probabilities
)

calibrated_log_loss = log_loss(
    y_calibration_eval,
    calibrated_probabilities,
    labels=[0, 1]
)


print("\n========== CALIBRATED MODEL ==========")

print(
    f"Brier score: {calibrated_brier:.8f}"
)

print(
    f"Log loss:    {calibrated_log_loss:.8f}"
)


# ---------------------------------------------------------
# Improvement
# ---------------------------------------------------------

brier_improvement = (
    raw_brier - calibrated_brier
)

log_loss_improvement = (
    raw_log_loss - calibrated_log_loss
)


print("\n========== CALIBRATION IMPROVEMENT ==========")

print(
    f"Brier improvement:   "
    f"{brier_improvement:.8f}"
)

print(
    f"Log-loss improvement:"
    f" {log_loss_improvement:.8f}"
)


# ---------------------------------------------------------
# Calibration curve
# ---------------------------------------------------------

raw_fraction_positive, raw_mean_predicted = calibration_curve(
    y_calibration_eval,
    evaluation_probabilities,
    n_bins=10,
    strategy="quantile"
)

calibrated_fraction_positive, calibrated_mean_predicted = calibration_curve(
    y_calibration_eval,
    calibrated_probabilities,
    n_bins=10,
    strategy="quantile"
)


calibration_curve_df = pd.DataFrame(
    {
        "raw_mean_predicted": pd.Series(
            raw_mean_predicted
        ),
        "raw_fraction_positive": pd.Series(
            raw_fraction_positive
        ),
        "calibrated_mean_predicted": pd.Series(
            calibrated_mean_predicted
        ),
        "calibrated_fraction_positive": pd.Series(
            calibrated_fraction_positive
        ),
    }
)

curve_path = (
    OUTPUT_DIR /
    "calibration_curve.csv"
)

calibration_curve_df.to_csv(
    curve_path,
    index=False
)


# ---------------------------------------------------------
# Save evaluation probabilities
# ---------------------------------------------------------

probability_df = pd.DataFrame(
    {
        "actual": y_calibration_eval.to_numpy(),
        "raw_probability": evaluation_probabilities,
        "calibrated_probability": calibrated_probabilities,
    }
)

probability_path = (
    OUTPUT_DIR /
    "calibration_probabilities.csv"
)

probability_df.to_csv(
    probability_path,
    index=False
)


# ---------------------------------------------------------
# Save calibration metrics
# ---------------------------------------------------------

metrics = {
    "raw": {
        "brier_score": float(raw_brier),
        "log_loss": float(raw_log_loss),
    },
    "calibrated": {
        "brier_score": float(calibrated_brier),
        "log_loss": float(calibrated_log_loss),
    },
    "improvement": {
        "brier_score": float(brier_improvement),
        "log_loss": float(log_loss_improvement),
    },
    "calibration_rows": int(len(X_calibration)),
    "calibration_evaluation_rows": int(
        len(X_calibration_eval)
    ),
    "calibration_fraud": int(
        y_calibration.sum()
    ),
    "calibration_evaluation_fraud": int(
        y_calibration_eval.sum()
    ),
    "method": "isotonic_regression",
    "random_state": RANDOM_STATE,
}

metrics_path = (
    OUTPUT_DIR /
    "calibration_metrics.json"
)

with open(
    metrics_path,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        metrics,
        file,
        indent=4
    )


# ---------------------------------------------------------
# Completed
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("CALIBRATION ANALYSIS COMPLETED")
print("=" * 80)

print(f"Curve:       {curve_path}")
print(f"Probabilities: {probability_path}")
print(f"Metrics:     {metrics_path}")