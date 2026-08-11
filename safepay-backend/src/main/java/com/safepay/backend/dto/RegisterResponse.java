package com.safepay.backend.dto;

public class RegisterResponse {

    private Long userId;
    private String fullName;
    private String email;
    private String phone;
    private String accountNumber;
    private String message;

    public RegisterResponse(
            Long userId,
            String fullName,
            String email,
            String phone,
            String accountNumber,
            String message
    ) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.accountNumber = accountNumber;
        this.message = message;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getMessage() {
        return message;
    }
}