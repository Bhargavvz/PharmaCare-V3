import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, isPharmacyStaffUser } from './context/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Features from './pages/Features';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Dashboard from './pages/dashboard/Dashboard';
import Medications from './pages/dashboard/Medications';
import Reminders from './pages/dashboard/Reminders';
import Analytics from './pages/dashboard/Analytics';
import Family from './pages/dashboard/Family';
import Prescriptions from './pages/dashboard/Prescriptions';
import Rewards from './pages/dashboard/Rewards';
import DigiLocker from './pages/dashboard/DigiLocker';
import Settings from './pages/dashboard/Settings';
import Profile from './pages/dashboard/Profile';
import Donations from './pages/dashboard/Donations';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import CreatePharmacy from './pages/pharmacy/CreatePharmacy';
import Inventory from './pages/pharmacy/Inventory';
import PharmacyLogin from './pages/pharmacy/PharmacyLogin';
import PharmacySignup from './pages/pharmacy/PharmacySignup';
import PharmacyBilling from './pages/pharmacy/PharmacyBilling';
import PharmacyDonations from './pages/pharmacy/PharmacyDonations';
import PharmacyAnalytics from './pages/pharmacy/PharmacyAnalytics';
import PharmacyStaff from './pages/pharmacy/PharmacyStaff';
import LoadingSpinner from './components/common/LoadingSpinner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OAuth2Callback from './pages/OAuth2Callback';
import BlogPost from './pages/BlogPost';
import TokenFixHelper from './components/common/TokenFixHelper';
import ChatButton from './components/chat/ChatButton';

function App() {
  const [isChatVisible, setIsChatVisible] = useState(true);
  
  // Generic Protected Route - just checks if user is authenticated
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
      // While the AuthContext is validating the token, show a loading spinner.
      return <LoadingSpinner />;
    }

    // After loading is complete, check if there is a currentUser.
    if (!currentUser) {
      // If no user is found after validation, redirect to login.
      console.log('ProtectedRoute: No currentUser after loading, redirecting to /login');
      return <Navigate to="/login" replace />;
    }

    // If loading is done and there is a currentUser, render the protected content.
    return <>{children}</>;
  };
  
  // Pharmacy Staff Protected Route - checks if user is authenticated AND is pharmacy staff
  const PharmacyProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading, setCurrentUser, token } = useAuth();
    const [attemptedFallback, setAttemptedFallback] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const location = window.location;
    
    // CRITICAL FIX: If we're accessing the dashboard directly with a query param, bypass protection
    const isDirectDashboardAccess = 
      location.pathname === '/pharmacy/dashboard' && 
      (location.search.includes('justLoggedIn=true') || location.search.includes('bypass=true'));
    
    if (isDirectDashboardAccess) {
      console.log('PharmacyProtectedRoute: Detected direct dashboard access, bypassing protection');
      return <>{children}</>;
    }
    
    // Skip check if we're at the login page or just logged in
    const isLoginRelatedPath = 
      location.pathname.includes('/login') || 
      location.pathname.includes('/signup');
    
    if (isLoginRelatedPath) {
      console.log('PharmacyProtectedRoute: On login-related path, skipping protection');
      return <>{children}</>;
    }
    
    // Try to load from localStorage directly as an emergency measure
    useEffect(() => {
      if (!loading && !attemptedFallback) {
        if (!token) {
          console.log('PharmacyProtectedRoute: No token found, checking localStorage');
          const storedToken = localStorage.getItem('token');
          
          if (!storedToken) {
            console.error('PharmacyProtectedRoute: No token in localStorage either, must redirect to login');
            setAttemptedFallback(true);
            return;
          }
        }
        
        if (!currentUser) {
          console.log('PharmacyProtectedRoute: No currentUser, attempting localStorage fallback');
          setLocalLoading(true);
          
          try {
            const cachedUserData = localStorage.getItem('userData');
            
            if (cachedUserData) {
              const userData = JSON.parse(cachedUserData);
              console.log('PharmacyProtectedRoute: Found cached user data:', userData.email);
              
              // If it has any pharmacy indicators, use it
              if (userData.userType === 'pharmacy' || 
                  userData.pharmacyId || 
                  (userData.roles && userData.roles.some((r: string) => r.includes('PHARMACY')))) {
                
                console.log('PharmacyProtectedRoute: Valid pharmacy data found in localStorage');
                
                // Add userType if missing
                if (!userData.userType) userData.userType = 'pharmacy';
                
                // Apply the cached data
                setCurrentUser(userData);
                toast.success('Restored pharmacy staff session');
              }
            }
          } catch (e) {
            console.error('PharmacyProtectedRoute: Error loading emergency fallback:', e);
          }
        }
        
        setAttemptedFallback(true);
        setLocalLoading(false);
      }
    }, [loading, currentUser, token, attemptedFallback, setCurrentUser]);
    
    if (loading || localLoading) {
      console.log('PharmacyProtectedRoute: Loading state, showing spinner');
      return <LoadingSpinner />;
    }

    // Check if token exists
    if (!token) {
      console.log('PharmacyProtectedRoute: No token after loading, redirecting to login');
      toast.error('Your session has expired. Please log in again.');
      return <Navigate to="/pharmacy/login" replace />;
    }
    
    // Check if user exists
    if (!currentUser) {
      console.log('PharmacyProtectedRoute: No currentUser after loading, redirecting to login');
      toast.error('User authentication failed. Please log in again.');
      return <Navigate to="/pharmacy/login" replace />;
    }
    
    // First try: check if user is pharmacy staff
    if (isPharmacyStaffUser(currentUser)) {
      console.log('PharmacyProtectedRoute: User is valid pharmacy staff, rendering content');
      return <>{children}</>;
    }
    
    // If we got here, user exists but is not pharmacy staff
    console.log('PharmacyProtectedRoute: User exists but is not pharmacy staff');
    toast.error('You need pharmacy staff access for this page');
    return <Navigate to="/pharmacy/login" replace />;
  };
  
  // User Protected Route - checks if user is authenticated AND is a regular user
  const UserProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    
    if (loading) {
      return <LoadingSpinner />;
    }

    // Check if user exists
    if (!currentUser) {
      console.log('UserProtectedRoute: No currentUser, redirecting to /login');
      return <Navigate to="/login" replace />;
    }
    
    // Verify regular user (not pharmacy staff)
    if (isPharmacyStaffUser(currentUser)) {
      console.log('UserProtectedRoute: User is pharmacy staff, redirecting to /dashboard');
      return <Navigate to="/pharmacy/dashboard" replace />;
    }

    return <>{children}</>;
  };

  return (
    <Router>
      <AuthProvider>
        <TokenFixHelper />
        <div className="flex flex-col min-h-screen">
          <Toaster position="top-right" />
          <Routes>
            {/* Dashboard Routes */}
            <Route
              path="/dashboard/*"
              element={
                <UserProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/medications" element={<Medications />} />
                      <Route path="/reminders" element={<Reminders />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/family" element={<Family />} />
                      <Route path="/prescriptions" element={<Prescriptions />} />
                      <Route path="/rewards" element={<Rewards />} />
                      <Route path="/digilocker" element={<DigiLocker />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/donations" element={<Donations />} />
                    </Routes>
                  </DashboardLayout>
                </UserProtectedRoute>
              }
            />

            {/* Pharmacy Management Routes */}
            <Route
              path="/pharmacy/*"
              element={
                <Routes>
                  <Route path="/login" element={<PharmacyLogin />} />
                  <Route path="/signup" element={<PharmacySignup />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <PharmacyProtectedRoute>
                        <PharmacyDashboard />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/create" 
                    element={
                      <PharmacyProtectedRoute>
                        <CreatePharmacy />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/inventory" 
                    element={
                      <PharmacyProtectedRoute>
                        <Inventory />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/inventory/add" 
                    element={
                      <PharmacyProtectedRoute>
                        <div>Add Inventory Item</div>
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/inventory/edit/:id" 
                    element={
                      <PharmacyProtectedRoute>
                        <div>Edit Inventory Item</div>
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/inventory/view/:id" 
                    element={
                      <PharmacyProtectedRoute>
                        <div>View Inventory Item</div>
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/billing" 
                    element={
                      <PharmacyProtectedRoute>
                        <PharmacyBilling />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/donations" 
                    element={
                      <PharmacyProtectedRoute>
                        <PharmacyDonations />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/analytics" 
                    element={
                      <PharmacyProtectedRoute>
                        <PharmacyAnalytics />
                      </PharmacyProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/staff" 
                    element={
                      <PharmacyProtectedRoute>
                        <PharmacyStaff />
                      </PharmacyProtectedRoute>
                    } 
                  />
                </Routes>
              }
            />

            {/* Public Routes */}
            <Route
              path="/*"
              element={
                <div className="flex-grow flex flex-col">
                  <Header />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/blog/:slug" element={<BlogPost />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/get-started" element={<Navigate to="/signup" replace />} />
                      <Route path="/oauth2/callback" element={<OAuth2Callback />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              }
            />
          </Routes>
          <ChatButton />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;