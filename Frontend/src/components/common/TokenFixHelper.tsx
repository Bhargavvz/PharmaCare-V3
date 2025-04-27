import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

/**
 * A silent utility component that helps fix token storage issues
 * It detects and resolves discrepancies between localStorage and app state
 */
const TokenFixHelper: React.FC = () => {
  const { token, setToken, currentUser, setCurrentUser } = useAuth();
  
  useEffect(() => {
    // Check for token mismatches between localStorage and app state
    const storedToken = localStorage.getItem('token');
    const userDataExists = !!localStorage.getItem('userData');
    
    // Case 1: Have token in localStorage but not in app state
    if (storedToken && !token) {
      console.log('TokenFixHelper: Found token in localStorage but not in app state, restoring...');
      setToken(storedToken);
    }
    
    // Case 2: Have token in app state but not in localStorage
    if (token && !storedToken) {
      console.log('TokenFixHelper: Found token in app state but not in localStorage, saving...');
      localStorage.setItem('token', token);
    }
    
    // Case 3: No token at all but we have user data (token was lost)
    if (!token && !storedToken && userDataExists) {
      console.warn('TokenFixHelper: Found user data but no token anywhere, clearing corrupted state');
      // We can't fix this automatically, user needs to login again
      localStorage.removeItem('userData');
      
      // Only show toast if we actually had current user loaded
      if (currentUser) {
        setCurrentUser(null);
        toast.error('Your session has expired. Please log in again.');
      }
    }
  }, [token, setToken, currentUser, setCurrentUser]);
  
  // This component doesn't render anything
  return null;
};

export default TokenFixHelper; 