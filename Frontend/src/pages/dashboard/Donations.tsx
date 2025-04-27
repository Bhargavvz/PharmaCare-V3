import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  Filter,
  MapPin,
  Calendar,
  Package,
  ChevronRight,
  Plus,
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { donationService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Donation {
  id: number;
  medicineName: string;
  quantity: number;
  expiryDate: string;
  location: string;
  status: string;
  organization?: string;
  notes?: string;
  donationDate: string;
  completedDate?: string;
  donorName?: string;
}

const Donations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [newDonation, setNewDonation] = useState({
    medicineName: '',
    quantity: 1,
    expiryDate: format(new Date().setMonth(new Date().getMonth() + 6), 'yyyy-MM-dd'),
    location: '',
    organization: '',
    notes: '',
  });

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      const response = await donationService.getAll();
      console.log('Fetched donations:', response);
      setDonations(response);
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('Failed to load donations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await donationService.create({
        medicineName: newDonation.medicineName,
        quantity: Number(newDonation.quantity),
        expiryDate: newDonation.expiryDate,
        location: newDonation.location,
        organization: newDonation.organization,
        notes: newDonation.notes,
        status: 'PENDING'
      });
      
      setIsAddModalOpen(false);
      setNewDonation({
        medicineName: '',
        quantity: 1,
        expiryDate: format(new Date().setMonth(new Date().getMonth() + 6), 'yyyy-MM-dd'),
        location: '',
        organization: '',
        notes: '',
      });
      
      toast.success('Donation added successfully');
      fetchDonations();
    } catch (error) {
      console.error('Error adding donation:', error);
      toast.error('Failed to add donation');
    }
  };

  const handleCancelDonation = async () => {
    if (!selectedDonation) return;
    
    try {
      await donationService.updateStatus(selectedDonation.id, 'REJECTED');
      setShowCancelModal(false);
      setSelectedDonation(null);
      toast.success('Donation cancelled successfully');
      fetchDonations();
    } catch (error) {
      console.error('Error cancelling donation:', error);
      toast.error('Failed to cancel donation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-teal-100 text-teal-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'COMPLETED':
        return 'Completed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch = 
      donation.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (donation.organization && donation.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (donation.notes && donation.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      activeTab === 'available' ? donation.status === 'PENDING' : donation.status !== 'PENDING';
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicine Donations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Donate unused medicines to help those in need
          </p>
        </div>
        <button
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          New Donation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Heart className="h-6 w-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Donations</p>
              <p className="text-2xl font-semibold text-gray-900">{donations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Package className="h-6 w-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Medicines Donated</p>
              <p className="text-2xl font-semibold text-gray-900">
                {donations.reduce((total, donation) => total + donation.quantity, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MapPin className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Collection Centers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(donations.map(d => d.location)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Available Donations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Donation History
          </button>
        </nav>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Filter className="w-5 h-5 mr-2 text-gray-400" />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading donations...</p>
            </div>
          ) : filteredDonations.length > 0 ? (
            filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className="p-6 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {donation.medicineName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          donation.status
                        )}`}
                      >
                        {getDisplayStatus(donation.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 mr-2 text-gray-400" />
                        {donation.quantity} units
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                        Expires: {donation.expiryDate}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                        {donation.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-gray-400" />
                        {donation.donorName || 'Personal Donation'}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="ml-6 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    onClick={() => {
                      if (donation.status === 'PENDING') {
                        setSelectedDonation(donation);
                        setShowCancelModal(true);
                      }
                    }}
                  >
                    {donation.status === 'PENDING' ? (
                      <X className="w-5 h-5 text-red-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-teal-100 p-4 mb-5">
                <Heart className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">No donations found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xs">
                {searchQuery || activeTab !== 'available'
                  ? `No donations matching your criteria.`
                  : "You haven't made any donations yet. Help someone in need by donating your unused medicine."}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-6 inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <Plus className="h-5 w-5 mr-2 -ml-1" />
                Donate Medicine
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-teal-50 p-6 rounded-xl border border-teal-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-teal-900">Find Collection Centers</h3>
            <p className="mt-1 text-sm text-teal-800">
              Locate nearby medicine collection centers and drop off your donations.
              All donations are verified and distributed to those in need.
            </p>
            <button className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 text-sm font-medium">
              Find Nearest Center
            </button>
          </div>
        </div>
      </div>

      {showCancelModal && selectedDonation && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCancelModal(false)}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Cancel Donation
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to cancel your donation of {selectedDonation.medicineName}? This action
                        cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCancelDonation}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel Donation
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Keep Donation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsAddModalOpen(false)}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Donation</h3>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddDonation}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="medicineName" className="block text-sm font-medium text-gray-700">Medicine Name*</label>
                      <input
                        type="text"
                        id="medicineName"
                        value={newDonation.medicineName}
                        onChange={(e) => setNewDonation({...newDonation, medicineName: e.target.value})}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity*</label>
                      <input
                        type="number"
                        id="quantity"
                        min="1"
                        value={newDonation.quantity}
                        onChange={(e) => setNewDonation({...newDonation, quantity: parseInt(e.target.value, 10)})}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Expiry Date*</label>
                      <input
                        type="date"
                        id="expiryDate"
                        value={newDonation.expiryDate}
                        onChange={(e) => setNewDonation({...newDonation, expiryDate: e.target.value})}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location*</label>
                      <input
                        type="text"
                        id="location"
                        value={newDonation.location}
                        onChange={(e) => setNewDonation({...newDonation, location: e.target.value})}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="organization" className="block text-sm font-medium text-gray-700">Organization</label>
                      <input
                        type="text"
                        id="organization"
                        value={newDonation.organization}
                        onChange={(e) => setNewDonation({...newDonation, organization: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        id="notes"
                        value={newDonation.notes}
                        onChange={(e) => setNewDonation({...newDonation, notes: e.target.value})}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Add Donation
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;
