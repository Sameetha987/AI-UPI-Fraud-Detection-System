package com.safepay.backend.ai;

import com.safepay.backend.entity.Account;
import com.safepay.backend.dto.TransferRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AiFeatureBuilder {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    public Map<String, BigDecimal> build(
            Account sender,
            Account receiver,
            TransferRequest request
    ) {

        BigDecimal amount = request.amount();

        BigDecimal senderBalance = sender.getBalance();
        BigDecimal receiverBalance = receiver.getBalance();

        /*
         * These represent the balances BEFORE this transfer.
         * We do not modify the accounts here.
         */

        BigDecimal senderBalanceAfter =
                senderBalance.subtract(amount);

        BigDecimal receiverBalanceAfter =
                receiverBalance.add(amount);

        BigDecimal senderBalanceChange =
                senderBalance.subtract(senderBalanceAfter);

        BigDecimal receiverBalanceChange =
                receiverBalanceAfter.subtract(receiverBalance);

        BigDecimal senderBalanceDifference =
                senderBalance.subtract(amount);

        BigDecimal receiverBalanceDifference =
                receiverBalance.add(amount);

        BigDecimal senderBalanceConsistency =
                senderBalanceDifference.abs();

        BigDecimal receiverBalanceConsistency =
                receiverBalanceDifference.abs();

        BigDecimal amountToSenderBalanceRatio =
                ZERO;

        if (senderBalance.compareTo(ZERO) > 0) {

            amountToSenderBalanceRatio =
                    amount.divide(
                            senderBalance,
                            10,
                            RoundingMode.HALF_UP
                    );
        }

        LocalDateTime now = LocalDateTime.now();

        Map<String, BigDecimal> features =
                new LinkedHashMap<>();

        // ---------------------------------------------------------
        // Temporal features
        // ---------------------------------------------------------

        features.put(
                "step",
                BigDecimal.valueOf(
                        now.toEpochSecond(
                                java.time.ZoneOffset.UTC
                        ) / 3600
                )
        );

        features.put(
                "transaction_hour",
                BigDecimal.valueOf(
                        now.getHour()
                )
        );

        features.put(
                "transaction_day",
                BigDecimal.valueOf(
                        now.getDayOfMonth()
                )
        );

        // ---------------------------------------------------------
        // Transaction
        // ---------------------------------------------------------

        features.put(
                "amount",
                amount
        );

        // SafePay transfer is always TRANSFER.
        features.put("type_CASH_IN", ZERO);
        features.put("type_CASH_OUT", ZERO);
        features.put("type_DEBIT", ZERO);
        features.put("type_PAYMENT", ZERO);
        features.put("type_TRANSFER", BigDecimal.ONE);

        // ---------------------------------------------------------
        // Sender / receiver balances
        // ---------------------------------------------------------

        features.put(
                "oldbalanceOrg",
                senderBalance
        );

        features.put(
                "newbalanceOrig",
                senderBalanceAfter
        );

        features.put(
                "oldbalanceDest",
                receiverBalance
        );

        features.put(
                "newbalanceDest",
                receiverBalanceAfter
        );

        // ---------------------------------------------------------
        // Engineered balance features
        // ---------------------------------------------------------

        features.put(
                "sender_balance_change",
                senderBalanceChange
        );

        features.put(
                "receiver_balance_change",
                receiverBalanceChange
        );

        features.put(
                "sender_balance_difference",
                senderBalanceDifference
        );

        features.put(
                "receiver_balance_difference",
                receiverBalanceDifference
        );

        features.put(
                "sender_balance_consistency",
                senderBalanceConsistency
        );

        features.put(
                "receiver_balance_consistency",
                receiverBalanceConsistency
        );

        features.put(
                "amount_to_sender_balance_ratio",
                amountToSenderBalanceRatio
        );

        // ---------------------------------------------------------
        // Zero-balance indicators
        // ---------------------------------------------------------

        features.put(
                "sender_zero_after",
                senderBalanceAfter.compareTo(ZERO) == 0
                        ? BigDecimal.ONE
                        : ZERO
        );

        features.put(
                "receiver_zero_after",
                receiverBalanceAfter.compareTo(ZERO) == 0
                        ? BigDecimal.ONE
                        : ZERO
        );

        // ---------------------------------------------------------
        // Historical features
        //
        // These are intentionally initialized to zero for now.
        // They will be replaced by database-derived history
        // before the AI is connected to the real transfer flow.
        // ---------------------------------------------------------

        features.put(
                "historical_sender_transaction_count",
                ZERO
        );

        features.put(
                "historical_receiver_transaction_count",
                ZERO
        );

        features.put(
                "historical_sender_average_amount",
                ZERO
        );

        features.put(
                "amount_vs_sender_history",
                ZERO
        );

        return features;
    }
}