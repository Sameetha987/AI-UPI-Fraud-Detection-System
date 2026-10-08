import json
from pathlib import Path


INTERNAL_ROLES = {"ADMIN", "RISK_ANALYST"}
CUSTOMER_ROLES = {"USER", "MERCHANT"}


def load_internal_explanation(path: str) -> dict:
    """Load an internal transaction-level SHAP explanation."""
    explanation_path = Path(path)

    if not explanation_path.exists():
        raise FileNotFoundError(
            f"Explanation file not found: {explanation_path}"
        )

    with explanation_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_explanation(
    explanation: dict,
    role: str,
) -> dict:
    """
    Apply role-based explanation disclosure.

    ADMIN / RISK_ANALYST:
        Detailed internal explanation.

    USER / MERCHANT:
        Safe customer-facing message without
        exposing model internals.
    """

    normalized_role = role.strip().upper()

    model = explanation.get("model", {})
    transaction = explanation.get("transaction", {})
    prediction = explanation.get("prediction", {})
    model_explanation = explanation.get("explanation", {})

    decision = str(prediction.get("decision", "")).upper()

    if normalized_role in INTERNAL_ROLES:
        return {
            "classification": "INTERNAL",
            "customer_visible": False,
            "role": normalized_role,
            "transaction_index": transaction.get("validation_index"),
            "actual_label": transaction.get("actual_label"),
            "risk_score": prediction.get("risk_score"),
            "decision": prediction.get("decision"),
            "model_version": model.get("version"),
            "top_positive_contributors": model_explanation.get(
                "top_positive_contributors", []
            ),
            "top_negative_contributors": model_explanation.get(
                "top_negative_contributors", []
            ),
        }

    if normalized_role in CUSTOMER_ROLES:
        if decision == "FRAUD_HOLD":
            message = (
                "This transaction requires additional verification "
                "before it can be completed."
            )
        else:
            message = "The transaction was processed successfully."

        return {
            "classification": "CUSTOMER_SAFE",
            "customer_visible": True,
            "role": normalized_role,
            "message": message,
        }

    raise PermissionError(
        f"Role '{role}' is not authorized to access this explanation."
    )


def main() -> None:
    explanation_path = "models/explanations/transaction_0.json"

    explanation = load_internal_explanation(explanation_path)

    roles = [
        "ADMIN",
        "RISK_ANALYST",
        "MERCHANT",
        "USER",
    ]

    for role in roles:
        result = build_explanation(explanation, role)

        print(f"\nROLE: {role}")
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()