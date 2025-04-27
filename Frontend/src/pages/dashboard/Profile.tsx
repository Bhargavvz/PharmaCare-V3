import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mail, Phone, User, MapPin, Calendar, Shield, X, Plus, Loader2 } from 'lucide-react';
import { userService, UserProfile } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Profile: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState<UserProfile>({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    bloodType: 'O+',
    allergies: [],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });
  
  // Use the useAuth hook instead of direct context
  const { currentUser } = useAuth();
  
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // First try to get user data from auth context
      if (currentUser) {
        console.log('Fetching profile using currentUser data');
        
        // Get data from userData which may have profile fields
        const userData = localStorage.getItem('userData');
        const userDataObj = userData ? JSON.parse(userData) : null;
        
        // Initialize with basic user details
        let initialProfile = initializeProfileFromUser(currentUser);
        
        // Check if there is stored profile data in localStorage
        const storedProfile = localStorage.getItem('userProfile');
        
        if (storedProfile) {
          const storedProfileData = JSON.parse(storedProfile);
          // Only use if IDs match
          if (storedProfileData.id === currentUser.id) {
            console.log('Found matching stored profile data');
            initialProfile = {
              ...initialProfile,
              ...storedProfileData
            };
          }
        }
        
        // Enhance with additional fields from userData if available
        if (userDataObj) {
          // Add any additional fields from userData
          if (userDataObj.phone) initialProfile.phone = userDataObj.phone;
          if (userDataObj.dateOfBirth) initialProfile.dateOfBirth = userDataObj.dateOfBirth;
          if (userDataObj.address) initialProfile.address = userDataObj.address;
          if (userDataObj.bloodType) initialProfile.bloodType = userDataObj.bloodType;
          if (userDataObj.allergies) initialProfile.allergies = userDataObj.allergies;
          if (userDataObj.emergencyContact) initialProfile.emergencyContact = userDataObj.emergencyContact;
        }
        
        setProfileData(initialProfile);
        
        // Try to get from API as well to ensure latest data
        try {
          const apiProfile = await userService.getProfile();
          // Merge API data with what we already have
          setProfileData(prev => ({
            ...prev,
            ...apiProfile
          }));
          // Update localStorage with the merged data
          localStorage.setItem('userProfile', JSON.stringify({
            ...initialProfile,
            ...apiProfile
          }));
        } catch (apiError) {
          console.error('API error fetching profile:', apiError);
          // Still save what we have to localStorage
          localStorage.setItem('userProfile', JSON.stringify(initialProfile));
        }
        
        setIsLoading(false);
        return;
      }
      
      // Fallback: try localStorage if no currentUser
      const storedProfile = localStorage.getItem('userProfile');
      if (storedProfile) {
        setProfileData(JSON.parse(storedProfile));
        setIsLoading(false);
        return;
      }
      
      // Last resort: try API directly
      try {
        const profile = await userService.getProfile();
        setProfileData(profile);
        localStorage.setItem('userProfile', JSON.stringify(profile));
      } catch (apiError) {
        console.error('API error fetching profile:', apiError);
        toast.error('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to initialize profile from basic user data
  const initializeProfileFromUser = (user: any): UserProfile => {
    return {
      id: user.id || 0,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.roles?.[0] || 'ROLE_USER',
      imageUrl: user.imageUrl || null,
      phone: '',
      dateOfBirth: '',
      address: '',
      bloodType: 'O+',
      allergies: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    };
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested fields for emergency contact
    if (name.startsWith('emergency.')) {
      const field = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact!,
          [field]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Use the updated updateProfile method
      const updatedProfile = await userService.updateProfile(profileData);
      setProfileData(updatedProfile);
      
      // Update both storages
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Also update userData to keep them in sync
      const userData = localStorage.getItem('userData');
      if (userData) {
        const userDataObj = JSON.parse(userData);
        const updatedUserData = {
          ...userDataObj,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          // Include other fields that should be synced
          phone: updatedProfile.phone,
          dateOfBirth: updatedProfile.dateOfBirth,
          address: updatedProfile.address,
          bloodType: updatedProfile.bloodType,
          allergies: updatedProfile.allergies,
          emergencyContact: updatedProfile.emergencyContact
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
      }
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword.new !== newPassword.confirm) {
      setPasswordError("New passwords don't match");
      return;
    }
    
    try {
      // Use the updated updatePassword method
      const result = await userService.updatePassword(newPassword.current, newPassword.new);
      if (result.success) {
        toast.success('Password updated successfully');
        setShowPasswordModal(false);
        setNewPassword({ current: '', new: '', confirm: '' });
      } else {
        setPasswordError('Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError('Failed to update password. Please check your current password.');
    }
  };
  
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      // Use the updated updateAvatar method
      const response = await userService.updateAvatar(formData) as { success: boolean; imageUrl?: string };
      if (response.success && response.imageUrl) {
        setProfileData(prev => ({
          ...prev,
          imageUrl: response.imageUrl
        }));
        toast.success('Profile picture updated');
      } else {
        toast.error('Failed to update profile picture');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to update profile picture');
    }
  };
  
  const handleRemoveAllergy = (indexToRemove: number) => {
    setProfileData(prev => ({
      ...prev,
      allergies: prev.allergies?.filter((_, index) => index !== indexToRemove) || []
    }));
  };

  const handleAddAllergy = () => {
    setShowAllergyModal(true);
  };

  const handleSubmitAllergy = () => {
    if (newAllergy.trim()) {
      setProfileData(prev => ({
        ...prev,
        allergies: [...(prev.allergies || []), newAllergy.trim()]
      }));
      setNewAllergy('');
      setShowAllergyModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your personal information and preferences
          </p>
        </div>
        <button
          onClick={isEditing ? handleSaveChanges : () => setIsEditing(true)}
          disabled={isSaving}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={handleAvatarClick}
            >
              {profileData.imageUrl ? (
                <img 
                  src={profileData.imageUrl} 
                  alt={`${profileData.firstName} ${profileData.lastName}`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-teal-100 flex items-center justify-center">
                  <User className="w-12 h-12 text-teal-600" />
                </div>
              )}
            </div>
            {isEditing && (
              <button 
                className="absolute bottom-0 right-0 p-1.5 bg-teal-600 rounded-full text-white hover:bg-teal-700"
                onClick={handleAvatarClick}
              >
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {profileData.firstName} {profileData.lastName}
            </h2>
            <p className="text-sm text-gray-500">Update your photo and personal details</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="firstName"
              value={profileData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={profileData.lastName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <div className="mt-1 flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="tel"
                name="phone"
                value={profileData.phone || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className="mt-1 flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="date"
                name="dateOfBirth"
                value={profileData.dateOfBirth || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <div className="mt-1 flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="text"
                name="address"
                value={profileData.address || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Blood Type</label>
            <select
              name="bloodType"
              value={profileData.bloodType || 'O+'}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Allergies</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {profileData.allergies?.map((allergy, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                >
                  {allergy}
                  {isEditing && (
                    <button 
                      onClick={() => handleRemoveAllergy(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <button 
                  onClick={handleAddAllergy}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                  type="button"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Allergy
                </button>
              )}
              {(!profileData.allergies || profileData.allergies.length === 0) && !isEditing && (
                <span className="text-gray-500 text-sm">No allergies recorded</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="emergency.name"
              value={profileData.emergencyContact?.name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Relationship</label>
            <input
              type="text"
              name="emergency.relationship"
              value={profileData.emergencyContact?.relationship || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <div className="mt-1 flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="tel"
                name="emergency.phone"
                value={profileData.emergencyContact?.phone || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
            <p className="text-sm text-gray-500">Manage your password and security settings</p>
          </div>
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <div className="space-y-4">
          <button 
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => setShowPasswordModal(true)}
          >
            <div className="font-medium text-gray-900">Change Password</div>
            <div className="text-sm text-gray-500">Update your password regularly to keep your account secure</div>
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50">
            <div className="font-medium text-gray-900">Two-Factor Authentication</div>
            <div className="text-sm text-gray-500">Add an extra layer of security to your account</div>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={newPassword.current}
                  onChange={(e) => setNewPassword({...newPassword, current: e.target.value})}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={newPassword.new}
                  onChange={(e) => setNewPassword({...newPassword, new: e.target.value})}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={newPassword.confirm}
                  onChange={(e) => setNewPassword({...newPassword, confirm: e.target.value})}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allergy Modal */}
      {showAllergyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Allergy</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitAllergy(); }}>
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Enter new allergy"
                autoFocus
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setNewAllergy(''); setShowAllergyModal(false); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Add Allergy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
