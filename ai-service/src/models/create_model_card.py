import json
from pathlib import Path


MODEL_DIR = Path("models")

METADATA_PATH = (
    MODEL_DIR /
    "safepay_xgb_candidate_metadata.json"
)

OUTPUT_PATH = (
    MODEL_DIR /
    "model_card.json"
)


# ---------------------------------------------------------
# Load candidate model metadata
# ---------------------------------------------------------

with open(
    METADATA_PATH,
    "r",
    encoding="utf-8"
) as file:
    metadata = json.load(file)


# ---------------------------------------------------------
# Model card
# ---------------------------------------------------------

model_card = {
    "model": {
        "name": "SafePay Fraud Detection Model",
        "version": "1.0.0",
        "model_type": "XGBoost Classifier",
        "objective": "binary:logistic",
        "purpose": (
            "Detect potentially fraudulent digital payment "
            "transactions and provide a fraud-risk score "
            "for downstream decision processing."
        ),
    },

    "dataset": {
        "name": "PaySim",
        "type": "synthetic financial transaction dataset",
        "total_transactions": 6362620,
        "fraud_transactions": 8213,
        "fraud_rate_percent": 0.1291,
        "known_limitation": (
            "PaySim is synthetic and does not represent "
            "the complete behavioural complexity of "
            "real-world UPI transactions."
        ),
    },

    "data_methodology": {
        "split_strategy": "temporal",
        "training_steps": "1-520",
        "validation_steps": "521-631",
        "test_steps": "632-743",
        "test_set_policy": (
            "The test period remained untouched during "
            "feature engineering decisions, model tuning, "
            "calibration evaluation, and threshold selection."
        ),
    },

    "feature_engineering": {
        "strategy": (
            "Leakage-controlled transaction, balance, "
            "temporal, and historical behavioural features."
        ),
        "excluded_features": [
            "isFlaggedFraud",
            "historical_sender_receiver_count",
            "beneficiary_is_new",
        ],
        "leakage_control": (
            "Historical features were constructed using "
            "previous observations only and excluded "
            "future and same-step information."
        ),
    },

    "model_configuration": {
        "n_estimators": 500,
        "max_depth": 6,
        "learning_rate": 0.03,
        "min_child_weight": 10,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "gamma": 0.1,
        "tree_method": "hist",
        "scale_pos_weight": metadata[
            "scale_pos_weight"
        ],
        "random_state": 42,
    },

    "validation_results": {
        "pr_auc": 0.999999,
        "roc_auc": 1.000000,
        "precision": 1.000000,
        "recall": 0.999153,
        "f1": 0.999576,
    },

    "explainability": {
        "method": "SHAP TreeExplainer",
        "analysis_sample_size": 10000,
        "sample_strategy": (
            "Stratified validation sample"
        ),
        "top_global_features": [
            {
                "feature": "sender_balance_consistency",
                "importance_percent": 31.67,
            },
            {
                "feature": "sender_zero_after",
                "importance_percent": 16.53,
            },
            {
                "feature": "step",
                "importance_percent": 8.81,
            },
            {
                "feature": "amount",
                "importance_percent": 6.47,
            },
            {
                "feature": "sender_balance_difference",
                "importance_percent": 6.06,
            },
        ],
        "customer_disclosure_policy": (
            "Raw SHAP values, internal thresholds, "
            "feature values, and model internals are "
            "not exposed to end users."
        ),
    },

    "calibration": {
        "method_evaluated": "Isotonic regression",
        "decision": "rejected",
        "reason": (
            "Calibration degraded both Brier score "
            "and log loss on the temporally separated "
            "calibration evaluation period."
        ),
        "raw_brier_score": 0.00000000,
        "calibrated_brier_score": 0.00003488,
        "raw_log_loss": 0.00000779,
        "calibrated_log_loss": 0.00055614,
    },

    "decision_policy": {
        "candidate_threshold": 0.01,
        "policy": (
            "The candidate threshold was selected using "
            "the validation period. Final performance was "
            "then evaluated once on the untouched test period."
        ),
        "validation_precision": 1.000000,
        "validation_recall": 0.999153,
        "validation_f1": 0.999576,
        "validation_false_positives": 0,
        "validation_false_negatives": 1,
    },

    "final_test_results": {
        "test_transactions": 89466,
        "test_fraud_transactions": 1252,
        "test_normal_transactions": 88214,
        "threshold": 0.01,
        "pr_auc": 1.000000,
        "roc_auc": 1.000000,
        "precision": 1.000000,
        "recall": 1.000000,
        "f1": 1.000000,
        "true_negatives": 88214,
        "false_positives": 0,
        "false_negatives": 0,
        "true_positives": 1252,
        "false_positive_rate": 0.000000,
        "false_negative_rate": 0.000000,
        "fraud_capture_rate": 1.000000,
    },

    "limitations": [
        (
            "PaySim is a synthetic dataset and therefore "
            "does not establish real-world UPI fraud "
            "detection performance."
        ),
        (
            "The perfect test metrics are dataset-specific "
            "and should not be interpreted as guaranteed "
            "production performance."
        ),
        (
            "Real production deployment would require "
            "continuous monitoring for distribution shift, "
            "new fraud patterns, and model degradation."
        ),
        (
            "The current model does not incorporate all "
            "real-world signals such as device intelligence, "
            "network intelligence, recipient reputation, "
            "or external fraud intelligence."
        ),
    ],

    "security": {
        "model_internals": (
            "Not exposed to end users."
        ),
        "explanation_access": (
            "Detailed explanations are intended for "
            "authorized administrative/risk roles."
        ),
        "audit_requirement": (
            "Access to detailed fraud explanations should "
            "be logged through the existing audit system."
        ),
    },

    "release_status": "candidate_for_integration",
}


# ---------------------------------------------------------
# Save model card
# ---------------------------------------------------------

with open(
    OUTPUT_PATH,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        model_card,
        file,
        indent=4
    )


print("=" * 80)
print("MODEL CARD CREATED")
print("=" * 80)
print(f"Output: {OUTPUT_PATH}")
print("Version: 1.0.0")
print("Status: candidate_for_integration")