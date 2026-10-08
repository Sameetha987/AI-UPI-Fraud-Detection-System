from typing import Dict

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.inference.model_loader import ModelLoader


app = FastAPI(
    title="SafePay AI Fraud Detection Service",
    description="AI-powered fraud risk scoring service for SafePay.",
    version="1.0.0",
)


model_loader = ModelLoader()
model_loader.load()


class PredictionRequest(BaseModel):
    features: Dict[str, float] = Field(
        ...,
        description="Transaction features expected by the SafePay XGBoost model.",
    )


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "safepay-ai",
        "version": "1.0.0",
        "model_loaded": True,
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    expected_features = model_loader.get_feature_names()

    received_features = set(request.features.keys())
    expected_feature_set = set(expected_features)

    missing_features = expected_feature_set - received_features
    unexpected_features = received_features - expected_feature_set

    if missing_features or unexpected_features:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid feature set",
                "missing_features": sorted(missing_features),
                "unexpected_features": sorted(unexpected_features),
            },
        )

    try:
        feature_values = [
            request.features[feature]
            for feature in expected_features
        ]

        input_data = pd.DataFrame(
            [feature_values],
            columns=expected_features,
        )

        model = model_loader.get_model()

        risk_score = float(
            model.predict_proba(input_data)[0][1]
        )

        decision = "FRAUD_HOLD" if risk_score >= 0.01 else "ALLOW"

        return {
            "risk_score": risk_score,
            "decision": decision,
            "model": "SafePay XGBoost Candidate",
            "feature_count": len(expected_features),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="AI prediction failed.",
        ) from exc