import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

// Basic User (Patient)
interface BaseUser {
  id: number; // Changed to number based on typical DB IDs
  email: string;
  firstName: string;
  lastName: string;
  roles: string[]; // Added roles
  imageUrl?: string;
  createdAt?: string; // Assuming ISO string format
}

// Pharmacy Staff User (Extends BaseUser or uses details from PharmacyStaffDto)
// Based on PharmacyStaffDto structure from backend edits
interface PharmacyStaffUser {
  id: number; // Staff ID
  pharmacyId: number;
  userId: number; // Corresponds to the User entity ID
  role: string; // e.g., "ADMIN", "CASHIER"
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  // User details duplicated for convenience
  firstName: string;
  lastName: string;
  email: string;
  // Some responses may have the full pharmacy object
  pharmacy?: {
    id: number;
    name: string;
    registrationNumber?: string;
    address?: string;
    [key: string]: any; // Allow other pharmacy properties
  };
}

// Union type for the currently logged-in user
type CurrentUser = BaseUser | PharmacyStaffUser;

// Helper type guard
export function isPharmacyStaffUser(user: CurrentUser | null): user is PharmacyStaffUser {
  if (user === null) {
    console.log('isPharmacyStaffUser: user is null');
    return false;
  }
  
  console.log('isPharmacyStaffUser: Checking user:', JSON.stringify(user, null, 2));
  
  // Most reliable check: userType property
  if ('userType' in user && user.userType === 'pharmacy') {
    console.log('isPharmacyStaffUser: TRUE - has userType="pharmacy"');
    return true;
  }
  
  // Very reliable: has pharmacyId property
  if ('pharmacyId' in user && user.pharmacyId) {
    console.log('isPharmacyStaffUser: TRUE - has pharmacyId=' + user.pharmacyId);
    return true;
  }
  
  // Reliable: pharmacy property
  if ('pharmacy' in user && typeof user.pharmacy === 'object' && user.pharmacy !== null && 'id' in user.pharmacy) {
    console.log('isPharmacyStaffUser: TRUE - has pharmacy.id=' + user.pharmacy.id);
    return true;
  }
  
  // Check role property (medium reliability)
  if ('role' in user && typeof user.role === 'string') {
    const role = user.role.toUpperCase();
    if (role === 'ADMIN' || role === 'CASHIER' || role === 'MANAGER' || role.includes('PHARMACY')) {
      console.log('isPharmacyStaffUser: TRUE - has pharmacy role=' + role);
      return true;
    }
  }
  
  // Check roles array (less reliable)
  if ('roles' in user && Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === 'string' && 
          (role.includes('PHARMACY') || role === 'ROLE_PHARMACY' || role === 'ADMIN')) {
        console.log('isPharmacyStaffUser: TRUE - has roles array with ' + role);
        return true;
      }
    }
  }
  
  console.log('isPharmacyStaffUser: FALSE - user is not pharmacy staff');
  return false;
}

interface AuthContextType {
  currentUser: CurrentUser | null;
  token: string | null;
  loading: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [token, setAuthStateToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Define setToken which updates state and localStorage
  const setToken = useCallback((newToken: string | null) => {
    setAuthStateToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }, []);
  
  // Initial attempt to load user data from localStorage to prevent flicker/redirect
  useEffect(() => {
    try {
      // Check if there's user data stored locally we can use right away
      const cachedUserData = localStorage.getItem('userData');
      const storedToken = localStorage.getItem('token');
      
      console.log('Initial load check - Token exists:', !!storedToken, 'Cached data exists:', !!cachedUserData);
      
      // If we have userData but no token, clear the corrupted state
      if (cachedUserData && !storedToken) {
        console.log('Initial load - Found user data but no token, clearing corrupted state');
        localStorage.removeItem('userData');
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      if (cachedUserData) {
        try {
          const userData = JSON.parse(cachedUserData);
          console.log('Initial load - Parsed userData:', JSON.stringify(userData, null, 2));
          
          // Set token state if we have a token in localStorage
          if (storedToken && !token) {
            console.log('Initial load - Setting token from localStorage');
            setAuthStateToken(storedToken);
          }
          
          // Enhanced checks for pharmacy staff user
          if ('pharmacyId' in userData || 'userType' in userData || ('roles' in userData && userData.roles.includes('ROLE_PHARMACY'))) {
            console.log('Initial load - Detected as pharmacy staff');
            
            // Ensure userType is set
            if (!('userType' in userData)) {
              userData.userType = 'pharmacy';
            }
            
            // Ensure pharmacyId exists (for backward compatibility)
            if (!userData.pharmacyId && userData.pharmacy && userData.pharmacy.id) {
              console.log('Initial load - Adding missing pharmacyId from pharmacy.id');
              userData.pharmacyId = userData.pharmacy.id;
            }
            
            console.log('Initial load - Setting currentUser as pharmacy staff');
            setCurrentUser(userData as PharmacyStaffUser);
            
            // Update localStorage with enhanced data
            localStorage.setItem('userData', JSON.stringify(userData));
          } else if ('roles' in userData) {
            console.log('Initial load - Setting currentUser as BaseUser');
            setCurrentUser(userData as BaseUser);
          } else {
            console.warn('Initial load - userData exists but does not match expected formats:', userData);
          }
        } catch (e) {
          console.error('Initial load - Error parsing userData JSON:', e);
        }
      } else {
        console.log('Initial load - No userData found in localStorage');
      }
    } catch (error) {
      console.error('Error in initial user data loading:', error);
    } finally {
      // If there's no token, we're definitely not logged in, so we can set loading=false
      if (!localStorage.getItem('token')) {
        console.log('Initial load - No token, setting loading=false');
        setLoading(false);
      }
    }
  }, [token, setAuthStateToken]);

  useEffect(() => {
    const validateToken = async () => {
      // Check localStorage first for token
      const localStorageToken = localStorage.getItem('token');
      
      // If the token in state doesn't match localStorage, update it
      if (localStorageToken && localStorageToken !== token) {
        console.log('validateToken: Found token in localStorage different from state, updating');
        setAuthStateToken(localStorageToken);
        return; // Return and let the next useEffect cycle handle validation
      }
      
      // If no token in state and none in localStorage, we're not logged in
      if (!token && !localStorageToken) {
        console.log('validateToken: No token in state or localStorage, user is not logged in');
        setLoading(false);
        setCurrentUser(null);
        return;
      }
      
      // Use token from state or localStorage for validation
      const tokenToValidate = token || localStorageToken;
      
      if (!tokenToValidate) {
        setLoading(false);
        setCurrentUser(null);
        return;
      }

      setLoading(true);
      try {
        console.log('Validating token...');
        
        // Check if we already have pharmacy staff data in localStorage
        const cachedUserData = localStorage.getItem('userData');
        let cachedPharmacyStaff = null;
        
        if (cachedUserData) {
          try {
            const userData = JSON.parse(cachedUserData);
            // If it's pharmacy staff data, keep it for reference
            if ('pharmacyId' in userData) {
              console.log('Found cached pharmacy staff data in localStorage');
              cachedPharmacyStaff = userData;
            }
          } catch (e) {
            console.error('Error parsing cached user data:', e);
          }
        }
        
        // Use fetch directly here as api.ts interceptor might cause redirect loop if validation fails
        const response = await fetch(`${API_URL}/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenToValidate}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Token valid, validation data:', data);
          
          // If we have pharmacy staff data in cache AND validation returned base user with ROLE_PHARMACY,
          // we should prioritize the pharmacy staff data
          if (cachedPharmacyStaff && 
              'roles' in data && 
              Array.isArray(data.roles) && 
              data.roles.includes('ROLE_PHARMACY')) {
            
            console.log('Using cached pharmacy staff data instead of base user data');
            setCurrentUser(cachedPharmacyStaff as PharmacyStaffUser);
            // Store in localStorage again to ensure it's saved correctly
            localStorage.setItem('userData', JSON.stringify(cachedPharmacyStaff));
            setLoading(false);
            return;
          }
          
          // Continue with normal validation response handling
          // Check if the response matches our expected ValidatedUserDto structure
          if (data && typeof data === 'object' && 'userType' in data && 'userData' in data) {
            // New format with userType/userData
            if (data.userType === 'pharmacy' && data.userData) {
              const pharmacyStaffData = data.userData as PharmacyStaffUser;
              setCurrentUser(pharmacyStaffData);
              console.log('Set currentUser as PharmacyStaffUser from ValidatedUserDto');
              // Store in localStorage for quick access on refresh/remount
              localStorage.setItem('userData', JSON.stringify(pharmacyStaffData));
            } else if (data.userType === 'user' && data.userData) {
              const baseUserData = data.userData as BaseUser;
              setCurrentUser(baseUserData);
              console.log('Set currentUser as BaseUser from ValidatedUserDto');
              // Store in localStorage for quick access on refresh/remount
              localStorage.setItem('userData', JSON.stringify(baseUserData));
            } else {
              console.error('Token validation returned unexpected data structure:', data);
              setToken(null);
              setCurrentUser(null);
              localStorage.removeItem('userData');
            }
          } 
          // Fallback: Handle legacy format where the response is the user object directly
          else if (data && typeof data === 'object') {
            // Check if it has pharmacyId (PharmacyStaffUser) or not (BaseUser)
            if ('pharmacyId' in data) {
              setCurrentUser(data as PharmacyStaffUser);
              console.log('Set currentUser as PharmacyStaffUser from direct object');
              // Store in localStorage for quick access on refresh/remount
              localStorage.setItem('userData', JSON.stringify(data));
            } else {
              // If it has roles, it's likely a BaseUser
              setCurrentUser(data as BaseUser);
              console.log('Set currentUser as BaseUser from direct object');
              // Store in localStorage for quick access on refresh/remount
              localStorage.setItem('userData', JSON.stringify(data));
            }
          } else {
            console.error('Token validation returned invalid data:', data);
            setToken(null);
            setCurrentUser(null);
            localStorage.removeItem('userData');
          }
        } else {
          console.log('Token validation failed:', response.status);
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, setToken]);

  const logout = useCallback(() => {
    console.log('Logging out...');
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('userData');
    navigate('/login');
  }, [setToken, navigate]);

  const value = {
    currentUser,
    token,
    loading,
    setCurrentUser,
    setToken,
    logout
  };

  // Render children only when loading is finished to prevent flicker
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : null /* Or a global loading spinner */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
