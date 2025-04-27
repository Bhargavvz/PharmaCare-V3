import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Package,
  Receipt,
  Heart,
  BarChart3,
  Users,
  Plus,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Pill,
  FileText,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronDown,
  Search,
  Menu,
  X,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth, isPharmacyStaffUser } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/api';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

interface PharmacyDto {
  id: number;
  name: string;
  registrationNumber: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  active: boolean;
  ownerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardStats {
  totalInventoryItems: number;
  lowStockItems: number;
  expiringItems: number;
  totalSales: number;
}

interface SalesDataPoint {
  date: string;
  amount: number;
}

interface InventoryOverviewDataPoint {
  category: string;
  value: number;
}

interface ActivityItemDto {
  id: string;
  description: string;
  timestamp: string;
  type: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'BILL_CREATED':
      return { icon: Receipt, color: 'bg-blue-100 text-blue-600' };
    case 'STOCK_LOW':
      return { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' };
    case 'DONATION_RECEIVED':
      return { icon: Heart, color: 'bg-purple-100 text-purple-600' };
    default:
      return { icon: Bell, color: 'bg-gray-100 text-gray-600' };
  }
};

const PharmacyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, token, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<PharmacyDto[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyDto | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalInventoryItems: 0,
    lowStockItems: 0,
    expiringItems: 0,
    totalSales: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [salesTrendData, setSalesTrendData] = useState<SalesDataPoint[]>([]);
  const [inventoryOverviewData, setInventoryOverviewData] = useState<InventoryOverviewDataPoint[]>([]);
  const [statsPeriodDays, setStatsPeriodDays] = useState(7);
  const [recentActivity, setRecentActivity] = useState<ActivityItemDto[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [fetchAttempts, setFetchAttempts] = useState(0);

  const fetchPharmacies = useCallback(async () => {
    try {
      console.log('Fetching pharmacies, attempt:', fetchAttempts + 1);
      setIsLoading(true);
      
      // Get token directly from localStorage as a fallback
      const tokenToUse = token || localStorage.getItem('token');
      
      if (!tokenToUse) {
        console.error('No token available for pharmacy API request');
        throw new Error('Authentication token not found');
      }
      
      const data = await pharmacyService.getMyPharmacies();
      console.log('Pharmacies fetched successfully:', data);
      
      setPharmacies(data);
      if (data.length > 0 && !selectedPharmacy) {
        setSelectedPharmacy(data[0]);
      } else if (data.length === 0) {
        toast("You are not assigned to any pharmacies yet.");
        setSelectedPharmacy(null);
      }
      
      // Reset fetch attempts on success
      setFetchAttempts(0);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      
      // Increment fetch attempts for retry mechanism
      const newAttempts = fetchAttempts + 1;
      setFetchAttempts(newAttempts);
      
      if (newAttempts <= 3) {
        // Retry after a delay (exponential backoff)
        console.log(`Will retry in ${newAttempts * 1000}ms...`);
        setTimeout(() => {
          if (currentUser && isPharmacyStaffUser(currentUser)) {
            fetchPharmacies();
          }
        }, newAttempts * 1000);
      } else {
        // After 3 attempts, show error
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
          toast.error(`Failed to load your pharmacies: ${error.response?.data?.message || error.message}`);
        } else if (!axios.isAxiosError(error)) {
          toast.error('Failed to load your pharmacies');
        }
        setPharmacies([]);
        setSelectedPharmacy(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchAttempts, currentUser, selectedPharmacy]);

  const fetchAllDashboardData = useCallback(async () => {
    if (!selectedPharmacy) return;

    console.log(`Fetching all dashboard data for pharmacy ID: ${selectedPharmacy.id}`);
    setIsStatsLoading(true);
    setIsActivityLoading(true);
    try {
      const [invStats, salesSummary, salesTrend, invOverview, activityData] = await Promise.all([
        pharmacyService.getInventoryStats(selectedPharmacy.id),
        pharmacyService.getSalesSummary(selectedPharmacy.id, 'week'),
        pharmacyService.getSalesTrend(selectedPharmacy.id, statsPeriodDays),
        pharmacyService.getInventoryOverview(selectedPharmacy.id),
        pharmacyService.getActivity(selectedPharmacy.id, 5)
      ]);

      setStats({
        totalInventoryItems: invStats?.totalItems || 0,
        lowStockItems: invStats?.lowStockCount || 0,
        expiringItems: invStats?.expiringSoonCount || 0,
        totalSales: salesSummary?.totalAmount || 0,
      });
      setSalesTrendData(salesTrend || []);
      setInventoryOverviewData(invOverview || []);
      setRecentActivity(activityData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
       if (axios.isAxiosError(error) && error.response?.status !== 401) {
         toast.error(`Failed to load dashboard data: ${error.response?.data?.message || error.message}`);
       } else if (!axios.isAxiosError(error)) {
         toast.error('Failed to load dashboard data');
       }
    } finally {
       setIsStatsLoading(false);
       setIsActivityLoading(false);
    }
  }, [selectedPharmacy, statsPeriodDays]);

  useEffect(() => {
    // Don't do anything while AuthContext is still validating token
    if (loading) {
      console.log('AuthContext still loading, waiting...');
      return;
    }
    
    // Extra validation to ensure user is pharmacy staff
    if (!currentUser) {
      console.log('No current user found, redirecting to pharmacy login');
      navigate('/pharmacy/login');
      return;
    }
    
    if (!isPharmacyStaffUser(currentUser)) {
      console.log('User is not pharmacy staff, redirecting to pharmacy login');
      console.log('Current user data:', JSON.stringify(currentUser, null, 2));
      toast.error('Access denied. Please log in as pharmacy staff.');
      navigate('/pharmacy/login');
      return;
    }
    
    console.log('PharmacyDashboard: User authenticated as pharmacy staff:', JSON.stringify(currentUser, null, 2));
    
    // After authentication is confirmed, fetch pharmacies if needed
    if (currentUser && isPharmacyStaffUser(currentUser) && pharmacies.length === 0) {
      console.log('User is pharmacy staff, fetching pharmacies');
      fetchPharmacies();
    }
  }, [currentUser, navigate, loading, fetchPharmacies, pharmacies.length]);

  useEffect(() => {
    if (selectedPharmacy) {
      fetchAllDashboardData();
    } else {
      setStats({ totalInventoryItems: 0, lowStockItems: 0, expiringItems: 0, totalSales: 0 });
      setSalesTrendData([]);
      setInventoryOverviewData([]);
      setRecentActivity([]);
    }
  }, [selectedPharmacy, statsPeriodDays, fetchAllDashboardData]);

  const handleCreatePharmacy = () => {
    navigate('/pharmacy/create');
  };

  const handleSelectPharmacy = (pharmacy: PharmacyDto) => {
    setSelectedPharmacy(pharmacy);
  };

  const navigateTo = (path: string, queryParams: Record<string, string> = {}) => {
    if (selectedPharmacy) {
      const queryString = new URLSearchParams(queryParams).toString();
      const finalPath = `${path}${queryString ? `?${queryString}` : ''}`;
      console.log(`Navigating to: ${finalPath}`);
      navigate(finalPath, { state: { pharmacyId: selectedPharmacy.id } });
    } else {
      toast.error('Please select or create a pharmacy first');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const sidebarItems = [
    { name: 'Dashboard', icon: BarChart3, path: '/pharmacy/dashboard', active: location.pathname === '/pharmacy/dashboard' },
    { name: 'Inventory', icon: Package, path: '/pharmacy/inventory' },
    { name: 'Billing', icon: Receipt, path: '/pharmacy/billing' },
    { name: 'Donations', icon: Heart, path: '/pharmacy/donations' },
    { name: 'Analytics', icon: TrendingUp, path: '/pharmacy/analytics' },
    { name: 'Staff', icon: Users, path: '/pharmacy/staff' },
  ];

  const quickStats = [
    { name: 'Total Items', value: stats.totalInventoryItems, icon: Package, color: 'bg-blue-500', path: '/pharmacy/inventory' },
    { name: 'Low Stock', value: stats.lowStockItems, icon: AlertTriangle, color: 'bg-yellow-500', path: '/pharmacy/inventory', queryParams: { filter: 'low-stock' } },
    { name: 'Expiring Soon', value: stats.expiringItems, icon: Clock, color: 'bg-red-500', path: '/pharmacy/inventory', queryParams: { filter: 'expiring' } },
    { name: 'Total Sales', value: `$${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', path: '/pharmacy/analytics' },
  ];

  if (isLoading || !currentUser) {
    return <LoadingSpinner />;
  }

  if (pharmacies.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Building2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Pharmacy Found</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          You don't seem to be associated with any pharmacies yet. 
          Create your first pharmacy to start managing your inventory and sales.
        </p>
        <button
          onClick={handleCreatePharmacy}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="w-5 h-5 mr-2 -ml-1" />
          Create New Pharmacy
        </button>
         <button onClick={handleLogout} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-green-600" />
              <span className="ml-2 text-xl font-semibold text-gray-800">PharmaCare+</span>
            </div>
            <button 
              className="p-1 rounded-md lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto">
            <div className="px-4 py-6">
                <div className="mb-6">
                  <label htmlFor="pharmacy-select" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Pharmacy</label>
                  <div className="relative">
                    <select
                      id="pharmacy-select"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md appearance-none"
                      value={selectedPharmacy ? selectedPharmacy.id.toString() : ''}
                      onChange={(e) => {
                        const pharmacyId = parseInt(e.target.value, 10);
                        const selected = pharmacies.find(p => p.id === pharmacyId);
                        if (selected) handleSelectPharmacy(selected);
                      }}
                    >
                      {pharmacies.map((pharmacy) => (
                        <option key={pharmacy.id} value={pharmacy.id.toString()}>
                          {pharmacy.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <button
                    onClick={handleCreatePharmacy}
                    className="mt-2 w-full inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Pharmacy
                  </button>
                </div>

                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => navigateTo(item.path)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                        item.active
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${item.active ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                      {item.name}
                    </button>
                  ))}
                </nav>
            </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
             <div className="flex items-center">
                <span className="inline-block h-9 w-9 rounded-full overflow-hidden bg-gray-100">
                  <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                      {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 truncate">
                      {currentUser.email}
                  </p>
                </div>
             </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <LogOut className="w-5 h-5 mr-2 text-gray-400" />
              Log Out
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:pl-64">
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
          <button 
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
                <h1 className="text-xl font-semibold text-gray-900">Dashboard Overview</h1>
            </div>
             <div className="ml-4 flex items-center md:ml-6">
                <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    <Bell className="h-6 w-6" />
                </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {quickStats.map((item) => (
              <div 
                 key={item.name} 
                 className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
                 onClick={() => navigateTo(item.path, item.queryParams)}
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 p-3 rounded-md ${item.color}`}>
                      <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {item.name}
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {item.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <button onClick={() => navigateTo('/pharmacy/inventory/add')} className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <Package className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-gray-700">Add Item</span>
                </button>
                <button onClick={() => navigateTo('/pharmacy/billing/new')} className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <Receipt className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-gray-700">New Bill</span>
                </button>
                <button onClick={() => navigateTo('/pharmacy/staff')} className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 bg-indigo-50 border-2 border-indigo-300">
                    <Users className="h-8 w-8 text-indigo-600 mb-2" />
                    <span className="text-sm font-medium text-indigo-800">Manage Staff</span>
                </button>
                <button onClick={() => navigateTo('/pharmacy/donations/pending')} className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <Heart className="h-8 w-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-gray-700">View Donations</span>
                </button>
            </div>
            
            {/* Staff Management CTA Section */}
            <div className="mt-8 p-6 bg-indigo-50 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="mb-4 sm:mb-0">
                        <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                            <Users className="h-6 w-6 mr-2 text-indigo-600" />
                            Pharmacy Staff Management
                        </h3>
                        <p className="mt-1 text-sm text-indigo-700">
                            Add or manage staff members for your pharmacy with different roles and permissions.
                        </p>
                    </div>
                    <button 
                        onClick={() => navigateTo('/pharmacy/staff')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md shadow-sm flex items-center"
                    >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Manage Staff
                    </button>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                 <h3 className="text-base font-medium text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
                 <div className="h-64 flex items-center justify-center text-gray-400">
                    Chart Placeholder
                 </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                 <h3 className="text-base font-medium text-gray-900 mb-4">Inventory Overview</h3>
                 <div className="h-64 flex items-center justify-center text-gray-400">
                     Chart Placeholder
                 </div>
              </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            {isActivityLoading ? (
                <div className="h-40 flex items-center justify-center text-gray-400"><LoadingSpinner /></div>
            ) : recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity found.</p>
            ) : (
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((activity) => {
                    const { icon: Icon, color } = getActivityIcon(activity.type);
                    return (
                        <li key={activity.id} className="py-3 flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${color}`}>
                              <Icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-800">{activity.description}</p>
                                <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                          </div>
                        </li>
                    );
                  })}
                </ul>
            )}
            {recentActivity.length > 0 && (
                <div className="mt-4 text-right">
                    <button className="text-sm font-medium text-green-600 hover:text-green-500">View All Activity</button>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PharmacyDashboard; 