import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit, UserPlus } from 'lucide-react';
import { useAuth, isPharmacyStaffUser } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { API_URL } from '../../config';

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
}

const PharmacyStaff: React.FC = () => {
  const { currentUser } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'CASHIER',
  });

  // Make sure currentUser is a pharmacy staff and get the pharmacyId
  const pharmacyId = isPharmacyStaffUser(currentUser) ? currentUser.pharmacyId : null;

  useEffect(() => {
    if (!pharmacyId) return;
    
    const fetchStaffMembers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/pharmacies/${pharmacyId}/staff`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch staff members');
        }
        
        const data = await response.json();
        setStaffMembers(data);
      } catch (error) {
        console.error('Error fetching staff members:', error);
        toast.error('Failed to load staff members');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStaffMembers();
  }, [pharmacyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStaffForm({
      ...newStaffForm,
      [name]: value,
    });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pharmacyId) {
      toast.error('Pharmacy ID not found');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/pharmacies/${pharmacyId}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newStaffForm,
          pharmacyId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add staff member');
      }
      
      const newStaff = await response.json();
      setStaffMembers([...staffMembers, newStaff]);
      toast.success('Staff member added successfully');
      
      // Reset form
      setNewStaffForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'CASHIER',
      });
      setIsAddingStaff(false);
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  if (loading && staffMembers.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Users className="mr-2" />
          Pharmacy Staff Management
        </h1>
        <button 
          onClick={() => setIsAddingStaff(!isAddingStaff)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded flex items-center"
        >
          {isAddingStaff ? 'Cancel' : <><UserPlus className="mr-2" /> Add Staff Member</>}
        </button>
      </div>

      {isAddingStaff && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Staff Member</h2>
          <form onSubmit={handleAddStaff}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={newStaffForm.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={newStaffForm.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newStaffForm.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={newStaffForm.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={newStaffForm.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded"
              >
                {loading ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No staff members found. Add your first staff member.
                </td>
              </tr>
            ) : (
              staffMembers.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {staff.firstName} {staff.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{staff.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      staff.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {staff.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <Edit size={18} />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PharmacyStaff; 