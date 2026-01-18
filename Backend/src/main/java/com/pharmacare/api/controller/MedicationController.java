package com.pharmacare.api.controller;

import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.Medication;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.MedicationRepository;
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
import java.util.List;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
public class MedicationController {

    private static final Logger logger = LoggerFactory.getLogger(MedicationController.class);
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllMedications() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Medication> medications = medicationRepository.findByUserId(user.getId());
            return ResponseEntity.ok(medications);
        } catch (Exception e) {
            logger.error("Error retrieving medications", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving medications: " + e.getMessage()));
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveMedications() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Medication> medications = medicationRepository.findByUserIdAndActiveTrue(user.getId());
            return ResponseEntity.ok(medications);
        } catch (Exception e) {
            logger.error("Error retrieving active medications", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving active medications: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createMedication(@Valid @RequestBody Medication medication) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            medication.setUser(user);
            Medication savedMedication = medicationRepository.save(medication);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedMedication);
        } catch (Exception e) {
            logger.error("Error creating medication", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error creating medication: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMedicationById(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Medication medication = medicationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
            
            return ResponseEntity.ok(medication);
        } catch (ResourceNotFoundException e) {
            logger.error("Medication not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error retrieving medication", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving medication: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMedication(@PathVariable Long id, @Valid @RequestBody Medication medicationDetails) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Medication medication = medicationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
            
            medication.setName(medicationDetails.getName());
            medication.setDescription(medicationDetails.getDescription());
            medication.setDosage(medicationDetails.getDosage());
            medication.setFrequency(medicationDetails.getFrequency());
            medication.setStartDate(medicationDetails.getStartDate());
            medication.setEndDate(medicationDetails.getEndDate());
            medication.setActive(medicationDetails.isActive());
            
            Medication updatedMedication = medicationRepository.save(medication);
            return ResponseEntity.ok(updatedMedication);
        } catch (ResourceNotFoundException e) {
            logger.error("Medication not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating medication", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error updating medication: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMedication(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Medication medication = medicationRepository.findByIdAndUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
            
            medicationRepository.delete(medication);
            
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            logger.error("Medication not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error deleting medication", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error deleting medication: " + e.getMessage()));
        }
    }
} 