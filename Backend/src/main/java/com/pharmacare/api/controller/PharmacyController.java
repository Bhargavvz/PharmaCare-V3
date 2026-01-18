package com.pharmacare.api.controller;

import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.dto.PharmacyDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.Bill;
import com.pharmacare.api.model.Pharmacy;
import com.pharmacare.api.model.PharmacyStaff;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.BillRepository;
import com.pharmacare.api.repository.PharmacyRepository;
import com.pharmacare.api.repository.PharmacyStaffRepository;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.CurrentUser;
import com.pharmacare.api.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/pharmacies")
@RequiredArgsConstructor
public class PharmacyController {

    private static final Logger logger = LoggerFactory.getLogger(PharmacyController.class);

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private PharmacyStaffRepository pharmacyStaffRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillRepository billRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PharmacyDto>> getAllPharmacies() {
        List<Pharmacy> pharmacies = pharmacyRepository.findAll();
        List<PharmacyDto> pharmacyDtos = pharmacies.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(pharmacyDtos);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<?> getMyPharmacies(@CurrentUser UserPrincipal currentUser) {
        logger.info("Fetching pharmacies for user. Authentication present: {}", currentUser != null);
        
        if (currentUser == null) {
            logger.error("No authenticated user found in security context");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponseDto("No authenticated user found"));
        }

        try {
            List<PharmacyStaff> staffAssignments = pharmacyStaffRepository.findByUserId(currentUser.getId());
            logger.info("Found {} pharmacy assignments for user ID: {}", staffAssignments.size(), currentUser.getId());
            
            if (staffAssignments.isEmpty()) {
                logger.warn("No pharmacy assignments found for user ID: {}", currentUser.getId());
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<PharmacyDto> pharmacyDtos = staffAssignments.stream()
                    .map(PharmacyStaff::getPharmacy)
                    .distinct()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(pharmacyDtos);
        } catch (Exception e) {
            logger.error("Error fetching pharmacies for user {}: {}", currentUser.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDto("Failed to fetch pharmacies: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @pharmacySecurityService.isPharmacyMember(#id, principal)")
    public ResponseEntity<PharmacyDto> getPharmacy(@PathVariable Long id, @CurrentUser UserPrincipal currentUser) {
        Pharmacy pharmacy = pharmacyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found with id: " + id));
        return ResponseEntity.ok(convertToDto(pharmacy));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PharmacyDto> createPharmacy(@RequestBody PharmacyDto pharmacyDto, @CurrentUser UserPrincipal currentUser) {
        User actionUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Action performing user not found"));
                
        if (pharmacyRepository.existsByRegistrationNumber(pharmacyDto.getRegistrationNumber())) {
            return ResponseEntity.badRequest().body(null);
        }

        Pharmacy pharmacy = Pharmacy.builder()
                .name(pharmacyDto.getName())
                .registrationNumber(pharmacyDto.getRegistrationNumber())
                .address(pharmacyDto.getAddress())
                .phone(pharmacyDto.getPhone())
                .email(pharmacyDto.getEmail())
                .website(pharmacyDto.getWebsite())
                .active(true)
                .owner(actionUser)
                .build();

        Pharmacy savedPharmacy = pharmacyRepository.save(pharmacy);
        return ResponseEntity.ok(convertToDto(savedPharmacy));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @pharmacySecurityService.isPharmacyAdmin(#id, principal)")
    public ResponseEntity<PharmacyDto> updatePharmacy(@PathVariable Long id, @RequestBody PharmacyDto pharmacyDto, @CurrentUser UserPrincipal currentUser) {
        Pharmacy pharmacy = pharmacyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found with id: " + id));

        pharmacy.setName(pharmacyDto.getName());
        pharmacy.setAddress(pharmacyDto.getAddress());
        pharmacy.setPhone(pharmacyDto.getPhone());
        pharmacy.setEmail(pharmacyDto.getEmail());
        pharmacy.setWebsite(pharmacyDto.getWebsite());
        pharmacy.setActive(pharmacyDto.isActive());

        Pharmacy updatedPharmacy = pharmacyRepository.save(pharmacy);
        return ResponseEntity.ok(convertToDto(updatedPharmacy));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @pharmacySecurityService.isPharmacyAdmin(#id, principal)")
    public ResponseEntity<?> deletePharmacy(@PathVariable Long id, @CurrentUser UserPrincipal currentUser) {
        Pharmacy pharmacy = pharmacyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found with id: " + id));

        pharmacy.setActive(false);
        pharmacyRepository.save(pharmacy);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{pharmacyId}/activity")
    @PreAuthorize("hasRole('PHARMACY') or hasRole('ADMIN')")
    public ResponseEntity<?> getRecentActivity(
            @PathVariable Long pharmacyId,
            @RequestParam(required = false, defaultValue = "5") int limit,
            @CurrentUser UserPrincipal currentUser) {

        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                 .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        if (limit <= 0 || limit > 50) {
             return ResponseEntity.badRequest().body(new ErrorResponseDto("Limit must be between 1 and 50."));
        }

        try {
            List<ActivityItem> activities = new ArrayList<>();
            Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));

            List<Bill> recentBills = billRepository.findByPharmacyOrderByCreatedAtDesc(pharmacy, pageable);
            recentBills.forEach(bill -> activities.add(new ActivityItem(
                "bill-" + bill.getId(),
                "Bill #" + bill.getBillNumber() + " created for " + bill.getCustomerName(),
                bill.getCreatedAt(),
                "BILL_CREATED"
            )));
            
            activities.sort(Comparator.comparing(ActivityItem::getTimestamp).reversed());

            List<ActivityItem> limitedActivities = activities.stream().limit(limit).collect(Collectors.toList());

            return ResponseEntity.ok(limitedActivities);

        } catch (Exception e) {
            logger.error("Error fetching recent activity for pharmacy {}: {}", pharmacyId, e.getMessage());
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                     .body(new ErrorResponseDto("Failed to fetch recent activity."));
        }
    }

    private PharmacyDto convertToDto(Pharmacy pharmacy) {
        return PharmacyDto.builder()
                .id(pharmacy.getId())
                .name(pharmacy.getName())
                .registrationNumber(pharmacy.getRegistrationNumber())
                .address(pharmacy.getAddress())
                .phone(pharmacy.getPhone())
                .email(pharmacy.getEmail())
                .website(pharmacy.getWebsite())
                .active(pharmacy.isActive())
                .ownerId(pharmacy.getOwner() != null ? pharmacy.getOwner().getId() : null)
                .ownerName(pharmacy.getOwner() != null ? pharmacy.getOwner().getFirstName() + " " + pharmacy.getOwner().getLastName() : null)
                .createdAt(pharmacy.getCreatedAt())
                .updatedAt(pharmacy.getUpdatedAt())
                .build();
    }

    @Data
    @AllArgsConstructor
    static class ActivityItem {
        private String id;
        private String description;
        private LocalDateTime timestamp;
        private String type;
    }
} 