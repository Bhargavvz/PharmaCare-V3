import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, Plus, Check, X as CloseIcon, Search, Filter } from 'lucide-react';
import { reminderService, medicationService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';

interface Reminder {
  id: number;
  medicationId: number;
  medicationName: string;
  dosage: string;
  reminderTime: string;
  notes?: string;
  completed: boolean;
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
}

interface ReminderResponse {
  id: number;
  medicationId?: number;
  medicationName?: string;
  medicationDosage?: string;
  medication?: {
    id: number;
    name: string;
    dosage: string;
  };
  reminderTime: string;
  notes?: string;
  completed: boolean;
}

const Reminders: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicationId: undefined as number | undefined,
    reminderTime: format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
  });

  useEffect(() => {
    fetchReminders();
    fetchMedications();
  }, []);

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const response = await reminderService.getAll();
      console.log('Raw reminders response:', response);
      
      const formattedReminders = response.map((reminder: ReminderResponse): Reminder => {
        const parsedTime = reminder.reminderTime ? parseISO(reminder.reminderTime) : null;
        
        // Extract medication info with fallbacks
        const medicationId = reminder.medicationId || reminder.medication?.id || 0;
        let medicationName = 'Unknown Medication';
        let dosage = '';
        
        // Try to get medication name from various possible sources
        if (reminder.medicationName) {
          medicationName = reminder.medicationName;
        } else if (reminder.medication?.name) {
          medicationName = reminder.medication.name;
        }
        
        // Try to get dosage from various possible sources
        if (reminder.medicationDosage) {
          dosage = reminder.medicationDosage;
        } else if (reminder.medication?.dosage) {
          dosage = reminder.medication.dosage;
        }
        
        // Find matching medication in our local medications list for more details
        if (medicationId > 0 && (!medicationName || medicationName === 'Unknown Medication')) {
          const matchingMed = medications.find(med => med.id === medicationId);
          if (matchingMed) {
            medicationName = matchingMed.name;
            dosage = matchingMed.dosage;
          }
        }
        
        return {
          id: reminder.id,
          medicationId: medicationId,
          medicationName: medicationName,
          dosage: dosage,
          reminderTime: parsedTime && isValid(parsedTime) ? format(parsedTime, "yyyy-MM-dd'T'HH:mm") : '',
          notes: reminder.notes || undefined,
          completed: reminder.completed || false,
        };
      });
      
      console.log('Formatted reminders:', formattedReminders);
      setReminders(formattedReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const response = await medicationService.getAll();
      const activeMeds = response.filter((med: any) => med.active);
      setMedications(activeMeds);
      
      if (activeMeds.length > 0) {
        setNewReminder(prev => ({
          ...prev,
          medicationId: activeMeds[0].id
        }));
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReminder.medicationId) {
      toast.error('Please select a medication');
      return;
    }
    if (!newReminder.reminderTime) {
      toast.error('Please select a reminder time');
      return;
    }
    
    console.log('Submitting reminder with data:', newReminder);
    
    try {
      // Ensure medicationId is a number
      const medicationId = Number(newReminder.medicationId);
      
      // Safely parse the date
      let reminderTimeISO;
      try {
        const reminderDate = new Date(newReminder.reminderTime);
        if (isNaN(reminderDate.getTime())) {
          throw new Error('Invalid date format');
        }
        reminderTimeISO = reminderDate.toISOString();
      } catch (dateError) {
        console.error('Error parsing reminder date:', dateError);
        toast.error('Invalid date format. Please select a valid date and time.');
        return;
      }
      
      const reminderToCreate = {
        medicationId: medicationId,
        reminderTime: reminderTimeISO,
        notes: newReminder.notes || '',
        completed: false
      };
      
      console.log('Formatted reminder data for API:', reminderToCreate);
      
      const result = await reminderService.create(reminderToCreate);
      console.log('Reminder created successfully:', result);
      
      setShowAddModal(false);
      setNewReminder({
        medicationId: medications.length > 0 ? medications[0].id : undefined,
        reminderTime: format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm"),
        notes: '',
      });
      
      toast.success('Reminder added successfully');
      fetchReminders();
    } catch (error: any) {
      console.error('Error adding reminder:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.data && error.response.data.message) {
          toast.error(`Failed to add reminder: ${error.response.data.message}`);
        } else {
          toast.error('Failed to add reminder. Server error occurred.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('Failed to connect to the server. Please check your network connection.');
      } else {
        // Something happened in setting up the request
        toast.error(`Failed to add reminder: ${error.message}`);
      }
    }
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    const newStatus = !reminder.completed;
    try {
      // Optimistically update UI
      setReminders(reminders.map(r => r.id === reminder.id ? { ...r, completed: newStatus } : r));

      console.log(`Toggling reminder ${reminder.id} to ${newStatus ? 'completed' : 'pending'}`);
      
      if (newStatus) {
        // Mark as completed
        const result = await reminderService.markCompleted(reminder.id);
        console.log('Reminder marked complete response:', result);
      } else {
        // Mark as pending
        const result = await reminderService.update(reminder.id, { completed: newStatus });
        console.log('Reminder marked pending response:', result);
      }
      
      toast.success(newStatus ? 'Reminder marked complete' : 'Reminder marked pending');
      
      // Refresh the reminders list to ensure we have the latest data
      fetchReminders();
    } catch (error: any) {
      console.error('Error updating reminder status:', error);
      
      // Revert optimistic update
      setReminders(reminders.map(r => r.id === reminder.id ? { ...r, completed: !newStatus } : r));
      
      // Detailed error handling
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.data && error.response.data.message) {
          toast.error(`Failed to update reminder: ${error.response.data.message}`);
        } else {
          toast.error(`Server error (${error.response.status}): Failed to update reminder status`);
        }
      } else if (error.request) {
        toast.error('Network error: Failed to connect to server');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const handleDeleteReminder = async (id: number) => {
    const originalReminders = reminders;
    setReminders(reminders.filter(r => r.id !== id));
    try {
      await reminderService.delete(id);
      toast.success('Reminder deleted successfully');
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
      setReminders(originalReminders);
    }
  };

  const filteredReminders = reminders.filter((reminder) => {
    const matchesSearch = 
      reminder.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reminder.notes && reminder.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'pending' && !reminder.completed) || 
      (filterStatus === 'completed' && reminder.completed);
    return matchesSearch && matchesStatus;
  });

  const groupedReminders = filteredReminders.reduce((acc, reminder) => {
    const reminderDate = parseISO(reminder.reminderTime);
    const dateKey = isValid(reminderDate) ? format(reminderDate, 'yyyy-MM-dd') : 'Invalid Date';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(reminder);
    acc[dateKey].sort((a, b) => parseISO(a.reminderTime).getTime() - parseISO(b.reminderTime).getTime());
    return acc;
  }, {} as Record<string, Reminder[]>);

  const sortedDates = Object.keys(groupedReminders).sort((a, b) => {
    if (a === 'Invalid Date') return 1;
    if (b === 'Invalid Date') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-8">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4 p-4 border-b border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-5 bg-gray-300 rounded w-16"></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Stay on track with your medication schedule.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={medications.length === 0}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
            medications.length > 0 
              ? "bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500" 
              : "bg-gray-400 cursor-not-allowed"
          } transition-colors duration-200`}
          title={medications.length === 0 ? "Add a medication first" : "Add a reminder"}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Reminder
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Search medication or notes..."
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'completed')}
          className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg transition duration-150 ease-in-out"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <SkeletonLoader />
        ) : sortedDates.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {sortedDates.map((date) => (
              <div key={date} className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {date === 'Invalid Date' ? 'Invalid Date' : format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                <div className="space-y-3">
                  {groupedReminders[date].map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`group relative flex items-center justify-between p-4 rounded-lg transition-colors duration-150 ${
                        reminder.completed
                          ? 'bg-green-50/70 text-gray-600'
                          : 'bg-teal-50/60 text-gray-900 shadow-sm border border-teal-100'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleComplete(reminder)}
                        className={`absolute -left-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all duration-200 ${
                          reminder.completed
                            ? 'bg-green-600 text-white hover:bg-green-700 scale-100 opacity-100'
                            : 'bg-white text-gray-400 border border-gray-300 hover:border-teal-500 hover:text-teal-600 scale-90 opacity-70 group-hover:scale-100 group-hover:opacity-100'
                        }`}
                        aria-label={reminder.completed ? 'Mark as pending' : 'Mark as complete'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      
                      <div className="pl-8 flex-1 min-w-0">
                        <div className="flex items-center">
                          <p
                            className={`text-sm font-medium truncate ${
                              reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            {reminder.medicationName}
                          </p>
                          <span className="ml-2 text-xs text-gray-400 hidden sm:inline">
                            ({reminder.dosage})
                          </span>
                        </div>
                        {reminder.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{reminder.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <div className={`flex items-center text-sm font-medium ${reminder.completed ? 'text-gray-400' : 'text-teal-700'}`}>
                          <Clock className="h-4 w-4 mr-1 opacity-70" />
                          {isValid(parseISO(reminder.reminderTime)) ? format(parseISO(reminder.reminderTime), 'h:mm a') : 'Invalid Time'}
                        </div>
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-150 opacity-0 group-hover:opacity-100"
                          aria-label="Delete reminder"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-teal-100 p-4 mb-4">
              <Bell className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No reminders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'No reminders match your search or filter.'
                : "You haven't set any reminders yet."}
            </p>
            <button
              onClick={() => medications.length > 0 ? setShowAddModal(true) : window.location.href = '/dashboard/medications'}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              {medications.length > 0 ? "Set Reminder" : "Add Medication First"}
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 overflow-y-auto z-[60]">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full">
              <form onSubmit={handleAddReminder}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Reminder</h3>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors" aria-label="Close modal">
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-1">Medication <span className="text-red-500">*</span></label>
                    <select
                      id="medication"
                      value={newReminder.medicationId || ""}
                      onChange={(e) => setNewReminder({ ...newReminder, medicationId: parseInt(e.target.value) })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md transition duration-150 ease-in-out"
                      required
                    >
                      {medications.length === 0 && (
                        <option value="" disabled>No active medications found - add a medication first</option>
                      )}
                      {medications.length > 0 && medications.map((medication) => (
                        <option key={medication.id} value={medication.id}>
                          {medication.name} ({medication.dosage})
                        </option>
                      ))}
                    </select>
                  </div>
                  {medications.length === 0 && (
                    <div className="mt-2">
                      <a href="/dashboard/medications" className="text-sm text-teal-600 hover:text-teal-500">
                        Add a medication first
                      </a>
                    </div>
                  )}
                  <div>
                    <label htmlFor="reminderTime" className="block text-sm font-medium text-gray-700 mb-1">Reminder Time <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      id="reminderTime"
                      value={newReminder.reminderTime}
                      onChange={(e) => setNewReminder({ ...newReminder, reminderTime: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      id="notes"
                      value={newReminder.notes}
                      onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                      placeholder="e.g., Take with food"
                    ></textarea>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-lg">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150">
                    Add Reminder
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
