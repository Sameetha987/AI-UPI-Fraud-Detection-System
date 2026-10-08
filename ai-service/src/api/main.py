from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.inference.model_loader import ModelLoader
from src.inference.prediction_service import PredictionService


app = FastAPI(
    title="SafePay AI Fraud Detection Service",
    description="AI-powered fraud risk scoring service for SafePay.",
    version="1.0.0",
)


model_loader = ModelLoader()
model_loader.load()

prediction_service = PredictionService(model_loader)


class PredictionRequest(BaseModel):
    features: Dict[str, float] = Field(
        ...,
        description="Transaction features expected by the SafePay XGBoost model.",
    )


class PredictionResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0)
    decision: str
    model: str
    feature_count: int


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