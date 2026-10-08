import json
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
MODEL_DIR = Path("models")

TRAIN_PATH = DATA_DIR / "train.csv"
VALIDATION_PATH = DATA_DIR / "validation.csv"

CANDIDATE_MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
CANDIDATE_METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"


print("Loading datasets...")

train = pd.read_csv(TRAIN_PATH)
validation = pd.read_csv(VALIDATION_PATH)

TARGET = "isFraud"

X_train = train.drop(columns=[TARGET])
y_train = train[TARGET]

X_validation = validation.drop(columns=[TARGET])
y_validation = validation[TARGET]


# ---------------------------------------------------------
# Encode transaction type
# ---------------------------------------------------------

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

X_validation = X_validation.reindex(
    columns=X_train.columns,
    fill_value=0
)

print(f"Training rows:   {len(X_train):,}")
print(f"Validation rows: {len(X_validation):,}")
print(f"Features:         {X_train.shape[1]}")


# ---------------------------------------------------------
# Class imbalance
# ---------------------------------------------------------

fraud_count = int(y_train.sum())
normal_count = int((y_train == 0).sum())

scale_pos_weight = normal_count / fraud_count

print("\n========== CLASS IMBALANCE ==========")
print(f"Normal: {normal_count:,}")
print(f"Fraud:  {fraud_count:,}")
print(f"Weight: {scale_pos_weight:.2f}")


# ---------------------------------------------------------
# Candidate configurations
# ---------------------------------------------------------

configs = [
    {
        "name": "config_1",
        "max_depth": 4,
        "learning_rate": 0.08,
        "min_child_weight": 1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "gamma": 0,
    },
    {
        "name": "config_2",
        "max_depth": 6,
        "learning_rate": 0.05,
        "min_child_weight": 1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "gamma": 0,
    },
    {
        "name": "config_3",
        "max_depth": 6,
        "learning_rate": 0.08,
        "min_child_weight": 5,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "gamma": 0,
    },
    {
        "name": "config_4",
        "max_depth": 8,
        "learning_rate": 0.05,
        "min_child_weight": 5,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "gamma": 0.1,
    },
    {
        "name": "config_5",
        "max_depth": 6,
        "learning_rate": 0.03,
        "min_child_weight": 10,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "gamma": 0.1,
    },
]


results = []


# ---------------------------------------------------------
# Train and evaluate configurations
# ---------------------------------------------------------

for config in configs:

    print("\n" + "=" * 70)
    print(f"TRAINING {config['name']}")
    print("=" * 70)

    model = xgb.XGBClassifier(
        n_estimators=500,

        max_depth=config["max_depth"],
        learning_rate=config["learning_rate"],
        min_child_weight=config["min_child_weight"],

        subsample=config["subsample"],
        colsample_bytree=config["colsample_bytree"],
        gamma=config["gamma"],

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

    results.append({
        "config": config["name"],
        "max_depth": config["max_depth"],
        "learning_rate": config["learning_rate"],
        "min_child_weight": config["min_child_weight"],
        "subsample": config["subsample"],
        "colsample_bytree": config["colsample_bytree"],
        "gamma": config["gamma"],
        "pr_auc": pr_auc,
        "roc_auc": roc_auc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    })

    print(f"PR-AUC:    {pr_auc:.6f}")
    print(f"ROC-AUC:   {roc_auc:.6f}")
    print(f"Precision: {precision:.6f}")
    print(f"Recall:    {recall:.6f}")
    print(f"F1:        {f1:.6f}")


# ---------------------------------------------------------
# Compare configurations
# ---------------------------------------------------------

results_df = pd.DataFrame(results)

results_df = results_df.sort_values(
    "pr_auc",
    ascending=False
).reset_index(drop=True)


print("\n")
print("=" * 90)
print("XGBOOST TUNING RESULTS")
print("=" * 90)

print(
    results_df.to_string(
        index=False,
        formatters={
            "pr_auc": "{:.6f}".format,
            "roc_auc": "{:.6f}".format,
            "precision": "{:.6f}".format,
            "recall": "{:.6f}".format,
            "f1": "{:.6f}".format,
        }
    )
)


# ---------------------------------------------------------
# Select best configuration
# ---------------------------------------------------------

best_result = results_df.iloc[0]

best_config_name = best_result["config"]

best_config = next(
    config
    for config in configs
    if config["name"] == best_config_name
)

print("\nBEST CONFIGURATION")
print("------------------")
print(best_result.to_string())


# ---------------------------------------------------------
# Retrain best configuration
# ---------------------------------------------------------

print("\n")
print("=" * 70)
print("RETRAINING BEST CONFIGURATION")
print("=" * 70)

best_model = xgb.XGBClassifier(
    n_estimators=500,

    max_depth=best_config["max_depth"],
    learning_rate=best_config["learning_rate"],
    min_child_weight=best_config["min_child_weight"],

    subsample=best_config["subsample"],
    colsample_bytree=best_config["colsample_bytree"],
    gamma=best_config["gamma"],

    objective="binary:logistic",
    eval_metric="aucpr",

    scale_pos_weight=scale_pos_weight,

    tree_method="hist",
    n_jobs=-1,

    random_state=42,
)

best_model.fit(
    X_train,
    y_train,
    eval_set=[
        (X_validation, y_validation)
    ],
    verbose=False,
)


# ---------------------------------------------------------
# Save candidate model
# ---------------------------------------------------------

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)

best_model.save_model(
    CANDIDATE_MODEL_PATH
)


# ---------------------------------------------------------
# Save model metadata
# ---------------------------------------------------------

metadata = {
    "model_name": "SafePay XGBoost Candidate",
    "model_type": "XGBClassifier",
    "objective": "binary:logistic",
    "evaluation_metric": "aucpr",
    "n_estimators": 500,
    "random_state": 42,
    "scale_pos_weight": scale_pos_weight,
    "features": list(X_train.columns),
    "best_configuration": best_config,
    "validation_metrics": {
        "pr_auc": float(best_result["pr_auc"]),
        "roc_auc": float(best_result["roc_auc"]),
        "precision": float(best_result["precision"]),
        "recall": float(best_result["recall"]),
        "f1": float(best_result["f1"]),
    },
}

with open(
    CANDIDATE_METADATA_PATH,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        metadata,
        file,
        indent=4
    )


print("\n")
print("=" * 70)
print("CANDIDATE MODEL SAVED")
print("=" * 70)

print(f"Model:    {CANDIDATE_MODEL_PATH}")
print(f"Metadata: {CANDIDATE_METADATA_PATH}")

print("\nTuning and candidate model creation completed.")