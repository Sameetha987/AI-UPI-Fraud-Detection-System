package com.safepay.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 60;
    private static final long WINDOW_SECONDS = 60;

    private final Map<String, RequestCounter> counters =
            new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!isRateLimitedEndpoint(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = getClientKey(request);

        long now = Instant.now().getEpochSecond();

        RequestCounter counter =
                counters.compute(
                        clientKey,
                        (key, existing) -> {

                            if (existing == null ||
                                    now - existing.windowStart
                                            >= WINDOW_SECONDS) {

                                return new RequestCounter(
                                        now,
                                        1
                                );
                            }

                            existing.count++;
                            return existing;
                        }
                );

        if (counter.count > MAX_REQUESTS) {

            response.setStatus(
                    HttpStatus.TOO_MANY_REQUESTS.value()
            );

            response.setContentType(
                    "application/json"
            );

            response.getWriter().write(
                    "{\"error\":\"Too many requests. Please try again later.\"}"
            );

            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedEndpoint(String path) {

        return path.equals("/api/auth/login")
                || path.equals("/api/auth/register")
                || path.equals("/api/accounts/deposit")
                || path.equals("/api/transactions/transfer")
                || path.equals("/api/merchant/payments/pay");
    }

    private String getClientKey(
            HttpServletRequest request
    ) {

        String forwardedFor =
                request.getHeader("X-Forwarded-For");

        if (forwardedFor != null &&
                !forwardedFor.isBlank()) {

            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }

    private static class RequestCounter {

        private final long windowStart;
        private int count;

        private RequestCounter(
                long windowStart,
                int count
        ) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}