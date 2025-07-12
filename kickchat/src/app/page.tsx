'use client';

import { Bluetooth, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import DeviceDiscovery from '../components/DeviceDiscovery';
import NearbyUsers from '../components/NearbyUsers';
import UserProfile from '../components/UserProfile';
import BluetoothChatService, { ChatDevice, ChatUser } from '../lib/bluetooth';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ChatDevice | null>(null);
  const [showDeviceDiscovery, setShowDeviceDiscovery] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(false);
  const bluetoothService = BluetoothChatService.getInstance();

  useEffect(() => {
    // Check if Bluetooth is supported
    setIsBluetoothSupported(bluetoothService.isBluetoothSupported());

    // Load current user
    const user = bluetoothService.getCurrentUser();
    setCurrentUser(user);

    // If no user, show profile setup
    if (!user) {
      setShowUserProfile(true);
    }
  }, []);

  const handleUserSetup = (user: ChatUser) => {
    setCurrentUser(user);
    setShowUserProfile(false);
  };

  const handleDeviceSelect = (device: ChatDevice) => {
    setSelectedDevice(device);
    setShowDeviceDiscovery(false);
  };

  const handleShowDeviceDiscovery = () => {
    setShowDeviceDiscovery(true);
  };

  const handleShowUserProfile = () => {
    setShowUserProfile(true);
  };

  if (!isBluetoothSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bluetooth size={64} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">KickChat</h1>
          <p className="text-gray-600 mb-4">
            Bluetooth is not supported on this device or browser.
          </p>
          <p className="text-sm text-gray-500">
            Please use a supported browser like Chrome, Edge, or Opera on desktop,
            or enable Bluetooth in your browser settings.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bluetooth size={64} className="mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">KickChat</h1>
          <p className="text-gray-600 mb-4">
            Welcome to KickChat! Please set up your profile to get started.
          </p>
        </div>
        {showUserProfile && (
          <UserProfile
            user={currentUser}
            onUserSetup={handleUserSetup}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Bluetooth size={24} className="text-blue-500 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">KickChat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Hi, {currentUser.name}!</span>
                {currentUser.avatar && (
                  <span className="text-lg">{currentUser.avatar}</span>
                )}
              </div>
              <button
                onClick={handleShowUserProfile}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                title="Edit Profile"
              >
                <User size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Current Connection */}
            {selectedDevice && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h2 className="text-lg font-semibold mb-3">Current Chat</h2>
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Bluetooth size={16} className="text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedDevice.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${selectedDevice.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {selectedDevice.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Nearby Users */}
            <NearbyUsers
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              onShowAllDevices={handleShowDeviceDiscovery}
            />
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <ChatInterface
                selectedDevice={selectedDevice}
                onDeviceSelect={handleShowDeviceDiscovery}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showDeviceDiscovery && (
        <DeviceDiscovery
          onDeviceSelect={handleDeviceSelect}
          onClose={() => setShowDeviceDiscovery(false)}
        />
      )}

      {showUserProfile && (
        <UserProfile
          user={currentUser}
          onUserSetup={handleUserSetup}
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </div>
  );
}
