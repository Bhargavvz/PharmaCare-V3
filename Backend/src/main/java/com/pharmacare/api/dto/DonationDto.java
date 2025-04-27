package com.pharmacare.api.dto;

import com.pharmacare.api.model.Donation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DonationDto {
    private Long id;
    private String medicineName;
    private int quantity;
    private LocalDate expiryDate;
    private String location;
    private Donation.DonationStatus status;
    private String organization;
    private String notes;
    private LocalDateTime donationDate;
    private LocalDateTime completedDate;
    private String donorName;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static DonationDto fromEntity(Donation donation) {
        return DonationDto.builder()
                .id(donation.getId())
                .medicineName(donation.getMedicineName())
                .quantity(donation.getQuantity())
                .expiryDate(donation.getExpiryDate())
                .location(donation.getLocation())
                .status(donation.getStatus())
                .organization(donation.getOrganization())
                .notes(donation.getNotes())
                .donationDate(donation.getDonationDate())
                .completedDate(donation.getCompletedDate())
                .donorName(donation.getUser() != null ? 
                    donation.getUser().getFirstName() + " " + donation.getUser().getLastName() : "Unknown")
                .userId(donation.getUser() != null ? donation.getUser().getId() : null)
                .createdAt(donation.getCreatedAt())
                .updatedAt(donation.getUpdatedAt())
                .build();
    }
} 