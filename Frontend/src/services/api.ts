import axios from 'axios';
import { API_URL } from '../config';

// Set up axios with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add debug logging to track API calls
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add debug logging for responses
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      console.error('Axios Interceptor: Caught 401 error on request to:', error.config.url);
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Determine correct redirect based on URL 
      if (error.config.url && (
          error.config.url.includes('/pharmacies') ||
          error.config.url.includes('/pharmacy') || 
          window.location.pathname.startsWith('/pharmacy')
        )) {
        console.error('Axios Interceptor: Redirecting to /pharmacy/login (pharmacy-related request)');
        window.location.href = '/pharmacy/login';
      } else {
        console.error('Axios Interceptor: Redirecting to /login (standard request)');
        window.location.href = '/login';
      }
    }
    
    // Log all API errors for debugging
    console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  signup: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
  },
  
  validateToken: async () => {
    const response = await api.get('/auth/validate-token');
    return response.data;
  },
  
  getGoogleLoginUrl: async () => {
    const response = await api.get('/oauth2/google/url');
    return response.data;
  },
};

// User service
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  imageUrl?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  createdAt?: string;
}

export interface UserProfile extends User {
  bloodType?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export const userService = {
  getCurrentUser: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
  
  // Mock functions for local storage until backend endpoints are implemented
  getProfile: async () => {
    // Try to get from localStorage first
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      return JSON.parse(storedProfile);
    }
    
    // Fall back to basic user data
    const user = await userService.getCurrentUser();
    
    // Create a profile from user data
    const profile = {
      ...user,
      bloodType: 'O+',
      allergies: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    };
    
    // Store the profile for future use
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    return profile;
  },
  
  updateProfile: async (userData: Partial<UserProfile>) => {
    try {
      console.log('Updating profile via API:', userData);
      // First try to update via API
      const response = await api.put('/api/users/profile', userData);
      console.log('Profile update API response:', response.data);
      const updatedProfile = response.data;
      
      // Also save to localStorage for fallback
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Additionally update the user data in auth context
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          const updatedUserData = {
            ...parsedUserData,
            firstName: userData.firstName || parsedUserData.firstName,
            lastName: userData.lastName || parsedUserData.lastName,
            // Optional fields
            phone: userData.phone,
            dateOfBirth: userData.dateOfBirth,
            address: userData.address,
            bloodType: userData.bloodType,
            allergies: userData.allergies,
            emergencyContact: userData.emergencyContact
          };
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
        } catch (error) {
          console.error('Error updating userData in localStorage:', error);
        }
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Failed to update profile via API, falling back to localStorage', error);
      
      // Fallback to localStorage only
      const existingProfile = localStorage.getItem('userProfile');
      const profile = existingProfile ? JSON.parse(existingProfile) : await userService.getProfile();
      
      // Update the profile
      const updatedProfile = {
        ...profile,
        ...userData
      };
      
      // Save to localStorage
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      return updatedProfile;
    }
  },
  
  updatePassword: async (currentPassword: string, newPassword: string) => {
    // Mock password update for now
    console.log('Password update requested (mock implementation)');
    console.log('Current password:', currentPassword.replace(/./g, '*'));
    console.log('New password:', newPassword.replace(/./g, '*'));
    
    // Simulate a successful response
    return { success: true, message: 'Password updated successfully' };
  },
  
  updateAvatar: async (formData: FormData) => {
    // Mock avatar update for now
    console.log('Avatar update requested (mock implementation)');
    
    // Get the file from FormData
    const file = formData.get('avatar') as File;
    
    if (file) {
      // Create a data URL for the image
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const imageUrl = reader.result as string;
          
          // Get the existing profile
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            profile.imageUrl = imageUrl;
            localStorage.setItem('userProfile', JSON.stringify(profile));
          }
          
          resolve({ success: true, imageUrl });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    return { success: false };
  }
};

// Medication service
export interface Medication {
  id?: number;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  userId?: number;
}

export const medicationService = {
  getAll: async () => {
    const response = await api.get('/medications');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/medications/${id}`);
    return response.data;
  },
  
  create: async (medication: Omit<Medication, 'id'>) => {
    const response = await api.post('/medications', medication);
    return response.data;
  },
  
  update: async (id: number, medication: Partial<Medication>) => {
    const response = await api.put(`/medications/${id}`, medication);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/medications/${id}`);
    return response.data;
  },
};

// Reminder service
export interface Reminder {
  id?: number;
  medicationId: number;
  reminderTime: string;
  notes?: string;
  completed: boolean;
  medication?: Medication;
}

export const reminderService = {
  getAll: async () => {
    const response = await api.get('/reminders');
    return response.data;
  },
  
  getPending: async () => {
    const response = await api.get('/reminders/pending');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/reminders/${id}`);
    return response.data;
  },
  
  create: async (reminder: Omit<Reminder, 'id'>) => {
    const response = await api.post('/reminders', reminder);
    return response.data;
  },
  
  update: async (id: number, reminder: Partial<Reminder>) => {
    const response = await api.put(`/reminders/${id}`, reminder);
    return response.data;
  },
  
  markCompleted: async (id: number) => {
    const response = await api.post(`/reminders/${id}/complete`, {});
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },
};

// Donation service
export interface Donation {
  id?: number;
  medicineName: string;
  quantity: number;
  expiryDate: string;
  location: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED';
  organization?: string;
  notes?: string;
  donationDate?: string;
  completedDate?: string;
  donorName?: string;
  userId?: number;
}

export const donationService = {
  getAll: async () => {
    const response = await api.get('/donations');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  },
  
  create: async (donation: Omit<Donation, 'id'>) => {
    const response = await api.post('/donations', donation);
    return response.data;
  },
  
  update: async (id: number, donation: Partial<Donation>) => {
    const response = await api.put(`/donations/${id}`, donation);
    return response.data;
  },
  
  updateStatus: async (id: number, status: Donation['status']) => {
    // Use the dedicated status update endpoint
    const response = await api.put(`/donations/${id}/status`, { status });
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/donations/${id}`);
    return response.data;
  },
};

// Family member service
export interface FamilyMember {
  id?: number;
  name: string;
  relationship: string;
  age?: number;
  contactInfo?: string;
  notes?: string;
}

export const familyService = {
  getAll: async () => {
    const response = await api.get('/family');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/family/${id}`);
    return response.data;
  },
  
  create: async (member: Omit<FamilyMember, 'id'>) => {
    const response = await api.post('/family', member);
    return response.data;
  },
  
  update: async (id: number, member: Partial<FamilyMember>) => {
    const response = await api.put(`/family/${id}`, member);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/family/${id}`);
    return response.data;
  },
};

// Analytics service
export interface DashboardAnalytics {
  activeMedicationsCount: number;
  pendingRemindersCount: number;
  adherenceRate: number;
  missedRemindersCount: number;
}

export interface AdherenceAnalytics {
  adherenceByDayOfWeek: Record<string, number>;
  adherenceByTimeOfDay: Record<string, number>;
}

export interface MedicationAnalytics {
  medicationsByStatus: Record<string, number>;
}

export interface AdherenceHistoryPoint {
  date: string;
  adherence: number;
  remindersCompleted: number;
  remindersMissed: number;
  totalReminders: number;
}

export interface MedicationHistoryEntry {
  date: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  status: 'taken' | 'missed' | 'pending';
  scheduledTime: string;
  completedTime?: string;
}

export interface MedicationCalendarEntry {
  date: string; // YYYY-MM-DD
  medications: {
    id: number;
    name: string;
    dosage: string;
    time: string; // HH:MM
    status: 'taken' | 'missed' | 'pending';
    completedAt?: string;
  }[];
}

export const analyticsService = {
  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    try {
      const response = await api.get('/api/analytics/user/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard analytics:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      // Return default values to avoid breaking the UI
      return {
        activeMedicationsCount: 0,
        pendingRemindersCount: 0,
        adherenceRate: 0,
        missedRemindersCount: 0
      };
    }
  },

  getDashboard: async (): Promise<DashboardAnalytics> => {
    try {
      const response = await api.get('/api/analytics/user/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      // Return default values to avoid breaking the UI
      return {
        activeMedicationsCount: 0,
        pendingRemindersCount: 0,
        adherenceRate: 0,
        missedRemindersCount: 0
      };
    }
  },

  getAdherenceAnalytics: async (): Promise<AdherenceAnalytics> => {
    try {
      const response = await api.get('/api/analytics/user/adherence');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching adherence analytics:', error);
      // Return default values
      return {
        adherenceByDayOfWeek: {},
        adherenceByTimeOfDay: {}
      };
    }
  },

  getMedicationAnalytics: async (): Promise<MedicationAnalytics> => {
    try {
      const response = await api.get('/api/analytics/user/medications');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching medication analytics:', error);
      // Return default values
      return {
        medicationsByStatus: {}
      };
    }
  },
  
  getAdherenceHistory: async (days: number): Promise<AdherenceHistoryPoint[]> => {
    try {
      // First try to get from API if it exists
      try {
        const response = await api.get(`/api/analytics/user/adherence/history?days=${days}`);
        return response.data;
      } catch (apiError) {
        console.log('API endpoint not available, generating synthetic data');
        
        // If API doesn't exist, generate realistic historical data based on reminders
        const reminders = await reminderService.getAll();
        // Build a history based on completed/incomplete reminders
        const history: AdherenceHistoryPoint[] = [];
        const today = new Date();
        
        for (let i = days; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Count reminders for this day
          const dayReminders = reminders.filter((reminder: any) => {
            if (!reminder.reminderTime) return false;
            const reminderDate = new Date(reminder.reminderTime).toISOString().split('T')[0];
            return reminderDate === dateStr;
          });
          
          const completed = dayReminders.filter((r: any) => r.completed).length;
          const total = dayReminders.length;
          const adherence = total > 0 ? Math.round((completed / total) * 100) : 100;
          
          history.push({
            date: dateStr,
            adherence: adherence,
            remindersCompleted: completed,
            remindersMissed: total - completed,
            totalReminders: total
          });
        }
        
        return history;
      }
    } catch (error) {
      console.error('Error generating adherence history:', error);
      return [];
    }
  },
  
  getMedicationHistory: async (days: number = 30): Promise<MedicationHistoryEntry[]> => {
    try {
      // Try to get from API if it exists
      try {
        const response = await api.get(`/api/analytics/user/medications/history?days=${days}`);
        return response.data;
      } catch (apiError) {
        console.log('API endpoint not available, generating synthetic data');
        
        // If API doesn't exist, generate realistic historical data based on reminders and medications
        const [reminders, medications] = await Promise.all([
          reminderService.getAll(),
          medicationService.getAll()
        ]);
        
        const history: MedicationHistoryEntry[] = [];
        const today = new Date();
        
        // For each reminder, create a history entry
        reminders.forEach((reminder: any) => {
          if (!reminder.reminderTime) return;
          
          const reminderDate = new Date(reminder.reminderTime);
          // Only include reminders within the specified days
          if ((today.getTime() - reminderDate.getTime()) > days * 24 * 60 * 60 * 1000) {
            return;
          }
          
          const dateStr = reminderDate.toISOString().split('T')[0];
          const medication = medications.find((m: any) => 
            m.id === (reminder.medicationId || reminder.medication?.id)
          );
          
          if (!medication) return;
          
          const entry: MedicationHistoryEntry = {
            date: dateStr,
            medicationId: medication.id,
            medicationName: medication.name,
            dosage: medication.dosage,
            status: reminder.completed ? 'taken' : 
                   (new Date(reminder.reminderTime) > today ? 'pending' : 'missed'),
            scheduledTime: reminderDate.toISOString(),
            completedTime: reminder.completedAt
          };
          
          history.push(entry);
        });
        
        // Sort by date (newest first)
        return history.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
      }
    } catch (error) {
      console.error('Error generating medication history:', error);
      return [];
    }
  },
  
  getMedicationCalendar: async (month?: number, year?: number): Promise<MedicationCalendarEntry[]> => {
    try {
      // Get real-time data
      const [reminders, medications] = await Promise.all([
        reminderService.getAll(),
        medicationService.getAll()
      ]);
      
      // Use current month and year if not provided
      const targetMonth = month !== undefined ? month : new Date().getMonth(); // 0-indexed (0-11)
      const targetYear = year !== undefined ? year : new Date().getFullYear();
      
      // Get the first and last day of the month
      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
      
      // Create a map of dates to medication entries
      const calendarMap = new Map<string, MedicationCalendarEntry>();
      
      // Initialize the calendar with all days in the month
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        calendarMap.set(dateStr, {
          date: dateStr,
          medications: []
        });
      }
      
      // Fill in the medications for each day
      const today = new Date();
      reminders.forEach((reminder: any) => {
        if (!reminder.reminderTime) return;
        
        const reminderDate = new Date(reminder.reminderTime);
        const reminderMonth = reminderDate.getMonth();
        const reminderYear = reminderDate.getFullYear();
        
        // Only include reminders for the target month and year
        if (reminderMonth !== targetMonth || reminderYear !== targetYear) {
          return;
        }
        
        const dateStr = reminderDate.toISOString().split('T')[0];
        const medication = medications.find((m: any) => 
          m.id === (reminder.medicationId || reminder.medication?.id)
        );
        
        if (!medication) return;
        
        // Get or create the calendar entry for this date
        const calendarEntry = calendarMap.get(dateStr) || {
          date: dateStr,
          medications: []
        };
        
        // Add the medication to the entry
        calendarEntry.medications.push({
          id: medication.id,
          name: medication.name,
          dosage: medication.dosage,
          time: reminderDate.toISOString().split('T')[1].substring(0, 5), // HH:MM
          status: reminder.completed ? 'taken' : 
                 (reminderDate > today ? 'pending' : 'missed'),
          completedAt: reminder.completedAt
        });
        
        // Update the map
        calendarMap.set(dateStr, calendarEntry);
      });
      
      // Convert the map to an array
      return Array.from(calendarMap.values());
    } catch (error) {
      console.error('Error generating medication calendar:', error);
      return [];
    }
  }
};

// Rewards service
export interface RewardsDashboard {
  totalPoints: number;
  adherencePoints: number;
  currentStreak: number;
  userLevel: number;
  availableRewards: Reward[];
}

export interface Reward {
  id: number;
  title: string;
  description: string;
  pointsCost: number;
  isAvailable: boolean;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  progress: number;
  totalRequired: number;
  points: number;
  isCompleted: boolean;
}

export const rewardsService = {
  getDashboard: async (): Promise<RewardsDashboard> => {
    const response = await api.get('/rewards/dashboard');
    return response.data;
  },

  getAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get('/rewards/achievements');
    return response.data;
  },

  redeemReward: async (rewardId: number) => {
    const response = await api.post(`/rewards/redeem/${rewardId}`, {});
    return response.data;
  },
};

// Define interfaces needed for Pharmacy Service
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

// Pharmacy service (NEW)
export const pharmacyService = {
  getMyPharmacies: async (): Promise<PharmacyDto[]> => {
    const response = await api.get('/pharmacies/mine'); // Uses the axios instance 'api'
    return response.data;
  },

  getInventoryStats: async (pharmacyId: number): Promise<any> => { // TODO: Replace 'any' with actual InventoryStats DTO type
    const response = await api.get(`/inventories/stats?pharmacyId=${pharmacyId}`);
    return response.data;
  },

  getSalesSummary: async (pharmacyId: number, period: string): Promise<any> => { // TODO: Replace 'any' with actual SalesSummary DTO type
    const response = await api.get(`/analytics/sales/summary?pharmacyId=${pharmacyId}&period=${period}`);
    return response.data;
  },

  getSalesTrend: async (pharmacyId: number, days: number): Promise<SalesDataPoint[]> => {
    const response = await api.get(`/analytics/sales/trend?pharmacyId=${pharmacyId}&days=${days}`);
    return response.data;
  },

  getInventoryOverview: async (pharmacyId: number): Promise<InventoryOverviewDataPoint[]> => {
    const response = await api.get(`/inventories/overview?pharmacyId=${pharmacyId}`);
    return response.data;
  },

  getActivity: async (pharmacyId: number, limit: number): Promise<ActivityItemDto[]> => {
    const response = await api.get(`/pharmacies/${pharmacyId}/activity?limit=${limit}`);
    return response.data;
  }
  // Add other necessary pharmacy-related API calls here
};

// Activity service
export interface UserActivity {
  id: number;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  entityId?: number;
  entityType?: string;
}

export const activityService = {
  getRecentActivity: async (limit: number = 5): Promise<UserActivity[]> => {
    try {
      // Since there's no backend endpoint yet, we'll generate mock activity data
      // based on user's medications and reminders
      
      // Try to get some real data to reference
      const [medications, reminders] = await Promise.all([
        medicationService.getAll().catch(() => []),
        reminderService.getAll().catch(() => [])
      ]);
      
      const activities: UserActivity[] = [];
      
      // Add activity for each reminder
      if (reminders && reminders.length > 0) {
        reminders.slice(0, 3).forEach((reminder: any, index: number) => {
          const medName = reminder.medication?.name || 'medication';
          
          if (reminder.completed) {
            activities.push({
              id: 1000 + index,
              type: 'reminder_completed',
              title: `${medName} marked as taken`,
              description: reminder.medication?.dosage ? `Dosage: ${reminder.medication.dosage}` : '',
              timestamp: reminder.completedAt || new Date(Date.now() - (1000 * 60 * (index + 30))).toISOString(), // 30-60 minutes ago
              entityId: reminder.id,
              entityType: 'reminder'
            });
          } else {
            activities.push({
              id: 2000 + index,
              type: 'reminder_created',
              title: `Reminder set for ${medName}`,
              description: '', // Empty description as per screenshot
              timestamp: new Date(Date.now() - (1000 * 60 * 60 * (index + 1))).toISOString(), // 1-3 hours ago
              entityId: reminder.id,
              entityType: 'reminder'
            });
          }
        });
      }
      
      // Add activity for each medication
      if (medications && medications.length > 0) {
        medications.slice(0, 2).forEach((medication: any, index: number) => {
          activities.push({
            id: 3000 + index,
            type: 'medication_added',
            title: `New medication added: ${medication.name}`,
            description: medication.dosage ? `Dosage: ${medication.dosage}` : '',
            timestamp: new Date(Date.now() - (1000 * 60 * 60 * 24 * (index + 1))).toISOString(), // 1-2 days ago
            entityId: medication.id,
            entityType: 'medication'
          });
        });
      }
      
      // Add a welcome activity if no other activities
      if (activities.length === 0) {
        activities.push({
          id: 9999,
          type: 'system',
          title: 'Welcome to PharmaCare+',
          description: 'Start tracking your medications and set reminders to improve your adherence.',
          timestamp: new Date().toISOString(),
          entityType: 'system'
        });
      }
      
      // Sort by timestamp (most recent first) and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error: any) {
      console.error('Error generating activity data:', error);
      // Return simple fallback data
      return [{
        id: 9999,
        type: 'system',
        title: 'Welcome to PharmaCare+',
        description: 'Start tracking your medications',
        timestamp: new Date().toISOString(),
        entityType: 'system'
      }];
    }
  },
};

// Notification service
export interface Notification {
  id: number;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  entityId?: number;
  entityType?: string;
}

export const notificationService = {
  getNotifications: async (limit: number = 5): Promise<Notification[]> => {
    try {
      // Get activity data as the base for notifications
      const activities = await activityService.getRecentActivity(10);
      
      // Convert activities to notifications with read status
      const notifications: Notification[] = activities.map((activity, index) => ({
        ...activity,
        isRead: index > 2, // First 3 are unread
      }));
      
      // Add medication-specific notifications
      try {
        const medications = await medicationService.getAll();
        
        // Add refill notifications for medications that might be running low
        if (medications && medications.length > 0) {
          medications.slice(0, 2).forEach((medication: any, index: number) => {
            notifications.push({
              id: 5000 + index,
              type: 'medication_refill',
              title: `Refill reminder for ${medication.name}`,
              description: 'Your medication might be running low',
              timestamp: new Date(Date.now() - (1000 * 60 * 60 * (index + 2))).toISOString(),
              isRead: false,
              entityId: medication.id,
              entityType: 'medication'
            });
          });
        }
      } catch (error) {
        console.error('Error getting medications for notifications:', error);
      }
      
      // Sort by timestamp (most recent first) and read status (unread first)
      return notifications
        .sort((a, b) => {
          // First sort by read status
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          // Then by timestamp
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error generating notifications:', error);
      
      // Return fallback data
      return [{
        id: 9999,
        type: 'system',
        title: 'Welcome to PharmaCare+',
        description: 'Get started by adding medications and setting reminders',
        timestamp: new Date().toISOString(),
        isRead: false,
        entityType: 'system'
      }];
    }
  },
  
  markAsRead: async (notificationId: number): Promise<boolean> => {
    // This would normally make an API call
    console.log(`Marking notification ${notificationId} as read`);
    // For now, just pretend it succeeded
    return true;
  },
  
  markAllAsRead: async (): Promise<boolean> => {
    // This would normally make an API call
    console.log('Marking all notifications as read');
    // For now, just pretend it succeeded
    return true;
  }
};

// Export the api instance if needed directly elsewhere (though services are preferred)
export default api;
