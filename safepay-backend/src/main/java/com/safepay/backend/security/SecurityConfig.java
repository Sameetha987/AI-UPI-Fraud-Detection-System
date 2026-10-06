package com.safepay.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final AuditAuthenticationEntryPoint auditAuthenticationEntryPoint;
    private final AuditAccessDeniedHandler auditAccessDeniedHandler;
    private final DatabaseUserStatusJwtAuthenticationConverter
            jwtAuthenticationConverter;

    public SecurityConfig(
            AuditAuthenticationEntryPoint auditAuthenticationEntryPoint,
            AuditAccessDeniedHandler auditAccessDeniedHandler,
            DatabaseUserStatusJwtAuthenticationConverter jwtAuthenticationConverter
    ) {
        this.auditAuthenticationEntryPoint = auditAuthenticationEntryPoint;
        this.auditAccessDeniedHandler = auditAccessDeniedHandler;
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Public authentication APIs
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login"
                        ).permitAll()

                        // Admin APIs
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // Create merchant profile
                        .requestMatchers("/api/merchant/profile")
                        .authenticated()

                        // Paying a merchant payment request
                        .requestMatchers("/api/merchant/payments/pay")
                        .authenticated()

                        // Merchant APIs
                        .requestMatchers("/api/merchant/**")
                        .hasRole("MERCHANT")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(
                                auditAuthenticationEntryPoint
                        )
                        .accessDeniedHandler(
                                auditAccessDeniedHandler
                        )
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(
                                        jwtAuthenticationConverter
                                )
                        )
                );

        return http.build();
    }
}