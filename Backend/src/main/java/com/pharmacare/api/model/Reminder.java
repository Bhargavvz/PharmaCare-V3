package com.pharmacare.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "reminders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "medication_id", nullable = false)
    @JsonIgnore
    private Medication medication;

    @Column(nullable = false)
    private LocalDateTime reminderTime;

    private String notes;

    @Column(nullable = false)
    private boolean completed = false;

    private LocalDateTime completedAt;

    @Transient
    private Long medicationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public Long getMedicationId() {
        return medication != null ? medication.getId() : medicationId;
    }

    @JsonProperty("medicationId")
    public void setMedicationId(Long medicationId) {
        this.medicationId = medicationId;
    }

    @JsonProperty("medicationName")
    public String getMedicationName() {
        return medication != null ? medication.getName() : null;
    }

    @JsonProperty("medicationDosage")
    public String getMedicationDosage() {
        return medication != null ? medication.getDosage() : null;
    }
} 