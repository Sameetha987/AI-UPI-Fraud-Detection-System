import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
import xgboost as xgb


DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")
OUTPUT_DIR = MODEL_DIR / "shap"

VALIDATION_PATH = DATA_DIR / "validation.csv"
MODEL_PATH = MODEL_DIR / "safepay_xgb_candidate.json"
METADATA_PATH = MODEL_DIR / "safepay_xgb_candidate_metadata.json"

RANDOM_STATE = 42
SAMPLE_SIZE = 10_000


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

# Guarantee exact feature order used during training.
X_validation = X_validation.reindex(
    columns=expected_features,
    fill_value=0
)

print(f"Validation rows: {len(X_validation):,}")
print(f"Features:        {X_validation.shape[1]}")


# ---------------------------------------------------------
# Stratified validation sample
# ---------------------------------------------------------

print("\nCreating SHAP analysis sample...")

fraud_data = X_validation[
    y_validation == 1
]

normal_data = X_validation[
    y_validation == 0
]

fraud_count = min(
    len(fraud_data),
    SAMPLE_SIZE // 2
)

normal_count = SAMPLE_SIZE - fraud_count

rng = np.random.default_rng(
    RANDOM_STATE
)

fraud_indices = rng.choice(
    len(fraud_data),
    size=fraud_count,
    replace=False
)

normal_indices = rng.choice(
    len(normal_data),
    size=normal_count,
    replace=False
)

X_fraud_sample = fraud_data.iloc[
    fraud_indices
]

X_normal_sample = normal_data.iloc[
    normal_indices
]

X_sample = pd.concat(
    [
        X_fraud_sample,
        X_normal_sample
    ]
).sample(
    frac=1,
    random_state=RANDOM_STATE
)

print(f"SHAP sample size: {len(X_sample):,}")
print(
    f"Fraud samples:   "
    f"{(y_validation.loc[X_sample.index] == 1).sum():,}"
)
print(
    f"Normal samples:  "
    f"{(y_validation.loc[X_sample.index] == 0).sum():,}"
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
# Create SHAP TreeExplainer
# ---------------------------------------------------------

print("\nCreating SHAP TreeExplainer...")

explainer = shap.TreeExplainer(
    model
)


# ---------------------------------------------------------
# Calculate SHAP values
# ---------------------------------------------------------

print("Calculating SHAP values...")

shap_values = explainer.shap_values(
    X_sample
)

shap_values = np.asarray(
    shap_values
)

print(
    f"SHAP matrix shape: "
    f"{shap_values.shape}"
)


# ---------------------------------------------------------
# Global feature importance
# ---------------------------------------------------------

mean_abs_shap = np.abs(
    shap_values
).mean(
    axis=0
)

importance_df = pd.DataFrame(
    {
        "feature": X_sample.columns,
        "mean_abs_shap": mean_abs_shap,
    }
).sort_values(
    "mean_abs_shap",
    ascending=False
)

importance_df["importance_percentage"] = (
    importance_df["mean_abs_shap"]
    / importance_df["mean_abs_shap"].sum()
    * 100
)

importance_path = (
    OUTPUT_DIR /
    "global_feature_importance.csv"
)

importance_df.to_csv(
    importance_path,
    index=False
)


# ---------------------------------------------------------
# Print top features
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("GLOBAL SHAP FEATURE IMPORTANCE")
print("=" * 80)

print(
    importance_df.head(20).to_string(
        index=False,
        formatters={
            "mean_abs_shap": "{:.6f}".format,
            "importance_percentage": "{:.2f}%".format,
        }
    )
)


# ---------------------------------------------------------
# SHAP summary bar plot
# ---------------------------------------------------------

print("\nGenerating SHAP summary bar plot...")

plt.figure()

shap.summary_plot(
    shap_values,
    X_sample,
    plot_type="bar",
    show=False,
    max_display=20
)

plt.tight_layout()

bar_path = (
    OUTPUT_DIR /
    "shap_summary_bar.png"
)

plt.savefig(
    bar_path,
    dpi=200,
    bbox_inches="tight"
)

plt.close()


# ---------------------------------------------------------
# SHAP beeswarm plot
# ---------------------------------------------------------

print("Generating SHAP beeswarm plot...")

plt.figure()

shap.summary_plot(
    shap_values,
    X_sample,
    show=False,
    max_display=20
)

plt.tight_layout()

beeswarm_path = (
    OUTPUT_DIR /
    "shap_summary_beeswarm.png"
)

plt.savefig(
    beeswarm_path,
    dpi=200,
    bbox_inches="tight"
)

plt.close()


# ---------------------------------------------------------
# Save SHAP values
# ---------------------------------------------------------

shap_values_df = pd.DataFrame(
    shap_values,
    columns=X_sample.columns,
    index=X_sample.index
)

shap_values_path = (
    OUTPUT_DIR /
    "shap_values_sample.csv"
)

shap_values_df.to_csv(
    shap_values_path
)


# ---------------------------------------------------------
# Save analysis metadata
# ---------------------------------------------------------

analysis_metadata = {
    "model": str(MODEL_PATH),
    "validation_dataset": str(VALIDATION_PATH),
    "sample_size": int(len(X_sample)),
    "fraud_samples": int(
        (y_validation.loc[X_sample.index] == 1).sum()
    ),
    "normal_samples": int(
        (y_validation.loc[X_sample.index] == 0).sum()
    ),
    "random_state": RANDOM_STATE,
    "shap_version": shap.__version__,
    "features": list(X_sample.columns),
}

with open(
    OUTPUT_DIR / "analysis_metadata.json",
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        analysis_metadata,
        file,
        indent=4
    )


# ---------------------------------------------------------
# Completed
# ---------------------------------------------------------

print("\n")
print("=" * 80)
print("SHAP ANALYSIS COMPLETED")
print("=" * 80)

print(f"Importance: {importance_path}")
print(f"Bar plot:   {bar_path}")
print(f"Beeswarm:   {beeswarm_path}")
print(f"SHAP data:  {shap_values_path}")
print(
    f"Metadata:   "
    f"{OUTPUT_DIR / 'analysis_metadata.json'}"
)