package com.pharmacare.api.controller;

import com.pharmacare.api.dto.DonationDto;
import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.Donation;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.DonationRepository;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.oauth2.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/donations")
@RequiredArgsConstructor
public class DonationController {

    private static final Logger logger = LoggerFactory.getLogger(DonationController.class);
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllDonations() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Donation> donations = donationRepository.findByUserId(user.getId());
            List<DonationDto> donationDtos = donations.stream()
                    .map(DonationDto::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(donationDtos);
        } catch (Exception e) {
            logger.error("Error retrieving donations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving donations: " + e.getMessage()));
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingDonations() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Donation> donations = donationRepository.findByUserIdAndStatus(user.getId(), "PENDING");
            List<DonationDto> donationDtos = donations.stream()
                    .map(DonationDto::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(donationDtos);
        } catch (Exception e) {
            logger.error("Error retrieving pending donations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving pending donations: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createDonation(@Valid @RequestBody Donation donation) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            donation.setUser(user);
            donation.setDonationDate(LocalDateTime.now());
            donation.setStatus("PENDING");
            
            Donation savedDonation = donationRepository.save(donation);
            DonationDto donationDto = DonationDto.fromEntity(savedDonation);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(donationDto);
        } catch (Exception e) {
            logger.error("Error creating donation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error creating donation: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDonationById(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Donation donation = donationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donation", "id", id));
            
            DonationDto donationDto = DonationDto.fromEntity(donation);
            return ResponseEntity.ok(donationDto);
        } catch (ResourceNotFoundException e) {
            logger.error("Donation not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error retrieving donation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving donation: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDonation(@PathVariable Long id, @Valid @RequestBody Donation donationDetails) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Donation donation = donationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donation", "id", id));
            
            donation.setMedicineName(donationDetails.getMedicineName());
            donation.setQuantity(donationDetails.getQuantity());
            donation.setExpiryDate(donationDetails.getExpiryDate());
            donation.setLocation(donationDetails.getLocation());
            donation.setNotes(donationDetails.getNotes());
            
            // Only allow status updates if the current status is "pending"
            if (donation.getStatusString().equals("PENDING") && donationDetails.getStatus() != null) {
                donation.setStatus(donationDetails.getStatusString());
                
                if (donationDetails.getStatusString().equals("COMPLETED")) {
                    donation.setCompletedDate(LocalDateTime.now());
                }
            }
            
            Donation updatedDonation = donationRepository.save(donation);
            DonationDto donationDto = DonationDto.fromEntity(updatedDonation);
            
            return ResponseEntity.ok(donationDto);
        } catch (ResourceNotFoundException e) {
            logger.error("Donation not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating donation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error updating donation: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDonation(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Donation donation = donationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donation", "id", id));
            
            // Only allow deletion if the donation is still pending
            if (!donation.getStatusString().equals("PENDING")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponseDto("Cannot delete a donation that is not in pending status"));
            }
            
            donationRepository.delete(donation);
            
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            logger.error("Donation not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error deleting donation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error deleting donation: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateDonationStatus(@PathVariable Long id, @RequestBody Map<String, String> statusUpdate) {
        try {
            logger.info("Updating donation status for ID: {}", id);
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Donation donation = donationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donation", "id", id));
            
            String newStatus = statusUpdate.get("status");
            if (newStatus == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponseDto("Status must be provided"));
            }
            
            logger.info("Updating donation status from {} to {}", donation.getStatusString(), newStatus);
            
            // Only allow status updates if the current status is "pending"
            if (!donation.getStatusString().equals("PENDING")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponseDto("Cannot update status of a donation that is not in pending status"));
            }
            
            // Use the setStatus method which handles validation
            donation.setStatus(newStatus);
            
            if (newStatus.equalsIgnoreCase("COMPLETED")) {
                donation.setCompletedDate(LocalDateTime.now());
            }
            
            Donation updatedDonation = donationRepository.save(donation);
            DonationDto donationDto = DonationDto.fromEntity(updatedDonation);
            
            logger.info("Donation status updated successfully to: {}", updatedDonation.getStatusString());
            
            return ResponseEntity.ok(donationDto);
        } catch (ResourceNotFoundException e) {
            logger.error("Donation not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating donation status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error updating donation status: " + e.getMessage()));
        }
    }
} 