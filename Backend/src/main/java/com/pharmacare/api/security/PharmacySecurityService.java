package com.pharmacare.api.security;

import com.pharmacare.api.model.Pharmacy;
import com.pharmacare.api.model.PharmacyStaff;
import com.pharmacare.api.model.User;
import com.pharmacare.api.repository.PharmacyRepository;
import com.pharmacare.api.repository.PharmacyStaffRepository;
import com.pharmacare.api.repository.UserRepository;
import com.pharmacare.api.security.oauth2.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PharmacySecurityService {

    private final PharmacyRepository pharmacyRepository;
    private final PharmacyStaffRepository pharmacyStaffRepository;
    private final UserRepository userRepository;

    /**
     * Check if the user is a member of the pharmacy (either owner or staff)
     */
    public boolean isPharmacyMember(Long pharmacyId, UserPrincipal userPrincipal) {
        try {
            // Get the pharmacy
            Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                    .orElse(null);
            
            if (pharmacy == null) {
                return false;
            }
            
            // Get the user
            User user = userRepository.findById(userPrincipal.getId())
                    .orElse(null);
            
            if (user == null) {
                return false;
            }
            
            // Check if user is the owner
            if (pharmacy.getOwner() != null && pharmacy.getOwner().getId().equals(user.getId())) {
                return true;
            }
            
            // Check if user is a staff member
            List<PharmacyStaff> staffMembers = pharmacyStaffRepository.findByPharmacy(pharmacy);
            return staffMembers.stream()
                    .anyMatch(staff -> staff.getUser().getId().equals(user.getId()) && staff.isActive());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if the user is an admin of the pharmacy (either owner or admin staff)
     */
    public boolean isPharmacyAdmin(Long pharmacyId, UserPrincipal userPrincipal) {
        try {
            // Get the pharmacy
            Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                    .orElse(null);
            
            if (pharmacy == null) {
                return false;
            }
            
            // Get the user
            User user = userRepository.findById(userPrincipal.getId())
                    .orElse(null);
            
            if (user == null) {
                return false;
            }
            
            // Check if user is the owner
            if (pharmacy.getOwner() != null && pharmacy.getOwner().getId().equals(user.getId())) {
                return true;
            }
            
            // Check if user is an admin staff member
            List<PharmacyStaff> staffMembers = pharmacyStaffRepository.findByPharmacyAndRole(
                    pharmacy, PharmacyStaff.StaffRole.ADMIN);
            return staffMembers.stream()
                    .anyMatch(staff -> staff.getUser().getId().equals(user.getId()) && staff.isActive());
        } catch (Exception e) {
            return false;
        }
    }
}