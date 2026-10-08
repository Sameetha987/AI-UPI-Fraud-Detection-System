package com.safepay.backend.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class SafePayAiClient {

    private final String aiUrl;
    private final String apiKey;

    public SafePayAiClient(
            @Value("${safepay.ai.url}") String aiUrl,
            @Value("${safepay.ai.api-key}") String apiKey
    ) {
        this.aiUrl = aiUrl;
        this.apiKey = apiKey;
    }

    public FraudPrediction predict(Map<String, BigDecimal> features) {

        HttpURLConnection connection = null;

        try {

            // ---------------------------------------------------------
            // Build JSON body
            // ---------------------------------------------------------

            StringBuilder json = new StringBuilder();

            json.append("{\"features\":{");

            int index = 0;

            for (Map.Entry<String, BigDecimal> entry : features.entrySet()) {

                if (index > 0) {
                    json.append(",");
                }

                json.append("\"")
                        .append(entry.getKey())
                        .append("\":")
                        .append(entry.getValue());

                index++;
            }

            json.append("}}");

            String jsonBody = json.toString();

            System.out.println("========================================");
            System.out.println("AI REQUEST");
            System.out.println("URL = " + aiUrl + "/predict");
            System.out.println("API KEY PRESENT = " + (apiKey != null && !apiKey.isBlank()));
            System.out.println("JSON LENGTH = " + jsonBody.getBytes(StandardCharsets.UTF_8).length);
            System.out.println("JSON BODY = " + jsonBody);
            System.out.println("========================================");


            // ---------------------------------------------------------
            // Open connection
            // ---------------------------------------------------------

            URL url = URI.create(aiUrl + "/predict").toURL();

            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("POST");
            connection.setDoOutput(true);

            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);

            connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
            );

            connection.setRequestProperty(
                    "Accept",
                    "application/json"
            );

            connection.setRequestProperty(
                    "X-API-Key",
                    apiKey
            );


            // ---------------------------------------------------------
            // Send body
            // ---------------------------------------------------------

            byte[] bodyBytes =
                    jsonBody.getBytes(StandardCharsets.UTF_8);

            connection.setFixedLengthStreamingMode(bodyBytes.length);

            connection.getOutputStream().write(bodyBytes);
            connection.getOutputStream().flush();


            // ---------------------------------------------------------
            // Read response
            // ---------------------------------------------------------

            int statusCode = connection.getResponseCode();

            InputStream inputStream;

            if (statusCode >= 200 && statusCode < 300) {
                inputStream = connection.getInputStream();
            } else {
                inputStream = connection.getErrorStream();
            }

            String responseBody;

            try (BufferedReader reader =
                         new BufferedReader(
                                 new InputStreamReader(
                                         inputStream,
                                         StandardCharsets.UTF_8
                                 )
                         )) {

                StringBuilder response = new StringBuilder();

                String line;

                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                responseBody = response.toString();
            }


            // ---------------------------------------------------------
            // Print response
            // ---------------------------------------------------------

            System.out.println("========================================");
            System.out.println("AI RESPONSE");
            System.out.println("STATUS = " + statusCode);
            System.out.println("BODY = " + responseBody);
            System.out.println("========================================");


            // ---------------------------------------------------------
            // Handle failure
            // ---------------------------------------------------------

            if (statusCode < 200 || statusCode >= 300) {

                throw new RuntimeException(
                        "AI service returned HTTP "
                                + statusCode
                                + ": "
                                + responseBody
                );
            }


            // ---------------------------------------------------------
            // Parse response
            // ---------------------------------------------------------

            BigDecimal riskScore =
                    extractBigDecimal(
                            responseBody,
                            "\"risk_score\":"
                    );

            String decision =
                    extractString(
                            responseBody,
                            "\"decision\":\""
                    );

            String modelName =
                    extractString(
                            responseBody,
                            "\"name\":\""
                    );

            String modelVersion =
                    extractString(
                            responseBody,
                            "\"version\":\""
                    );


            return new FraudPrediction(
                    riskScore,
                    decision,
                    new ModelInfo(
                            modelName,
                            modelVersion
                    )
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to communicate with SafePay AI service",
                    e
            );

        } finally {

            if (connection != null) {
                connection.disconnect();
            }
        }
    }


    private BigDecimal extractBigDecimal(
            String json,
            String key
    ) {

        int start = json.indexOf(key);

        if (start == -1) {

            throw new RuntimeException(
                    "Missing field: " + key
            );
        }

        start += key.length();

        int end = start;

        while (end < json.length()) {

            char c = json.charAt(end);

            if (c == ',' || c == '}') {
                break;
            }

            end++;
        }

        return new BigDecimal(
                json.substring(start, end).trim()
        );
    }


    private String extractString(
            String json,
            String key
    ) {

        int start = json.indexOf(key);

        if (start == -1) {

            throw new RuntimeException(
                    "Missing field: " + key
            );
        }

        start += key.length();

        int end =
                json.indexOf(
                        "\"",
                        start
                );

        if (end == -1) {

            throw new RuntimeException(
                    "Invalid JSON response"
            );
        }

        return json.substring(
                start,
                end
        );
    }


    public record FraudPrediction(
            BigDecimal riskScore,
            String decision,
            ModelInfo model
    ) {
    }


    public record ModelInfo(
            String name,
            String version
    ) {
    }
}