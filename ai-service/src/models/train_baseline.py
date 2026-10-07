from pathlib import Path
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    average_precision_score,
    roc_auc_score,
)

DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

TRAIN_PATH = DATA_DIR / "train.csv"
VALIDATION_PATH = DATA_DIR / "validation.csv"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("Loading training data...")

train = pd.read_csv(TRAIN_PATH)
validation = pd.read_csv(VALIDATION_PATH)

print(f"Training rows:   {len(train):,}")
print(f"Validation rows: {len(validation):,}")

# ---------------------------------------------------------
# Separate target
# ---------------------------------------------------------

TARGET = "isFraud"

X_train = train.drop(columns=[TARGET])
y_train = train[TARGET]

X_validation = validation.drop(columns=[TARGET])
y_validation = validation[TARGET]

# ---------------------------------------------------------
# Convert transaction type to numeric
# ---------------------------------------------------------

# XGBoost needs numerical input.
# One-hot encode transaction type.
X_train = pd.get_dummies(
    X_train,
    columns=["type"],
    dtype=np.int8
)

X_validation = pd.get_dummies(
    X_validation,
    columns=["type"],
    dtype=np.int8
)

# Make sure validation has exactly the same columns.
X_validation = X_validation.reindex(
    columns=X_train.columns,
    fill_value=0
)

print(f"Number of features: {X_train.shape[1]}")

# ---------------------------------------------------------
# Class imbalance
# ---------------------------------------------------------

fraud_count = int(y_train.sum())
normal_count = int((y_train == 0).sum())

scale_pos_weight = normal_count / fraud_count

print("\n========== CLASS IMBALANCE ==========")
print(f"Normal transactions: {normal_count:,}")
print(f"Fraud transactions:  {fraud_count:,}")
print(f"scale_pos_weight:    {scale_pos_weight:.2f}")

# ---------------------------------------------------------
# Baseline XGBoost
# ---------------------------------------------------------

print("\n========== TRAINING XGBOOST ==========")

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

    verbose=25,
)

# ---------------------------------------------------------
# Validation prediction
# ---------------------------------------------------------

print("\n========== VALIDATION ==========")

validation_probability = model.predict_proba(
    X_validation
)[:, 1]

# Initial threshold only.
# We will NOT treat 0.5 as the final production threshold.
validation_prediction = (
    validation_probability >= 0.5
).astype(int)

# ---------------------------------------------------------
# Metrics
# ---------------------------------------------------------

roc_auc = roc_auc_score(
    y_validation,
    validation_probability
)

pr_auc = average_precision_score(
    y_validation,
    validation_probability
)

print(f"\nROC-AUC: {roc_auc:.6f}")
print(f"PR-AUC:  {pr_auc:.6f}")

print("\nClassification report:")
print(
    classification_report(
        y_validation,
        validation_prediction,
        digits=4,
        zero_division=0
    )
)

print("\nConfusion matrix:")
print(
    confusion_matrix(
        y_validation,
        validation_prediction
    )
)

# ---------------------------------------------------------
# Save model
# ---------------------------------------------------------

MODEL_PATH = MODEL_DIR / "baseline_xgboost.json"

model.save_model(MODEL_PATH)

print("\n========== MODEL SAVED ==========")
print(f"Model: {MODEL_PATH}")

print("\nBaseline training completed.")