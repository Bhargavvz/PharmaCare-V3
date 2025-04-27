import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Calendar,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  QrCode,
  Settings,
  User,
  Users,
  X,
  Heart,
  Gift,
  LineChart,
  Building2,
  Check,
  Pill,
  CheckCircle,
  Activity,
  UserPlus,
  Package,
  Edit,
  Plus,
FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService, Notification } from '../../services/api';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';

interface SidebarLink {
  name: string;
  to: string;
  icon: React.ElementType;
}

const sidebarLinks: SidebarLink[] = [
  { name: 'Dashboard', to: '/dashboard', icon: Home },
  { name: 'Medications', to: '/dashboard/medications', icon: Calendar },
  { name: 'Reminders', to: '/dashboard/reminders', icon: Bell },
  { name: 'Digi Locker', to: '/dashboard/digilocker', icon: FileText },
  { name: 'Prescriptions', to: '/dashboard/prescriptions', icon: QrCode },
  { name: 'Donations', to: '/dashboard/donations', icon: Heart },
  { name: 'Family', to: '/dashboard/family', icon: Users },
  { name: 'Analytics', to: '/dashboard/analytics', icon: LineChart },
  { name: 'Rewards', to: '/dashboard/rewards', icon: Gift },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-menu-button]') && !target.closest('[data-menu-dropdown]')) {
        setIsProfileMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(8);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'reminder_completed':
        return { icon: CheckCircle, bg: 'bg-teal-100', color: 'text-teal-600' };
      case 'reminder_created':
        return { icon: Bell, bg: 'bg-violet-100', color: 'text-violet-600' };
      case 'medication_added':
        return { icon: Plus, bg: 'bg-sky-100', color: 'text-sky-600' };
      case 'medication_refill':
        return { icon: Pill, bg: 'bg-rose-100', color: 'text-rose-600' };
      case 'medication_updated':
        return { icon: Edit, bg: 'bg-amber-100', color: 'text-amber-600' };
      case 'donation_created':
        return { icon: Heart, bg: 'bg-rose-100', color: 'text-rose-600' };
      case 'donation_status_updated':
        return { icon: Package, bg: 'bg-indigo-100', color: 'text-indigo-600' };
      case 'family_member_added':
        return { icon: UserPlus, bg: 'bg-emerald-100', color: 'text-emerald-600' };
      default:
        return { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      if (isValid(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return 'recently';
  };

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-2">
            <Building2 className="h-7 w-7 text-teal-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-700 bg-clip-text text-transparent">
              PharmaCare+
            </span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    location.pathname === link.to || (link.to !== '/dashboard' && location.pathname.startsWith(link.to))
                      ? 'text-teal-700 bg-teal-100 font-semibold'
                      : 'text-gray-600 hover:text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  <link.icon className={`w-5 h-5 mr-3 ${location.pathname === link.to ? 'text-teal-600' : 'text-gray-400 group-hover:text-teal-600'}`} />
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Settings and Logout */}
        <div className="px-3 py-4 border-t border-gray-200">
          <Link
            to="/dashboard/settings"
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 mb-1 ${
              location.pathname === '/dashboard/settings'
                ? 'text-teal-700 bg-teal-100 font-semibold'
                : 'text-gray-600 hover:text-teal-700 hover:bg-teal-50'
            }`}
          >
            <Settings className={`w-5 h-5 mr-3 ${location.pathname === '/dashboard/settings' ? 'text-teal-600' : 'text-gray-400 group-hover:text-teal-600'}`} />
            Settings
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-150"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        {/* Top navbar */}
        <header className="sticky top-0 right-0 left-0 lg:left-64 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden mr-3"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {location.pathname === '/dashboard'
                  ? 'Dashboard'
                  : location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Notifications */}
              <div className="relative" data-menu-button>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    if (!isNotificationsOpen) {
                      fetchNotifications();
                    }
                  }}
                  className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>
                {isNotificationsOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 sm:w-80 max-h-[70vh] overflow-hidden origin-top-right rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 animate-fade-in-down flex flex-col"
                    role="menu" aria-orientation="vertical" aria-labelledby="notification-button" tabIndex={-1}
                    data-menu-dropdown
                  >
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-teal-600 hover:text-teal-800 flex items-center"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[60vh]">
                      {loading ? (
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          Loading notifications...
                        </div>
                      ) : notifications.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {notifications.map((notification) => {
                            const { icon: Icon, bg, color } = getNotificationIcon(notification.type);
                            return (
                              <li 
                                key={notification.id} 
                                className={`px-4 py-3 hover:bg-gray-50 ${!notification.isRead ? 'bg-teal-50/30' : ''}`}
                              >
                                <div className="flex items-start">
                                  <div className={`flex-shrink-0 p-2 ${bg} rounded-full`}>
                                    <Icon className={`h-4 w-4 ${color}`} />
                                  </div>
                                  <div className="ml-3 flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                      {notification.title}
                                    </p>
                                    {notification.description && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {notification.description}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {getTimeAgo(notification.timestamp)}
                                    </p>
                                  </div>
                                  {!notification.isRead && (
                                    <button 
                                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                                      className="flex-shrink-0 ml-2 p-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                                      title="Mark as read"
                                    >
                                      <Check className="h-3 w-3 text-teal-600" />
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <Link to="#" className="block text-center text-sm font-medium text-teal-600 hover:text-teal-700">
                        View all
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative" data-menu-button>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500 transition duration-150 ease-in-out"
                  aria-label="Open user menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center ring-1 ring-white/50">
                    <span className="text-sm font-medium text-white">
                      {currentUser?.firstName?.[0] || 'U'}{currentUser?.lastName?.[0] || ''}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {currentUser?.firstName || currentUser?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProfileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 origin-top-right rounded-lg shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 animate-fade-in-down"
                    role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabIndex={-1}
                    data-menu-dropdown
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.firstName} {currentUser?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                    </div>
                    <div className="py-1" role="none">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem" tabIndex={-1} onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="w-4 h-4 mr-2.5 text-gray-400" />
                        Your Profile
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem" tabIndex={-1} onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-2.5 text-gray-400" />
                        Settings
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 py-1" role="none">
                      <button
                        onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                        role="menuitem" tabIndex={-1}
                      >
                        <LogOut className="w-4 h-4 mr-2.5" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
