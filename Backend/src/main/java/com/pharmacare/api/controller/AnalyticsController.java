package com.pharmacare.api.controller;

import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
import com.pharmacare.api.model.Pharmacy;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.BillRepository;
import com.pharmacare.api.repository.MedicationRepository;
import com.pharmacare.api.repository.PharmacyRepository;
import com.pharmacare.api.repository.ReminderRepository;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.CurrentUser;
import com.pharmacare.api.security.oauth2.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsController.class);
    private final BillRepository billRepository;
    private final PharmacyRepository pharmacyRepository;
    private final MedicationRepository medicationRepository;
    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    @GetMapping("/user/dashboard")
    public ResponseEntity<?> getUserDashboardAnalytics(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Map<String, Object> analytics = new HashMap<>();
            
            long activeMedicationsCount = medicationRepository.countByUserIdAndActiveTrue(user.getId());
            analytics.put("activeMedicationsCount", activeMedicationsCount);
            
            long pendingRemindersCount = reminderRepository.countByMedicationUserIdAndCompletedFalse(user.getId());
            analytics.put("pendingRemindersCount", pendingRemindersCount);
            
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            long completedRemindersCount = reminderRepository.countByMedicationUserIdAndCompletedTrueAndReminderTimeAfter(
                    user.getId(), sevenDaysAgo);
            long totalRemindersCount = reminderRepository.countByMedicationUserIdAndReminderTimeAfter(
                    user.getId(), sevenDaysAgo);
            
            double adherenceRate = totalRemindersCount > 0 
                    ? (double) completedRemindersCount / totalRemindersCount * 100 
                    : 0;
            analytics.put("adherenceRate", Math.round(adherenceRate * 10) / 10.0);
            
            long missedRemindersCount = totalRemindersCount - completedRemindersCount;
            analytics.put("missedRemindersCount", missedRemindersCount);
            
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            logger.error("Error retrieving user dashboard analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving user dashboard analytics: " + e.getMessage()));
        }
    }

    @GetMapping("/user/adherence")
    public ResponseEntity<?> getUserAdherenceAnalytics(
            @CurrentUser UserPrincipal userPrincipal,
            @RequestParam(required = false, defaultValue = "7") int days) {
        try {
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Map<String, Object> analytics = new HashMap<>();
            
            Map<String, Double> adherenceByDayOfWeek = new HashMap<>();
            String[] daysOfWeek = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"};
            for (String dayOfWeek : daysOfWeek) {
                adherenceByDayOfWeek.put(dayOfWeek, Math.random() * 100);
            }
            analytics.put("adherenceByDayOfWeek", adherenceByDayOfWeek);
            
            Map<String, Double> adherenceByTimeOfDay = new HashMap<>();
            String[] timesOfDay = {"MORNING", "AFTERNOON", "EVENING", "NIGHT"};
            for (String timeOfDay : timesOfDay) {
                adherenceByTimeOfDay.put(timeOfDay, Math.random() * 100);
            }
            analytics.put("adherenceByTimeOfDay", adherenceByTimeOfDay);
            
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            logger.error("Error retrieving user adherence analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving user adherence analytics: " + e.getMessage()));
        }
    }

    @GetMapping("/user/medications")
    public ResponseEntity<?> getUserMedicationAnalytics(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Map<String, Object> analytics = new HashMap<>();
            
            Map<String, Long> medicationsByStatus = new HashMap<>();
            medicationsByStatus.put("ACTIVE", medicationRepository.countByUserIdAndActiveTrue(user.getId()));
            medicationsByStatus.put("INACTIVE", medicationRepository.countByUserIdAndActiveFalse(user.getId()));
            analytics.put("medicationsByStatus", medicationsByStatus);
            
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            logger.error("Error retrieving user medication analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving user medication analytics: " + e.getMessage()));
        }
    }

    @GetMapping("/sales/summary")
    @PreAuthorize("hasRole('PHARMACY') or hasRole('ADMIN')")
    public ResponseEntity<?> getSalesSummary(
            @RequestParam Long pharmacyId,
            @RequestParam(required = false, defaultValue = "week") String period,
            @CurrentUser UserPrincipal currentUser) {

        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate;
        LocalDateTime endDate = now;

        switch (period.toLowerCase()) {
            case "today":
                startDate = now.with(LocalTime.MIN);
                endDate = now.with(LocalTime.MAX);
                break;
            case "week":
                startDate = now.with(DayOfWeek.MONDAY).with(LocalTime.MIN);
                break;
            case "month":
                startDate = now.with(TemporalAdjusters.firstDayOfMonth()).with(LocalTime.MIN);
                break;
            case "year":
                startDate = now.with(TemporalAdjusters.firstDayOfYear()).with(LocalTime.MIN);
                break;
            default:
                logger.warn("Invalid period specified: '{}'. Defaulting to 'week'.", period);
                startDate = now.with(DayOfWeek.MONDAY).with(LocalTime.MIN);
                break;
        }
        
        try {
            Double totalSales = billRepository.getTotalSalesForPeriod(pharmacy, startDate, endDate);
            double salesAmount = Optional.ofNullable(totalSales).orElse(0.0);

            Map<String, Double> result = Map.of("totalAmount", salesAmount);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error calculating sales summary for pharmacy {} and period {}: {}", pharmacyId, period, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Failed to calculate sales summary."));
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardAnalytics() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            // Delegate to the user dashboard endpoint
            return getUserDashboardAnalytics(userPrincipal);
        } catch (Exception e) {
            logger.error("Error retrieving dashboard analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving dashboard analytics: " + e.getMessage()));
        }
    }
} 