import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

// Basic User (Patient)
interface BaseUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  imageUrl?: string;
  createdAt?: string;
}

// Pharmacy Staff User
interface PharmacyStaffUser {
  id: number;
  pharmacyId: number;
  userId: number;
  role: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  firstName: string;
  lastName: string;
  email: string;
  pharmacy?: {
    id: number;
    name: string;
    registrationNumber?: string;
    address?: string;
    [key: string]: any;
  };
}

// Union type for the currently logged-in user
type CurrentUser = BaseUser | PharmacyStaffUser;

// Helper type guard
export function isPharmacyStaffUser(user: CurrentUser | null): user is PharmacyStaffUser {
  if (user === null) return false;
  
  // Check for pharmacyId property (most reliable indicator)
  return 'pharmacyId' in user && user.pharmacyId !== undefined;
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
  
  // Load user data from localStorage on initial load
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const cachedUserData = localStorage.getItem('userData');
        
        // If no token, user is not logged in
        if (!storedToken) {
          setLoading(false);
          return;
        }
        
        // Set token in state
        setAuthStateToken(storedToken);
        
        // If we have cached user data, use it initially
        if (cachedUserData) {
          try {
            const userData = JSON.parse(cachedUserData);
            setCurrentUser(userData);
          } catch (e) {
            console.error('Error parsing cached user data:', e);
          }
        }
        
        // Validate token with backend
        const response = await fetch(`${API_URL}/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle the response based on its structure
          let userData;
          if (data && typeof data === 'object' && 'userType' in data && 'userData' in data) {
            // New format with userType/userData
            userData = data.userData;
          } else if (data && typeof data === 'object') {
            // Legacy format
            userData = data;
          }
          
          if (userData) {
            setCurrentUser(userData);
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
          }
        } else {
          // Token is invalid, clear everything
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // On error, clear everything
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [setToken, setAuthStateToken]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
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
