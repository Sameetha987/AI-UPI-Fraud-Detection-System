from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.inference.model_loader import ModelLoader
from src.inference.prediction_service import PredictionService

from pathlib import Path

from src.models.explanation_policy import (
    build_explanation,
    load_internal_explanation,
)


app = FastAPI(
    title="SafePay AI Fraud Detection Service",
    description="AI-powered fraud risk scoring service for SafePay.",
    version="1.0.0",
)


model_loader = ModelLoader()
model_loader.load()

prediction_service = PredictionService(model_loader)

EXPLANATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "models"
    / "explanations"
    / "transaction_0.json"
)

internal_explanation = load_internal_explanation(
    str(EXPLANATION_PATH)
)


class PredictionRequest(BaseModel):
    features: Dict[str, float] = Field(
        ...,
        description="Transaction features expected by the SafePay XGBoost model.",
    )


class ModelInfo(BaseModel):
    name: str
    version: str


class PredictionResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0)
    decision: str
    model: ModelInfo


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "safepay-ai",
        "version": "1.0.0",
        "model_loaded": True,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    try:
        return prediction_service.predict(request.features)

    except ValueError as exc:
        detail = exc.args[0]

        if isinstance(detail, dict):
            raise HTTPException(
                status_code=400,
                detail=detail,
            ) from exc

        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_FEATURE_SET",
                "message": "Invalid transaction feature set.",
            },
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PREDICTION_FAILED",
                "message": "AI prediction could not be completed.",
            },
        ) from exc
class ExplanationRequest(BaseModel):
    role: str = Field(
        ...,
        description="Caller role requesting transaction explanation.",
    )


@app.post("/explain")
def explain(request: ExplanationRequest):
    try:
        return build_explanation(
            internal_explanation,
            request.role,
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "EXPLANATION_ACCESS_DENIED",
                "message": "This role is not authorized to access explanations.",
            },
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "EXPLANATION_FAILED",
                "message": "Explanation could not be generated.",
            },
        ) from exc