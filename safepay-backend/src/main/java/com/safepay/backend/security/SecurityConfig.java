package com.safepay.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

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

                .cors(cors -> {})

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .headers(headers -> headers
                        .contentTypeOptions(contentType -> {})
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer ->
                                referrer.policy(
                                        ReferrerPolicyHeaderWriter.ReferrerPolicy
                                                .STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                                )
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login"
                        ).permitAll()

                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/merchant/profile")
                        .authenticated()

                        .requestMatchers("/api/merchant/payments/pay")
                        .authenticated()

                        .requestMatchers("/api/merchant/**")
                        .hasRole("MERCHANT")

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