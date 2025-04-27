package com.pharmacare.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidatedUserDto {
    private String userType; // e.g., "user", "pharmacy"
    private Object userData; // Will hold either UserDto or PharmacyStaffDto
} 