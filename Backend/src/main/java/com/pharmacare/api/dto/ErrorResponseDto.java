package com.pharmacare.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ErrorResponseDto {
    private int status;
    private String message;
    
    public ErrorResponseDto(String message) {
        this.message = message;
    }
    
    public ErrorResponseDto(int status, String message) {
        this.status = status;
        this.message = message;
    }
} 