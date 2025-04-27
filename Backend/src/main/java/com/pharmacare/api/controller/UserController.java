package com.pharmacare.api.controller;

import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.dto.UserProfileDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.CurrentUser;
import com.pharmacare.api.security.oauth2.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserRepository userRepository;

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER') or hasRole('PHARMACY') or hasRole('ADMIN')")
    public ResponseEntity<?> getCurrentUser(@CurrentUser UserPrincipal currentUser) {
        try {
            User user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));
            
            Map<String, Object> userResponse = new HashMap<>();
            userResponse.put("id", user.getId());
            userResponse.put("firstName", user.getFirstName());
            userResponse.put("lastName", user.getLastName());
            userResponse.put("email", user.getEmail());
            userResponse.put("imageUrl", user.getImageUrl());
            
            return ResponseEntity.ok(userResponse);
        } catch (Exception e) {
            logger.error("Error retrieving current user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving user details"));
        }
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('USER') or hasRole('PHARMACY') or hasRole('ADMIN')")
    public ResponseEntity<?> getUserProfile(@CurrentUser UserPrincipal currentUser) {
        try {
            User user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));
            
            // For now, just return basic user info
            // In a real implementation, you would have a UserProfile entity with additional fields
            Map<String, Object> profileResponse = new HashMap<>();
            profileResponse.put("id", user.getId());
            profileResponse.put("firstName", user.getFirstName());
            profileResponse.put("lastName", user.getLastName());
            profileResponse.put("email", user.getEmail());
            profileResponse.put("imageUrl", user.getImageUrl());
            
            return ResponseEntity.ok(profileResponse);
        } catch (Exception e) {
            logger.error("Error retrieving user profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving user profile"));
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('USER') or hasRole('PHARMACY') or hasRole('ADMIN')")
    public ResponseEntity<?> updateUserProfile(@RequestBody UserProfileDto profileDto, @CurrentUser UserPrincipal currentUser) {
        try {
            User user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));
            
            // Update basic user fields
            if (profileDto.getFirstName() != null) {
                user.setFirstName(profileDto.getFirstName());
            }
            if (profileDto.getLastName() != null) {
                user.setLastName(profileDto.getLastName());
            }
            
            // Save updated user
            User updatedUser = userRepository.save(user);
            
            // Return complete response including non-persisted profile data
            Map<String, Object> profileResponse = new HashMap<>();
            profileResponse.put("id", updatedUser.getId());
            profileResponse.put("firstName", updatedUser.getFirstName());
            profileResponse.put("lastName", updatedUser.getLastName());
            profileResponse.put("email", updatedUser.getEmail());
            profileResponse.put("imageUrl", updatedUser.getImageUrl());
            
            // Add additional profile fields (not stored in database yet)
            if (profileDto.getPhone() != null) {
                profileResponse.put("phone", profileDto.getPhone());
            }
            if (profileDto.getDateOfBirth() != null) {
                profileResponse.put("dateOfBirth", profileDto.getDateOfBirth());
            }
            if (profileDto.getAddress() != null) {
                profileResponse.put("address", profileDto.getAddress());
            }
            if (profileDto.getBloodType() != null) {
                profileResponse.put("bloodType", profileDto.getBloodType());
            }
            if (profileDto.getAllergies() != null) {
                profileResponse.put("allergies", profileDto.getAllergies());
            }
            if (profileDto.getEmergencyContact() != null) {
                profileResponse.put("emergencyContact", profileDto.getEmergencyContact());
            }
            
            return ResponseEntity.ok(profileResponse);
        } catch (Exception e) {
            logger.error("Error updating user profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error updating user profile: " + e.getMessage()));
        }
    }
} 