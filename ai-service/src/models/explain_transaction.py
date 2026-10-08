import json
from pathlib import Path

import numpy as np
import pandas as pd
import shap
import xgboost as xgb


DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"

OUTPUT_DIR = MODEL_DIR / "explanations"

THRESHOLD = 0.01

# Validation transaction to explain.
# This is deliberately NOT from the test set.
TRANSACTION_INDEX = 0


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
# Load validation dataset
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


# ---------------------------------------------------------
# Select transaction
# ---------------------------------------------------------

if TRANSACTION_INDEX < 0 or TRANSACTION_INDEX >= len(
    X_validation
):
    raise ValueError(
        "TRANSACTION_INDEX is outside validation dataset."
    )

X_transaction = X_validation.iloc[
    [TRANSACTION_INDEX]
]

actual_label = int(
    y_validation.iloc[TRANSACTION_INDEX]
)


# ---------------------------------------------------------
# Load model
# ---------------------------------------------------------

print("Loading candidate XGBoost model...")

model = xgb.XGBClassifier()

model.load_model(
    MODEL_PATH
)


# ---------------------------------------------------------
# Generate prediction
# ---------------------------------------------------------

probability = float(
    model.predict_proba(
        X_transaction
    )[0, 1]
)

prediction = int(
    probability >= THRESHOLD
)


# ---------------------------------------------------------
# SHAP explanation
# ---------------------------------------------------------

print("Calculating transaction-level SHAP explanation...")

explainer = shap.TreeExplainer(
    model
)

shap_values = explainer.shap_values(
    X_transaction
)

shap_values = np.asarray(
    shap_values
)[0]


# ---------------------------------------------------------
# Build explanation dataframe
# ---------------------------------------------------------

explanation_df = pd.DataFrame(
    {
        "feature": X_transaction.columns,
        "feature_value": X_transaction.iloc[0].values,
        "shap_value": shap_values,
        "absolute_shap": np.abs(shap_values),
    }
)

explanation_df = explanation_df.sort_values(
    "absolute_shap",
    ascending=False
)


# ---------------------------------------------------------
# Positive / negative contributors
# ---------------------------------------------------------

positive = explanation_df[
    explanation_df["shap_value"] > 0
].head(10)

negative = explanation_df[
    explanation_df["shap_value"] < 0
].sort_values(
    "shap_value",
    ascending=True
).head(10)


# ---------------------------------------------------------
# Print explanation
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("TRANSACTION-LEVEL SHAP EXPLANATION")
print("=" * 80)

print(
    f"Validation index: {TRANSACTION_INDEX}"
)

print(
    f"Actual label:     {actual_label}"
)

print(
    f"Risk score:       {probability:.12f}"
)

print(
    f"Decision:         "
    f"{'FRAUD / HOLD' if prediction else 'ALLOW'}"
)


print("\nTOP POSITIVE CONTRIBUTORS")
print("-------------------------")

if positive.empty:

    print("None")

else:

    print(
        positive[
            [
                "feature",
                "feature_value",
                "shap_value",
            ]
        ].to_string(
            index=False
        )
    )


print("\nTOP NEGATIVE CONTRIBUTORS")
print("-------------------------")

if negative.empty:

    print("None")

else:

    print(
        negative[
            [
                "feature",
                "feature_value",
                "shap_value",
            ]
        ].to_string(
            index=False
        )
    )


# ---------------------------------------------------------
# Convert to JSON-safe values
# ---------------------------------------------------------

def clean_value(value):

    if isinstance(
        value,
        (np.integer, np.int64, np.int32)
    ):
        return int(value)

    if isinstance(
        value,
        (np.floating, np.float64, np.float32)
    ):
        return float(value)

    if isinstance(
        value,
        np.bool_
    ):
        return bool(value)

    return value


def records_to_json(
    dataframe
):

    records = []

    for _, row in dataframe.iterrows():

        records.append(
            {
                "feature": str(
                    row["feature"]
                ),
                "feature_value": clean_value(
                    row["feature_value"]
                ),
                "shap_value": clean_value(
                    row["shap_value"]
                ),
            }
        )

    return records


# ---------------------------------------------------------
# Build internal explanation
# ---------------------------------------------------------

internal_explanation = {
    "model": {
        "name": "SafePay Fraud Detection Model",
        "version": "1.0.0",
    },

    "transaction": {
        "validation_index": TRANSACTION_INDEX,
        "actual_label": actual_label,
    },

    "prediction": {
        "risk_score": probability,
        "threshold": THRESHOLD,
        "decision": (
            "FRAUD_HOLD"
            if prediction
            else "ALLOW"
        ),
    },

    "explanation": {
        "top_positive_contributors":
            records_to_json(positive),

        "top_negative_contributors":
            records_to_json(negative),
    },

    "disclosure": {
        "classification": "INTERNAL",
        "customer_visible": False,
        "intended_roles": [
            "ADMIN",
            "RISK_ANALYST",
        ],
    },
}


# ---------------------------------------------------------
# Save explanation
# ---------------------------------------------------------

output_path = (
    OUTPUT_DIR /
    f"transaction_{TRANSACTION_INDEX}.json"
)

with open(
    output_path,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        internal_explanation,
        file,
        indent=4
    )


print("\n")
print("=" * 80)
print("TRANSACTION EXPLANATION CREATED")
print("=" * 80)

print(
    f"Output: {output_path}"
)