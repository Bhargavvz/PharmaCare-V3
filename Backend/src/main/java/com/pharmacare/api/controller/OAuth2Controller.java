package com.pharmacare.api.controller;

import com.pharmacare.api.dto.AuthResponseDto;
import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.dto.UserDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.JwtTokenProvider;
import com.pharmacare.api.security.oauth2.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/oauth2")
@RequiredArgsConstructor
public class OAuth2Controller {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;

    @GetMapping("/google/url")
    public ResponseEntity<?> getGoogleLoginUrl() {
        try {
            logger.info("Generating Google login URL");
            // This is the standard Spring Security OAuth2 authorization URL
            String googleLoginUrl = "/oauth2/authorization/google";
            
            Map<String, String> response = new HashMap<>();
            response.put("url", googleLoginUrl);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error generating Google login URL", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Failed to generate Google login URL: " + e.getMessage()));
        }
    }

    @GetMapping("/callback")
    public ResponseEntity<?> handleOAuth2Callback() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !authentication.isAuthenticated()) {
                logger.error("OAuth2 callback - Authentication is null or not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponseDto("Authentication failed"));
            }
            
            String jwt = tokenProvider.generateToken(authentication);
            
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            UserDto userDto = UserDto.builder()
                    .id(user.getId())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .email(user.getEmail())
                    .imageUrl(user.getImageUrl())
                    .roles(user.getRoles().stream()
                            .map(role -> role.getName().name())
                            .collect(Collectors.toSet()))
                    .createdAt(user.getCreatedAt())
                    .build();
            
            logger.info("OAuth2 callback successful for user: {}", user.getEmail());
            return ResponseEntity.ok(new AuthResponseDto(jwt, userDto));
        } catch (ClassCastException ex) {
            logger.error("OAuth2 callback - Principal is not of type UserPrincipal", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Authentication error: " + ex.getMessage()));
        } catch (Exception ex) {
            logger.error("OAuth2 callback - Unexpected error", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("An unexpected error occurred: " + ex.getMessage()));
        }
    }
} 