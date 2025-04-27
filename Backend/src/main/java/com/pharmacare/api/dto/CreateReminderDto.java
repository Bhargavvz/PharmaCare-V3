package com.pharmacare.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReminderDto {
    @NotNull
    private Long medicationId;
    
    @NotNull
    private LocalDateTime reminderTime;
    
    private String notes;
    
    private boolean completed;
} 