package com.pharmacare.api.controller;

import com.pharmacare.api.dto.ErrorResponseDto;
import com.pharmacare.api.exception.ResourceNotFoundException;
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

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardsController {

    private static final Logger logger = LoggerFactory.getLogger(RewardsController.class);
    private final MedicationRepository medicationRepository;
    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getRewardsDashboard() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            Map<String, Object> rewardsData = new HashMap<>();
            
            // Calculate points based on adherence
            LocalDateTime thirtyDaysAgo = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
            long completedRemindersCount = reminderRepository.countByMedicationUserIdAndCompletedTrueAndReminderTimeAfter(
                    user.getId(), thirtyDaysAgo);
            
            // Assume 10 points per completed reminder
            int adherencePoints = (int) completedRemindersCount * 10;
            
            // Calculate streak
            int currentStreak = calculateStreak(user.getId());
            
            // Calculate total points
            int totalPoints = adherencePoints + (currentStreak * 5); // 5 points per day in streak
            
            rewardsData.put("totalPoints", totalPoints);
            rewardsData.put("adherencePoints", adherencePoints);
            rewardsData.put("currentStreak", currentStreak);
            rewardsData.put("level", calculateLevel(totalPoints));
            
            // Get available rewards
            rewardsData.put("availableRewards", getAvailableRewards(totalPoints));
            
            return ResponseEntity.ok(rewardsData);
        } catch (Exception e) {
            logger.error("Error retrieving rewards dashboard", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving rewards dashboard: " + e.getMessage()));
        }
    }

    private int calculateStreak(Long userId) {
        // This is a placeholder implementation
        // In a real application, you would calculate the streak based on the user's reminder completion history
        return (int) (Math.random() * 10) + 1; // Random streak between 1 and 10
    }

    private String calculateLevel(int points) {
        if (points >= 1000) {
            return "PLATINUM";
        } else if (points >= 500) {
            return "GOLD";
        } else if (points >= 200) {
            return "SILVER";
        } else {
            return "BRONZE";
        }
    }

    private List<Map<String, Object>> getAvailableRewards(int points) {
        List<Map<String, Object>> rewards = new ArrayList<>();
        
        // These are placeholder rewards
        // In a real application, you would fetch rewards from a database
        
        Map<String, Object> reward1 = new HashMap<>();
        reward1.put("id", 1);
        reward1.put("name", "10% Off Next Prescription");
        reward1.put("description", "Get 10% off your next prescription refill at participating pharmacies");
        reward1.put("points", 500);
        reward1.put("available", points >= 500);
        
        Map<String, Object> reward2 = new HashMap<>();
        reward2.put("id", 2);
        reward2.put("name", "Free Health Check");
        reward2.put("description", "Complimentary basic health check at partner clinics");
        reward2.put("points", 1000);
        reward2.put("available", points >= 1000);
        
        Map<String, Object> reward3 = new HashMap<>();
        reward3.put("id", 3);
        reward3.put("name", "Premium Membership Month");
        reward3.put("description", "One month of premium membership features");
        reward3.put("points", 750);
        reward3.put("available", points >= 750);
        
        rewards.add(reward1);
        rewards.add(reward2);
        rewards.add(reward3);
        
        return rewards;
    }

    @GetMapping("/achievements")
    public ResponseEntity<?> getAchievements() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));
            
            List<Map<String, Object>> achievements = new ArrayList<>();
            
            // These are placeholder achievements
            // In a real application, you would calculate achievement progress based on user data
            
            Map<String, Object> achievement1 = new HashMap<>();
            achievement1.put("title", "Perfect Week");
            achievement1.put("description", "Take all medications on time for a week");
            achievement1.put("progress", 5);
            achievement1.put("total", 7);
            achievement1.put("points", 100);
            
            Map<String, Object> achievement2 = new HashMap<>();
            achievement2.put("title", "Donation Hero");
            achievement2.put("description", "Donate medicines 3 times");
            achievement2.put("progress", 2);
            achievement2.put("total", 3);
            achievement2.put("points", 150);
            
            Map<String, Object> achievement3 = new HashMap<>();
            achievement3.put("title", "Family Care");
            achievement3.put("description", "Add and manage 3 family members");
            achievement3.put("progress", 1);
            achievement3.put("total", 3);
            achievement3.put("points", 200);
            
            achievements.add(achievement1);
            achievements.add(achievement2);
            achievements.add(achievement3);
            
            return ResponseEntity.ok(achievements);
        } catch (Exception e) {
            logger.error("Error retrieving achievements", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error retrieving achievements: " + e.getMessage()));
        }
    }
} 