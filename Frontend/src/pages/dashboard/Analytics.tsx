import React, { useState, useEffect } from 'react';
import {
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pill
} from 'lucide-react';
// Import recharts with legacy method to avoid TypeScript issues
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { 
  analyticsService, 
  DashboardAnalytics, 
  AdherenceAnalytics, 
  MedicationAnalytics,
  AdherenceHistoryPoint,
  MedicationCalendarEntry
} from '../../services/api';
import { toast } from 'react-hot-toast';
import { format, subDays, parseISO, isValid, addMonths, subMonths } from 'date-fns';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardAnalytics>({
    activeMedicationsCount: 0,
    pendingRemindersCount: 0,
    adherenceRate: 0,
    missedRemindersCount: 0
  });
  const [adherenceData, setAdherenceData] = useState<AdherenceAnalytics>({
    adherenceByDayOfWeek: {},
    adherenceByTimeOfDay: {}
  });
  const [medicationData, setMedicationData] = useState<MedicationAnalytics>({
    medicationsByStatus: {}
  });
  const [adherenceTrend, setAdherenceTrend] = useState<AdherenceHistoryPoint[]>([]);
  const [calendarData, setCalendarData] = useState<MedicationCalendarEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMedicationFilter, setSelectedMedicationFilter] = useState<string>("all");

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, selectedMedicationFilter]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      
      const [dashboardData, adherenceData, medicationData, historyData] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getAdherenceAnalytics(),
        analyticsService.getMedicationAnalytics(),
        analyticsService.getAdherenceHistory(days)
      ]);

      setDashboardStats(dashboardData);
      setAdherenceData(adherenceData);
      setMedicationData(medicationData);
      setAdherenceTrend(historyData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const month = currentMonth.getMonth();
      const year = currentMonth.getFullYear();
      const data = await analyticsService.getMedicationCalendar(month, year);
      setCalendarData(data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  // Format day of week data for chart
  const formatDayOfWeekData = () => {
    const daysOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const daysDisplay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return daysOrder.map((day, index) => ({
      name: daysDisplay[index],
      adherence: adherenceData.adherenceByDayOfWeek[day] || 0
    }));
  };

  // Format time of day data for chart
  const formatTimeOfDayData = () => {
    const timeOrder = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
    const timeDisplay = ['Morning', 'Afternoon', 'Evening', 'Night'];
    
    return timeOrder.map((time, index) => ({
      name: timeDisplay[index],
      adherence: adherenceData.adherenceByTimeOfDay[time] || 0
    }));
  };

  // Format medication status data for pie chart
  const formatMedicationStatusData = () => {
    const data = [];
    if (medicationData.medicationsByStatus) {
      for (const [status, count] of Object.entries(medicationData.medicationsByStatus)) {
        data.push({
          name: status.charAt(0) + status.slice(1).toLowerCase(),
          value: count
        });
      }
    }
    return data;
  };

  // Format adherence trend data for line chart
  const formatAdherenceTrendData = () => {
    return adherenceTrend.map(point => ({
      date: point.date,
      adherence: point.adherence
    }));
  };

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="font-semibold">{label}</p>
          <p className="text-teal-600">
            {`Adherence: ${payload[0].value}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  const stats = [
    {
      name: 'Adherence Rate',
      value: `${dashboardStats.adherenceRate}%`,
      change: '+2.5%',
      trend: 'up',
    },
    {
      name: 'Missed Doses',
      value: `${dashboardStats.missedRemindersCount}`,
      change: '-1',
      trend: 'down',
    },
    {
      name: 'Pending Reminders',
      value: `${dashboardStats.pendingRemindersCount}`,
      change: '0',
      trend: 'neutral',
    },
    {
      name: 'Active Medications',
      value: `${dashboardStats.activeMedicationsCount}`,
      change: '0',
      trend: 'neutral',
    },
  ];

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-8">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

  // CSS classes for calendar day status
  const statusClasses = {
    taken: "bg-green-100 text-green-800 border-green-200",
    missed: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-blue-100 text-blue-800 border-blue-200"
  };

  // Status icons for medication
  const statusIcons = {
    taken: <CheckCircle className="h-4 w-4 text-green-600" />,
    missed: <XCircle className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-blue-600" />
  };

  // Get the first day of the month
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  
  // Get the day of the week (0-6, where 0 is Sunday) of the first day of the month
  const startDayOfWeek = firstDayOfMonth.getDay();
  
  // Get the number of days in the month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  
  // Create calendar grid
  const calendarGrid = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarGrid.push(null);
  }
  
  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = calendarData.find(d => d.date === dateStr);
    calendarGrid.push({ day, date: dateStr, data: dayData });
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track your medication adherence and health patterns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : stat.trend === 'down' ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Activity className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline">
                  <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      stat.trend === 'up'
                        ? 'text-emerald-600'
                        : stat.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Adherence Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Adherence Trend</h2>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
              <div className="h-80">
                {/* @ts-ignore */}
                <ResponsiveContainer width="100%" height="100%">
                  {/* @ts-ignore */}
                  <LineChart
                    data={formatAdherenceTrendData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* @ts-ignore */}
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
                    />
                    {/* @ts-ignore */}
                    <YAxis domain={[0, 100]}>
                      {/* @ts-ignore */}
                      <Label
                        angle={-90}
                        value="Adherence (%)"
                        position="insideLeft"
                        style={{ textAnchor: 'middle' }}
                      />
                    </YAxis>
                    {/* @ts-ignore */}
                    <Tooltip content={<CustomTooltip />} />
                    {/* @ts-ignore */}
                    <Legend />
                    {/* @ts-ignore */}
                    <Line
                      type="monotone"
                      dataKey="adherence"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Adherence"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Medication Timing */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Adherence by Time of Day</h2>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
              <div className="h-80">
                {/* @ts-ignore */}
                <ResponsiveContainer width="100%" height="100%">
                  {/* @ts-ignore */}
                  <BarChart
                    data={formatTimeOfDayData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* @ts-ignore */}
                    <XAxis dataKey="name" />
                    {/* @ts-ignore */}
                    <YAxis domain={[0, 100]}>
                      {/* @ts-ignore */}
                      <Label
                        angle={-90}
                        value="Adherence (%)"
                        position="insideLeft"
                        style={{ textAnchor: 'middle' }}
                      />
                    </YAxis>
                    {/* @ts-ignore */}
                    <Tooltip />
                    {/* @ts-ignore */}
                    <Legend />
                    {/* @ts-ignore */}
                    <Bar dataKey="adherence" name="Adherence %" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Medication Distribution */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Medication Status
                </h2>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
              <div className="h-80">
                {/* @ts-ignore */}
                <ResponsiveContainer width="100%" height="100%">
                  {/* @ts-ignore */}
                  <PieChart>
                    {/* @ts-ignore */}
                    <Pie
                      data={formatMedicationStatusData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {formatMedicationStatusData().map((entry, index) => (
                        /* @ts-ignore */
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    {/* @ts-ignore */}
                    <Tooltip />
                    {/* @ts-ignore */}
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Adherence by Day of Week */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Adherence by Day of Week</h2>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
              <div className="h-80">
                {/* @ts-ignore */}
                <ResponsiveContainer width="100%" height="100%">
                  {/* @ts-ignore */}
                  <BarChart
                    data={formatDayOfWeekData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* @ts-ignore */}
                    <XAxis dataKey="name" />
                    {/* @ts-ignore */}
                    <YAxis domain={[0, 100]}>
                      {/* @ts-ignore */}
                      <Label
                        angle={-90}
                        value="Adherence (%)"
                        position="insideLeft"
                        style={{ textAnchor: 'middle' }}
                      />
                    </YAxis>
                    {/* @ts-ignore */}
                    <Tooltip />
                    {/* @ts-ignore */}
                    <Legend />
                    {/* @ts-ignore */}
                    <Bar dataKey="adherence" name="Adherence %" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Calendar View */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Medication Calendar</h2>
              <div className="flex items-center space-x-4">
                <select 
                  className="block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={selectedMedicationFilter}
                  onChange={(e) => setSelectedMedicationFilter(e.target.value)}
                >
                  <option value="all">All Medications</option>
                  <option value="prescription">Prescription Only</option>
                  <option value="supplements">Supplements</option>
                </select>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Calendar className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Calendar Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={previousMonth}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              <h3 className="text-lg font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button 
                onClick={nextMonth}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center bg-gray-50 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 font-medium text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar cells */}
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarGrid.map((cell, index) => (
                  <div 
                    key={index} 
                    className={`min-h-[80px] border-b border-r border-gray-200 p-1 ${
                      !cell ? 'bg-gray-50' : ''
                    }`}
                  >
                    {cell && (
                      <>
                        <div className="text-sm font-medium mb-1">{cell.day}</div>
                        <div className="space-y-1 overflow-y-auto max-h-[72px] text-xs">
                          {cell.data?.medications.map((med, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center p-1 rounded border ${statusClasses[med.status]}`}
                            >
                              <div className="mr-1">{statusIcons[med.status]}</div>
                              <div className="truncate">
                                <span className="font-medium">{med.name}</span>
                                <span className="text-xs ml-1">({med.time})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex justify-end space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded-full mr-1"></div>
                <span>Taken</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded-full mr-1"></div>
                <span>Missed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full mr-1"></div>
                <span>Pending</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
