import React, { useEffect, useState } from 'react';
import {
  Bell,
  Heart,
  LineChart,
  Pill,
  QrCode,
  ChevronRight,
  Users,
  Gift,
  Plus,
  CheckCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  Edit,
  Clock,
  Trash2,
  UserPlus,
  Package,
  AlarmCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { reminderService, analyticsService, activityService, medicationService, UserActivity } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface DashboardStats {
  activeMedicationsCount: number;
  pendingRemindersCount: number;
  adherenceRate: number;
  missedRemindersCount: number;
}

interface Reminder {
  id: number;
  medicationId?: number;
  medicationName: string;
  dosage: string;
  reminderTime: string;
  reminderDateTime: string;
  notes?: string;
  completed: boolean;
}

interface ReminderData {
  id: number;
  medicationId?: number;
  medication?: {
    id: number;
    name: string;
    dosage: string;
  };
  reminderTime: string;
  notes?: string;
  completed: boolean;
}

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency?: string;
  active: boolean;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeMedicationsCount: 0,
    pendingRemindersCount: 0,
    adherenceRate: 0,
    missedRemindersCount: 0,
  });
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching dashboard data...');
      
      // Fetch medications to have a reference for reminder medications
      let medicationsData: any[] = [];
      try {
        console.log('Fetching medications data...');
        medicationsData = await medicationService.getAll();
        console.log('Medications data received:', medicationsData);
      } catch (medicationsError) {
        console.error('Error fetching medications data:', medicationsError);
      }
      
      // Fetch analytics data with better error handling
      let analyticsData;
      try {
        console.log('Fetching analytics data...');
        analyticsData = await analyticsService.getDashboard();
        console.log('Analytics data received:', analyticsData);
      } catch (analyticsError) {
        console.error('Error fetching analytics data:', analyticsError);
        analyticsData = {
          activeMedicationsCount: 0,
          pendingRemindersCount: 0,
          adherenceRate: 0,
          missedRemindersCount: 0
        };
      }

      // Fetch reminders data with better error handling
      let remindersData;
      try {
        console.log('Fetching reminders data...');
        remindersData = await reminderService.getPending();
        console.log('Reminders data received:', remindersData);
      } catch (remindersError) {
        console.error('Error fetching reminders data:', remindersError);
        remindersData = [];
      }
      
      // Fetch activity data with better error handling
      let activityData: UserActivity[] = [];
      try {
        console.log('Fetching activity data...');
        activityData = await activityService.getRecentActivity(5);
        console.log('Activity data received:', activityData);
      } catch (activityError) {
        console.error('Error fetching activity data:', activityError);
        activityData = [];
      }

      setStats({
        activeMedicationsCount: analyticsData.activeMedicationsCount,
        pendingRemindersCount: analyticsData.pendingRemindersCount,
        adherenceRate: Math.round(analyticsData.adherenceRate),
        missedRemindersCount: analyticsData.missedRemindersCount
      });
      
      // Process reminders only if we have data
      if (Array.isArray(remindersData) && remindersData.length > 0) {
        const formattedReminders = remindersData.slice(0, 5).map((reminder: ReminderData): Reminder => {
          // Ensure reminder.reminderTime is valid before parsing
          let formattedTime = 'Invalid Time';
          let dateTimeForSorting = new Date();
          try {
            if (reminder.reminderTime) {
              const parsedDate = parseISO(reminder.reminderTime);
              if (isValid(parsedDate)) {
                formattedTime = format(parsedDate, 'h:mm a');
                dateTimeForSorting = parsedDate;
              }
            }
          } catch (dateError) {
            console.error('Error parsing reminder date:', dateError, reminder);
          }
          
          // Find the medication name from our local list if not found in the reminder
          let medicationName = reminder.medication?.name || 'Unknown Medication';
          let dosage = reminder.medication?.dosage || '';
          
          // Try to get medication details from the separate medication list if medicationId is available
          if (reminder.medicationId && medicationsData.length > 0 && 
              (medicationName === 'Unknown Medication' || !dosage)) {
            const matchingMed = medicationsData.find(med => med.id === reminder.medicationId);
            if (matchingMed) {
              medicationName = matchingMed.name;
              dosage = matchingMed.dosage || dosage;
            }
          }
          
          return {
            id: reminder.id,
            medicationId: reminder.medicationId || reminder.medication?.id || 0,
            medicationName: medicationName,
            dosage: dosage,
            reminderTime: formattedTime,
            reminderDateTime: reminder.reminderTime,
            notes: reminder.notes,
            completed: reminder.completed,
          };
        }).sort((a: Reminder, b: Reminder) => {
          try {
            return new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime();
          } catch (error) {
            return 0; // Default order if dates can't be compared
          }
        });
        
        console.log('Formatted reminders:', formattedReminders);
        setUpcomingReminders(formattedReminders);
      } else {
        console.log('No reminders data received or empty array');
        setUpcomingReminders([]);
      }
      
      // Format activity data if available, otherwise use fallback data
      if (Array.isArray(activityData) && activityData.length > 0) {
        const formattedActivities = activityData.map(activity => {
          return formatActivityItem(activity);
        });
        setRecentActivity(formattedActivities);
        console.log('Formatted activities:', formattedActivities);
      } else {
        console.log('Using fallback activity data');
        // Use a smaller set of fallback data for better UX
        setRecentActivity([
          { 
            id: 1, 
            type: 'system', 
            title: 'Welcome to PharmaCare+', 
            description: 'Start tracking your medications', 
            time: 'just now', 
            icon: Activity, 
            iconBg: 'bg-teal-100', 
            iconColor: 'text-teal-600' 
          }
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format activity data into UI-friendly format with appropriate icons
  const formatActivityItem = (activity: UserActivity): ActivityItem => {
    // Default values
    let icon = Activity;
    let iconBg = 'bg-gray-100';
    let iconColor = 'text-gray-600';
    let description = activity.description || '';
    let timeAgo = 'recently';
    
    // Format the relative time if timestamp exists
    if (activity.timestamp) {
      try {
        const date = parseISO(activity.timestamp);
        if (isValid(date)) {
          // Simple format for time ago
          const now = new Date();
          const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
          const diffInHours = Math.floor(diffInMinutes / 60);
          const diffInDays = Math.floor(diffInHours / 24);
          
          if (diffInMinutes < 60) {
            timeAgo = diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
          } else if (diffInHours < 24) {
            timeAgo = diffInHours === 1 ? 'about 1 hour ago' : `about ${diffInHours} hours ago`;
          } else {
            timeAgo = diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
          }
        }
      } catch (error) {
        console.error('Error parsing activity timestamp:', error);
      }
    }
    
    // Configure icon and styling based on activity type
    switch (activity.type?.toLowerCase()) {
      case 'reminder_completed':
        icon = CheckCircle;
        iconBg = 'bg-teal-100';
        iconColor = 'text-teal-600';
        break;
      case 'reminder_created':
        icon = Bell;
        iconBg = 'bg-violet-100';
        iconColor = 'text-violet-600';
        break;
      case 'medication_added':
        icon = Plus;
        iconBg = 'bg-sky-100';
        iconColor = 'text-sky-600';
        break;
      case 'medication_updated':
        icon = Edit;
        iconBg = 'bg-amber-100';
        iconColor = 'text-amber-600';
        break;
      case 'donation_created':
        icon = Heart;
        iconBg = 'bg-rose-100';
        iconColor = 'text-rose-600';
        break;
      case 'donation_status_updated':
        icon = Package;
        iconBg = 'bg-indigo-100';
        iconColor = 'text-indigo-600';
        break;
      case 'family_member_added':
        icon = UserPlus;
        iconBg = 'bg-emerald-100';
        iconColor = 'text-emerald-600';
        break;
      case 'reward_redeemed':
        icon = Gift;
        iconBg = 'bg-pink-100';
        iconColor = 'text-pink-600';
        break;
      case 'prescription_added':
        icon = QrCode;
        iconBg = 'bg-violet-100';
        iconColor = 'text-violet-600';
        break;
      default:
        // Use default values set above
        break;
    }
    
    return {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description,
      time: timeAgo,
      icon,
      iconBg,
      iconColor
    };
  };

  const quickActions = [
    { name: 'Add Medication', icon: Plus, color: 'text-sky-600', bgColor: 'bg-sky-100', hoverColor: 'hover:bg-sky-200', path: '/dashboard/medications' },
    { name: 'Set Reminder', icon: Bell, color: 'text-violet-600', bgColor: 'bg-violet-100', hoverColor: 'hover:bg-violet-200', path: '/dashboard/reminders' },
    { name: 'Scan Prescription', icon: QrCode, color: 'text-emerald-600', bgColor: 'bg-emerald-100', hoverColor: 'hover:bg-emerald-200', path: '/dashboard/prescriptions' },
    { name: 'View Analytics', icon: LineChart, color: 'text-amber-600', bgColor: 'bg-amber-100', hoverColor: 'hover:bg-amber-200', path: '/dashboard/analytics' },
  ];

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return { text: 'text-green-700', bg: 'bg-green-100', icon: TrendingUp };
    if (rate >= 70) return { text: 'text-yellow-700', bg: 'bg-yellow-100', icon: Activity };
    return { text: 'text-red-700', bg: 'bg-red-100', icon: TrendingDown };
  };

  const adherenceInfo = getAdherenceColor(stats.adherenceRate);

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-8">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {/* Welcome section - Personalized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                Welcome back, {currentUser?.firstName || 'User'}!
              </h1>
              <p className="mt-1 text-base text-gray-600">
                Here's your medication summary for today.
              </p>
            </div>
          </div>

          {/* Stats Grid - Enhanced Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Medications Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex-shrink-0 p-3 bg-sky-100 rounded-lg">
                <Pill className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Active Medications</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.activeMedicationsCount}
                </p>
              </div>
            </div>
            
            {/* Upcoming Reminders Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex-shrink-0 p-3 bg-violet-100 rounded-lg">
                <Bell className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Pending Reminders</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.pendingRemindersCount}
                </p>
              </div>
            </div>
            
            {/* Adherence Rate Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-md transition-shadow duration-200">
              <div className={`flex-shrink-0 p-3 ${adherenceInfo.bg} rounded-lg`}>
                <adherenceInfo.icon className={`h-6 w-6 ${adherenceInfo.text}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Adherence Rate</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.adherenceRate}%
                </p>
              </div>
            </div>
            
            {/* Missed Doses Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex-shrink-0 p-3 bg-red-100 rounded-lg">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Missed Doses (Total)</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.missedRemindersCount}
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions - Themed */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.path}
                className={`group flex flex-col items-center justify-center text-center p-5 ${action.bgColor} rounded-xl shadow-sm border border-transparent ${action.hoverColor} transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-md`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 transform group-hover:scale-110 transition-transform duration-200`}
                >
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <h3 className={`text-sm font-semibold ${action.color}`}>{action.name}</h3>
              </Link>
            ))}
          </div>

          {/* Reminders and Activity Feed Section */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Upcoming reminders - Enhanced */}
            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-800">
                  Upcoming Reminders
                </h2>
                <Link to="/dashboard/reminders" className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700">
                  View all
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="space-y-4">
                {upcomingReminders.length > 0 ? (
                  upcomingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-violet-100 rounded-full">
                          <Bell className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {reminder.medicationName}
                          </p>
                          {reminder.dosage && <p className="text-xs text-gray-500">{reminder.dosage}</p>}
                          {reminder.notes && <p className="text-xs text-gray-500 italic mt-0.5">{reminder.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-700">
                          {reminder.reminderTime}
                        </p>
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                    <Bell className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming reminders</h3>
                    <p className="mt-1 text-sm text-gray-500">You're all caught up!</p>
                    <div className="mt-6">
                      <Link
                        to="/dashboard/reminders"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Set New Reminder
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity feed - with fixed alignment to match screenshot */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-800">
                  Recent Activity
                </h2>
              </div>
              <div className="flow-root">
                <ul className="space-y-6 relative">
                  {recentActivity.slice(0, 4).map((activity, index) => (
                    <li key={activity.id} className="relative">
                      {/* Timeline connector line */}
                      {index < recentActivity.length - 1 && (
                        <div className="absolute z-0 left-5 top-10 bottom-0 w-0.5 bg-gray-200" 
                             aria-hidden="true" style={{ transform: 'translateX(-50%)' }}></div>
                      )}
                      <div className="relative flex items-start z-10">
                        {/* Icon */}
                        <div className="flex-shrink-0 relative z-20">
                          <div className={`h-10 w-10 rounded-full ${activity.iconBg} flex items-center justify-center ring-4 ring-white`}>
                            <activity.icon className={`h-5 w-5 ${activity.iconColor}`} aria-hidden="true" />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="text-base font-medium text-gray-900">
                            {activity.title}
                          </div>
                          {activity.description && (
                            <div className="mt-0.5 text-sm text-gray-500">
                              {activity.description}
                            </div>
                          )}
                          <div className="mt-1 text-sm text-gray-600 font-normal">
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {recentActivity.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                  <Activity className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">Updates will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
