package com.pharmacare.api.controller;

import com.pharmacare.api.dto.CreateReminderDto;
import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.dto.ReminderDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.Medication;
import com.pharmacare.api.model.Reminder;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.MedicationRepository;
import com.pharmacare.api.repository.ReminderRepository;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private static final Logger logger = LoggerFactory.getLogger(ReminderController.class);
    private final ReminderRepository reminderRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllReminders() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Reminder> reminders = reminderRepository.findByMedicationUserId(user.getId());
            
            return ResponseEntity.ok(reminders);
        } catch (Exception e) {
            logger.error("Error retrieving reminders", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving reminders: " + e.getMessage()));
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingReminders(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Reminder> reminders;
            if (start != null && end != null) {
                LocalDateTime startDate = LocalDateTime.parse(start);
                LocalDateTime endDate = LocalDateTime.parse(end);
                reminders = reminderRepository.findByMedicationUserIdAndCompletedFalseAndReminderTimeBetween(
                        user.getId(), startDate, endDate);
            } else {
                reminders = reminderRepository.findByMedicationUserIdAndCompletedFalse(user.getId());
            }
            
            return ResponseEntity.ok(reminders);
        } catch (Exception e) {
            logger.error("Error retrieving pending reminders", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving pending reminders: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createReminder(@Valid @RequestBody CreateReminderDto reminderDto) {
        try {
            logger.info("Creating reminder from DTO: {}", reminderDto);
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.info("User authenticated: {}", userPrincipal.getId());
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            logger.info("User found: {}", user.getId());
            
            Medication medication = medicationRepository.findByIdAndUserId(reminderDto.getMedicationId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", reminderDto.getMedicationId()));
            logger.info("Medication found: {}", medication.getId());
            
            // Create a new Reminder object to avoid any potential issues with the incoming object
            Reminder newReminder = new Reminder();
            newReminder.setMedication(medication);
            newReminder.setUser(user); // Essential: Set the user explicitly
            newReminder.setReminderTime(reminderDto.getReminderTime());
            newReminder.setNotes(reminderDto.getNotes());
            newReminder.setCompleted(reminderDto.isCompleted());
            
            logger.info("Prepared new reminder object with user {}, medication {}", user.getId(), medication.getId());
            
            Reminder savedReminder = reminderRepository.save(newReminder);
            logger.info("Reminder saved successfully with ID: {}", savedReminder.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedReminder);
        } catch (ResourceNotFoundException e) {
            logger.error("Resource not found error creating reminder", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error creating reminder", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error creating reminder: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getReminderById(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Reminder reminder = reminderRepository.findByIdAndMedicationUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reminder", "id", id));
            
            return ResponseEntity.ok(reminder);
        } catch (ResourceNotFoundException e) {
            logger.error("Reminder not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error retrieving reminder", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving reminder: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReminder(@PathVariable Long id, @Valid @RequestBody Reminder reminderDetails) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Reminder reminder = reminderRepository.findByIdAndMedicationUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reminder", "id", id));
            
            if (reminderDetails.getMedicationId() != null && 
                !reminderDetails.getMedicationId().equals(reminder.getMedication().getId())) {
                Medication medication = medicationRepository.findByIdAndUserId(reminderDetails.getMedicationId(), user.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", reminderDetails.getMedicationId()));
                reminder.setMedication(medication);
            }
            
            reminder.setReminderTime(reminderDetails.getReminderTime());
            reminder.setNotes(reminderDetails.getNotes());
            reminder.setCompleted(reminderDetails.isCompleted());
            reminder.setUser(user);
            
            if (reminderDetails.isCompleted() && reminder.getCompletedAt() == null) {
                reminder.setCompletedAt(LocalDateTime.now());
            } else if (!reminderDetails.isCompleted()) {
                reminder.setCompletedAt(null);
            }
            
            Reminder updatedReminder = reminderRepository.save(reminder);
            return ResponseEntity.ok(updatedReminder);
        } catch (ResourceNotFoundException e) {
            logger.error("Reminder or medication not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating reminder", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error updating reminder: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReminder(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Reminder reminder = reminderRepository.findByIdAndMedicationUserId(id, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reminder", "id", id));
            
            reminderRepository.delete(reminder);
            
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            logger.error("Reminder not found", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error deleting reminder", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error deleting reminder: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeReminder(@PathVariable Long id) {
        try {
            logger.info("Starting process to mark reminder as complete: id={}", id);
            
            // Get authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                logger.error("Authentication invalid or not found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponseDto(HttpStatus.UNAUTHORIZED.value(), "User not authenticated"));
            }
            
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.info("User authenticated: id={}", userPrincipal.getId());
            
            // Retrieve user
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            logger.info("User found: id={}", user.getId());
            
            // Retrieve reminder with security check
            logger.info("Looking for reminder with id={} for user={}", id, user.getId());
            Reminder reminder = reminderRepository.findByIdAndMedicationUserId(id, user.getId())
                    .orElseThrow(() -> {
                        logger.error("Reminder with id={} not found for user={}", id, user.getId());
                        return new ResourceNotFoundException("Reminder", "id", id);
                    });
            logger.info("Reminder found: id={}, medication={}, current completed status={}", 
                    reminder.getId(), 
                    reminder.getMedication() != null ? reminder.getMedication().getId() : "null", 
                    reminder.isCompleted());
            
            // Update reminder status
            boolean wasAlreadyCompleted = reminder.isCompleted();
            reminder.setCompleted(true);
            
            // Only set completedAt if it wasn't already completed
            if (!wasAlreadyCompleted) {
                LocalDateTime now = LocalDateTime.now();
                reminder.setCompletedAt(now);
                logger.info("Set completedAt to: {}", now);
            } else {
                logger.info("Reminder was already marked as completed");
            }
            
            // Ensure user is set (defensive programming)
            reminder.setUser(user);
            
            // Handle medication association
            if (reminder.getMedication() == null) {
                logger.warn("Reminder has no medication association, attempting to recover");
                
                if (reminder.getMedicationId() != null) {
                    logger.info("Attempting to recover medication with ID: {}", reminder.getMedicationId());
                    
                    try {
                        Medication medication = medicationRepository.findByIdAndUserId(reminder.getMedicationId(), user.getId())
                                .orElse(null);
                        
                        if (medication != null) {
                            reminder.setMedication(medication);
                            logger.info("Successfully recovered medication: id={}, name={}", 
                                    medication.getId(), medication.getName());
                        } else {
                            logger.warn("Could not find medication with id={} for user={}", 
                                    reminder.getMedicationId(), user.getId());
                        }
                    } catch (Exception e) {
                        logger.error("Error recovering medication: {}", e.getMessage(), e);
                        // We continue even if medication recovery fails
                    }
                } else {
                    logger.warn("No medication ID available for recovery");
                }
            } else {
                logger.info("Reminder already has medication association: id={}, name={}", 
                        reminder.getMedication().getId(), reminder.getMedication().getName());
            }
            
            // Save the updated reminder
            logger.info("Saving reminder with completed=true");
            Reminder completedReminder = reminderRepository.save(reminder);
            logger.info("Reminder successfully saved with completed=true, id={}", completedReminder.getId());
            
            return ResponseEntity.ok(completedReminder);
        } catch (ResourceNotFoundException ex) {
            logger.error("Resource not found: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto(HttpStatus.NOT_FOUND.value(), ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Error completing reminder: {}", ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto(HttpStatus.INTERNAL_SERVER_ERROR.value(), 
                            "An error occurred while completing the reminder: " + ex.getMessage()));
        }
    }
} 