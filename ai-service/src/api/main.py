from fastapi import FastAPI


app = FastAPI(
    title="SafePay AI Fraud Detection Service",
    description="AI-powered fraud risk scoring service for SafePay.",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "safepay-ai",
        "version": "1.0.0",
    }