from pathlib import Path
from typing import Dict

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from src.api.config import settings
from src.inference.model_loader import ModelLoader
from src.inference.prediction_service import PredictionService
from src.models.explanation_policy import (
    build_explanation,
    load_internal_explanation,
)


app = FastAPI(
    title="SafePay AI Fraud Detection Service",
    description="AI-powered fraud risk scoring service for SafePay.",
    version="1.0.0",
)


# -------------------------------------------------------------------
# Model initialization
# -------------------------------------------------------------------

model_loader = ModelLoader()
model_loader.load()

prediction_service = PredictionService(model_loader)


# -------------------------------------------------------------------
# Explanation fixture
# -------------------------------------------------------------------

EXPLANATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "models"
    / "explanations"
    / "transaction_0.json"
)

internal_explanation = load_internal_explanation(
    str(EXPLANATION_PATH)
)


# -------------------------------------------------------------------
# Request / response models
# -------------------------------------------------------------------

class PredictionRequest(BaseModel):
    features: Dict[str, float] = Field(
        ...,
        description="Transaction features expected by the SafePay XGBoost model.",
    )


class ModelInfo(BaseModel):
    name: str
    version: str


class PredictionResponse(BaseModel):
    risk_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )
    decision: str
    model: ModelInfo


class ExplanationRequest(BaseModel):
    role: str = Field(
        ...,
        description="Caller role requesting transaction explanation.",
    )


# -------------------------------------------------------------------
# Security
# -------------------------------------------------------------------

def verify_api_key(
    x_api_key: str | None,
):
    if x_api_key != settings.ai_api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "UNAUTHORIZED",
                "message": "Invalid AI service credentials.",
            },
        )


# -------------------------------------------------------------------
# Health / readiness
# -------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "safepay-ai",
        "version": "1.0.0",
        "model_loaded": True,
    }


@app.get("/ready")
def readiness_check():
    return {
        "status": "READY",
        "service": "safepay-ai",
        "model_loaded": True,
    }


# -------------------------------------------------------------------
# Fraud prediction
# -------------------------------------------------------------------

@app.post(
    "/predict",
    response_model=PredictionResponse,
)
def predict(
    request: PredictionRequest,
    x_api_key: str | None = Header(default=None),
):
    verify_api_key(x_api_key)

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


# -------------------------------------------------------------------
# Explanation
# -------------------------------------------------------------------

@app.post("/explain")
def explain(
    request: ExplanationRequest,
    x_api_key: str | None = Header(default=None),
):
    verify_api_key(x_api_key)

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