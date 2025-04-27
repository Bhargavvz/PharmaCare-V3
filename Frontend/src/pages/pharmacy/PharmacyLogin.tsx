import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Building2 } from 'lucide-react';
import { useAuth, isPharmacyStaffUser } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message: string;
}

const PharmacyLogin: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, setToken } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [hasCorruptedState, setHasCorruptedState] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    // Check for corrupted state - userData without token
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('token');
    if (userData && !token) {
      console.log('PharmacyLogin: Detected corrupted state - userData without token');
      setHasCorruptedState(true);
    }
  }, []);

  const clearStorageData = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setToken(null);
    setHasCorruptedState(false);
    toast.success('Session data cleared. You can now log in again.');
  };

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (currentUser && isPharmacyStaffUser(currentUser) && token) {
      console.log('Already logged in as pharmacy staff with valid token, redirecting to dashboard');
      window.location.href = '/pharmacy/dashboard?justLoggedIn=true';
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Attempting pharmacy login...');
      const response = await fetch(`${API_URL}/auth/pharmacy/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password.trim(),
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials or not authorized');
      }

      console.log('Pharmacy login successful, response data:', JSON.stringify(data, null, 2));
      
      // Validate pharmacy staff data structure
      if (!data.pharmacyStaff || !data.token) {
        throw new Error('Invalid response format from server');
      }
      
      // First clear any existing data
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      
      // Log pharmacy staff data for debugging
      console.log('PharmacyStaff data structure:', JSON.stringify(data.pharmacyStaff, null, 2));
      
      // Create the enhanced staff data with a clear type marker
      const enhancedPharmacyStaff = {
        ...data.pharmacyStaff,
        userType: 'pharmacy'
      };
      
      // Ensure it has the required pharmacyId property
      if (!enhancedPharmacyStaff.pharmacyId) {
        console.warn('PharmacyStaff data is missing pharmacyId property, attempting to fix');
        
        // If pharmacy staff object doesn't have pharmacyId but has pharmacy information, restructure it
        if (data.pharmacyStaff.pharmacy && data.pharmacyStaff.pharmacy.id) {
          console.log('Adding pharmacyId from pharmacy.id');
          enhancedPharmacyStaff.pharmacyId = data.pharmacyStaff.pharmacy.id;
        } else if (data.pharmacyId) {
          console.log('Adding pharmacyId from response root');
          enhancedPharmacyStaff.pharmacyId = data.pharmacyId;
        } else {
          throw new Error('Cannot determine pharmacy ID from server response');
        }
      }
      
      // Direct localStorage update first to ensure token is stored
      console.log('Setting token in localStorage:', data.token.substring(0, 20) + '...');
      localStorage.setItem('token', data.token);
      console.log('Setting userData in localStorage');
      localStorage.setItem('userData', JSON.stringify(enhancedPharmacyStaff));
      
      // Verify data was stored successfully
      const storedToken = localStorage.getItem('token');
      const storedUserData = localStorage.getItem('userData');
      console.log('Verification - Token saved:', !!storedToken, 'UserData saved:', !!storedUserData);
      
      // Then update application state
      setToken(data.token);
      setCurrentUser(enhancedPharmacyStaff);
      
      toast.success('Login successful! Welcome back!');
      
      // FORCE REDIRECT WITH TIMEOUT to ensure storage has synchronized
      console.log('Scheduling redirect to pharmacy dashboard...');
      
      // We'll try multiple redirect approaches with delays to ensure one works
      setTimeout(() => {
        console.log('REDIRECT ATTEMPT 1: Using window.location.href');
        window.location.href = '/pharmacy/dashboard?justLoggedIn=true';
      }, 100);
      
      // Backup redirect in case the first one fails
      setTimeout(() => {
        const isRedirected = window.location.pathname.includes('/pharmacy/dashboard');
        if (!isRedirected) {
          console.log('REDIRECT ATTEMPT 2: First redirect failed, trying window.location.replace');
          window.location.replace('/pharmacy/dashboard?justLoggedIn=true');
        }
      }, 500);
      
      // Final fallback redirect
      setTimeout(() => {
        const isRedirected = window.location.pathname.includes('/pharmacy/dashboard');
        if (!isRedirected) {
          console.log('REDIRECT ATTEMPT 3: Second redirect failed, trying document.location');
          document.location.href = '/pharmacy/dashboard?justLoggedIn=true';
          
          // If this also fails, show an alert to the user
          setTimeout(() => {
            if (!window.location.pathname.includes('/pharmacy/dashboard')) {
              alert('Automatic redirect failed. Please click OK to go to the dashboard.');
              window.location.href = '/pharmacy/dashboard?justLoggedIn=true';
            }
          }, 1000);
        }
      }, 1000);
      
      setLoginSuccess(true);
    } catch (error) {
      console.error('Pharmacy login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
      setLoginSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {hasCorruptedState && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  We detected a problem with your session data. 
                </p>
                <button 
                  onClick={clearStorageData}
                  className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-600"
                >
                  Click here to fix it
                </button>
              </div>
            </div>
          </div>
        )}
        
        {loginSuccess && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Login successful! If you are not redirected automatically:
                </p>
                <a 
                  href="/pharmacy/dashboard?bypass=true"
                  className="mt-2 text-sm font-medium text-green-700 hover:text-green-600"
                >
                  Click here to go to the dashboard
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <Link to="/" className="inline-flex items-center mb-4">
             <Building2 className="h-8 w-8 text-emerald-600" />
             <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
               PharmaCare+ Pharmacy
             </span>
          </Link>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            Pharmacy Staff Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Not a pharmacy?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="staff@examplepharmacy.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Password"
                  minLength={6} // Keep minLength if required by backend
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-300 ease-in-out transform ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-800 hover:shadow-md hover:-translate-y-px'}`}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                Sign In
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/pharmacy/signup" className="font-medium text-emerald-600 hover:text-emerald-500">
              Need to register a new pharmacy?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyLogin; 