import pandas as pd

from src.inference.model_loader import ModelLoader


class PredictionService:
    """Business layer for SafePay AI fraud predictions."""

    DECISION_THRESHOLD = 0.01

    def __init__(self, model_loader: ModelLoader):
        self.model_loader = model_loader

    def predict(self, features: dict) -> dict:
        expected_features = self.model_loader.get_feature_names()

        received_features = set(features.keys())
        expected_feature_set = set(expected_features)

        missing_features = expected_feature_set - received_features
        unexpected_features = received_features - expected_feature_set

        if missing_features or unexpected_features:
            raise ValueError(
                {
                    "error": "INVALID_FEATURE_SET",
                    "message": (
                        "The supplied transaction does not match "
                        "the expected model feature set."
                    ),
                    "missing_features": sorted(missing_features),
                    "unexpected_features": sorted(unexpected_features),
                }
            )

        feature_values = [
            features[feature]
            for feature in expected_features
        ]

        input_data = pd.DataFrame(
            [feature_values],
            columns=expected_features,
        )

        model = self.model_loader.get_model()

        risk_score = float(
            model.predict_proba(input_data)[0][1]
        )

        decision = (
            "FRAUD_HOLD"
            if risk_score >= self.DECISION_THRESHOLD
            else "ALLOW"
        )

        return {
            "risk_score": risk_score,
            "decision": decision,
            "model": {
                "name": "SafePay XGBoost Candidate",
                "version": "candidate",
            },
        }