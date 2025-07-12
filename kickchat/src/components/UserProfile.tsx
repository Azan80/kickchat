'use client';

import { Save, User } from 'lucide-react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BluetoothChatService, { ChatUser } from '../lib/bluetooth';

interface UserProfileProps {
    user: ChatUser | null;
    onUserSetup: (user: ChatUser) => void;
    onClose?: () => void;
}

export default function UserProfile({ user, onUserSetup, onClose }: UserProfileProps) {
    const [name, setName] = useState(user?.name || '');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const bluetoothService = BluetoothChatService.getInstance();

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newUser: ChatUser = {
                id: user?.id || uuidv4(),
                name: name.trim(),
                avatar: user?.avatar
            };

            bluetoothService.setCurrentUser(newUser);
            onUserSetup(newUser);

            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('Failed to save profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveProfile();
        }
    };

    const avatarOptions = [
        '👤', '😊', '😎', '🤖', '👨‍💻', '👩‍💻', '🦸‍♂️', '🦸‍♀️', '🐱', '🐶', '🦊', '🐯'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center">
                            <User className="mr-2" size={24} />
                            {user ? 'Edit Profile' : 'Setup Profile'}
                        </h2>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        {/* Avatar Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Choose an Avatar
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {avatarOptions.map((avatar, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setName(name)} // For now, just visual selection
                                        className={`p-2 text-2xl rounded-lg border-2 hover:bg-gray-50 transition-colors ${user?.avatar === avatar ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                            }`}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter your name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={30}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSaveProfile}
                            disabled={isLoading || !name.trim()}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <Save size={20} />
                            <span>{isLoading ? 'Saving...' : 'Save Profile'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 