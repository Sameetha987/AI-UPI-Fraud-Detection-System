package com.safepay.backend.ai;

import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai-test")
public class AiTestController {

    private final SafePayAiClient aiClient;

    public AiTestController(SafePayAiClient aiClient) {
        this.aiClient = aiClient;
    }

    @PostMapping("/predict")
    public SafePayAiClient.FraudPrediction testPrediction() {

        Map<String, BigDecimal> features = new LinkedHashMap<>();

        features.put("step", BigDecimal.valueOf(521));
        features.put("transaction_hour", BigDecimal.valueOf(17));
        features.put("transaction_day", BigDecimal.valueOf(21));
        features.put("amount", BigDecimal.valueOf(98086.09));
        features.put("oldbalanceOrg", BigDecimal.valueOf(98086.09));
        features.put("newbalanceOrig", BigDecimal.ZERO);
        features.put("oldbalanceDest", BigDecimal.ZERO);
        features.put("newbalanceDest", BigDecimal.ZERO);
        features.put("sender_balance_change", BigDecimal.valueOf(98086.09));
        features.put("receiver_balance_change", BigDecimal.ZERO);
        features.put("sender_balance_difference", BigDecimal.ZERO);
        features.put("receiver_balance_difference", BigDecimal.valueOf(98086.09));
        features.put("sender_balance_consistency", BigDecimal.ZERO);
        features.put("receiver_balance_consistency", BigDecimal.valueOf(98086.09));
        features.put("amount_to_sender_balance_ratio", BigDecimal.ONE);
        features.put("sender_zero_after", BigDecimal.ONE);
        features.put("receiver_zero_after", BigDecimal.ZERO);
        features.put("historical_sender_transaction_count", BigDecimal.ZERO);
        features.put("historical_receiver_transaction_count", BigDecimal.ZERO);
        features.put("historical_sender_average_amount", BigDecimal.ZERO);
        features.put("amount_vs_sender_history", BigDecimal.ZERO);
        features.put("type_CASH_IN", BigDecimal.ZERO);
        features.put("type_CASH_OUT", BigDecimal.ZERO);
        features.put("type_DEBIT", BigDecimal.ZERO);
        features.put("type_PAYMENT", BigDecimal.ZERO);
        features.put("type_TRANSFER", BigDecimal.ONE);

        return aiClient.predict(features);
    }
}