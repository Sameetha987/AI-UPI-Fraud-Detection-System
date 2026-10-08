import json
from pathlib import Path

import xgboost as xgb


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "models" / "safepay_xgb_candidate.json"
METADATA_PATH = BASE_DIR / "models" / "safepay_xgb_candidate_metadata.json"


class ModelLoader:
    """
    Loads and validates the SafePay XGBoost model
    together with its metadata.
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        metadata_path: Path = METADATA_PATH,
    ):
        self.model_path = model_path
        self.metadata_path = metadata_path

        self.model = None
        self.metadata = None
        self.feature_names = []

    def load(self) -> None:
        """Load model and metadata from disk."""

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {self.model_path}"
            )

        if not self.metadata_path.exists():
            raise FileNotFoundError(
                f"Model metadata not found: {self.metadata_path}"
            )

        with self.metadata_path.open("r", encoding="utf-8") as file:
            self.metadata = json.load(file)

        self.feature_names = self.metadata.get("features", [])

        if not self.feature_names:
            raise ValueError(
                "Model metadata does not contain feature definitions."
            )

        self.model = xgb.XGBClassifier()
        self.model.load_model(str(self.model_path))

        self._validate_model()

    def _validate_model(self) -> None:
        """Validate the loaded model against its metadata."""

        if self.model is None:
            raise RuntimeError("Model has not been loaded.")

        model_feature_names = self.model.get_booster().feature_names

        if model_feature_names is None:
            raise ValueError(
                "Loaded XGBoost model does not contain feature names."
            )

        if model_feature_names != self.feature_names:
            raise ValueError(
                "Model feature order does not match metadata."
            )

    def get_model(self):
        """Return the loaded model."""

        if self.model is None:
            raise RuntimeError("Model has not been loaded.")

        return self.model

    def get_metadata(self) -> dict:
        """Return model metadata."""

        if self.metadata is None:
            raise RuntimeError("Model metadata has not been loaded.")

        return self.metadata

    def get_feature_names(self) -> list[str]:
        """Return the exact expected feature order."""

        if not self.feature_names:
            raise RuntimeError("Feature metadata has not been loaded.")

        return self.feature_names


if __name__ == "__main__":
    loader = ModelLoader()
    loader.load()

    print("Model loaded successfully.")
    print(f"Model: {loader.get_metadata().get('model_name')}")
    print("Version: candidate")
    print(f"Features: {len(loader.get_feature_names())}")
    print("Feature order validation: PASS")