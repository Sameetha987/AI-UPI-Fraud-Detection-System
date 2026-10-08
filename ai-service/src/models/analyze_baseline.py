from pathlib import Path

import pandas as pd
import numpy as np
import xgboost as xgb

DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "baseline_xgboost.json"

print("Loading validation data...")

validation = pd.read_csv(VALIDATION_PATH)

TARGET = "isFraud"

X_validation = validation.drop(columns=[TARGET])

# Same encoding used during training
X_validation = pd.get_dummies(
    X_validation,
    columns=["type"],
    dtype=np.int8
)

print("Loading model...")

model = xgb.XGBClassifier()
model.load_model(MODEL_PATH)

# ---------------------------------------------------------
# Feature importance
# ---------------------------------------------------------

print("\n========== FEATURE IMPORTANCE ==========")

importance = pd.DataFrame({
    "feature": X_validation.columns,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

importance["percentage"] = (
    importance["importance"] /
    importance["importance"].sum()
) * 100

print(
    importance.to_string(
        index=False,
        formatters={
            "importance": "{:.6f}".format,
            "percentage": "{:.2f}%".format,
        }
    )
)

# ---------------------------------------------------------
# Top features
# ---------------------------------------------------------

print("\n========== TOP 10 FEATURES ==========")

for i, row in importance.head(10).iterrows():
    print(
        f"{row['feature']}: "
        f"{row['percentage']:.2f}%"
    )

# ---------------------------------------------------------
# Prediction distribution
# ---------------------------------------------------------

print("\n========== PREDICTION DISTRIBUTION ==========")

probabilities = model.predict_proba(
    X_validation
)[:, 1]

print(f"Minimum probability: {probabilities.min():.8f}")
print(f"Maximum probability: {probabilities.max():.8f}")

percentiles = np.percentile(
    probabilities,
    [50, 90, 95, 99, 99.9, 99.99]
)

for percentile, value in zip(
    [50, 90, 95, 99, 99.9, 99.99],
    percentiles
):
    print(
        f"{percentile:>6}% percentile: "
        f"{value:.8f}"
    )

# ---------------------------------------------------------
# Fraud vs normal probability
# ---------------------------------------------------------

validation["risk_score"] = probabilities

print("\n========== RISK SCORE BY CLASS ==========")

print(
    validation
    .groupby(TARGET)["risk_score"]
    .agg([
        "count",
        "min",
        "mean",
        "median",
        "max"
    ])
)

# ---------------------------------------------------------
# Threshold analysis
# ---------------------------------------------------------

print("\n========== THRESHOLD ANALYSIS ==========")

thresholds = [
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
]

y_true = validation[TARGET].to_numpy()

for threshold in thresholds:

    predictions = (
        probabilities >= threshold
    ).astype(int)

    tp = np.sum(
        (predictions == 1) &
        (y_true == 1)
    )

    fp = np.sum(
        (predictions == 1) &
        (y_true == 0)
    )

    fn = np.sum(
        (predictions == 0) &
        (y_true == 1)
    )

    precision = (
        tp / (tp + fp)
        if (tp + fp) > 0
        else 0
    )

    recall = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else 0
    )

    f1 = (
        2 * precision * recall /
        (precision + recall)
        if (precision + recall) > 0
        else 0
    )

    print(
        f"Threshold={threshold:.2f} | "
        f"Precision={precision:.4f} | "
        f"Recall={recall:.4f} | "
        f"F1={f1:.4f} | "
        f"Alerts={predictions.sum():,}"
    )

print("\nBaseline diagnosis completed.")