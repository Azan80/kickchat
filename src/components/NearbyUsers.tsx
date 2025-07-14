'use client';

import { Bluetooth, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import BluetoothChatService, { ChatDevice } from '../lib/bluetooth';

interface NearbyUsersProps {
    selectedDevice: ChatDevice | null;
    onDeviceSelect: (device: ChatDevice) => void;
    onShowAllDevices: () => void;
}

export default function NearbyUsers({ selectedDevice, onDeviceSelect, onShowAllDevices }: NearbyUsersProps) {
    const [nearbyDevices, setNearbyDevices] = useState<ChatDevice[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
    const bluetoothService = BluetoothChatService.getInstance();

    useEffect(() => {
        // Load existing devices
        const existingDevices = bluetoothService.getAllDevices();
        setNearbyDevices(existingDevices);

        // Set up listeners
        const handleConnection = (device: ChatDevice) => {
            setNearbyDevices(prev => prev.map(d =>
                d.id === device.id ? { ...d, connected: true, isKickChatDevice: device.isKickChatDevice } : d
            ));
        };

        const handleDisconnection = (deviceId: string) => {
            setNearbyDevices(prev => prev.map(d =>
                d.id === deviceId ? { ...d, connected: false } : d
            ));
        };

        const handleDeviceFound = (device: ChatDevice) => {
            setNearbyDevices(prev => {
                const existing = prev.find(d => d.id === device.id);
                if (existing) {
                    return prev.map(d => d.id === device.id ? device : d);
                }
                return [...prev, device];
            });
        };

        bluetoothService.onConnection(handleConnection);
        bluetoothService.onDisconnection(handleDisconnection);
        bluetoothService.onDeviceFound(handleDeviceFound);

        // Start auto-scanning if Bluetooth is supported
        if (bluetoothService.isBluetoothSupported()) {
            scanForDevices();
        }

        return () => {
            // Cleanup listeners would go here if the service supported removal
        };
    }, []);

    // Auto-scan every 15 seconds
    useEffect(() => {
        if (!bluetoothService.isBluetoothSupported()) return;

        const interval = setInterval(() => {
            scanForDevices();
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Update scanning state
    useEffect(() => {
        const interval = setInterval(() => {
            const scanningState = bluetoothService.isScanningInProgress();
            const lastScan = bluetoothService.getLastScanTime();

            setIsScanning(scanningState);
            setLastScanTime(lastScan);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const scanForDevices = async () => {
        if (!bluetoothService.isBluetoothSupported() || bluetoothService.isScanningInProgress()) {
            return;
        }

        try {
            await bluetoothService.requestDevice();
            // Clean up old devices periodically
            bluetoothService.cleanupOldDevices();

            // Refresh the device list
            const devices = bluetoothService.getAllDevices();
            setNearbyDevices(devices);
        } catch (error: any) {
            // Silently handle user cancellation or other errors
            if (error.message && !error.message.includes('User cancelled')) {
                console.error('Background scan error:', error);
            }
        }
    };

    const handleQuickConnect = async (device: ChatDevice) => {
        if (device.connected) {
            onDeviceSelect(device);
            return;
        }

        try {
            const success = await bluetoothService.connectToDevice(device.id);
            if (success) {
                onDeviceSelect(device);
            }
        } catch (error) {
            console.error('Error connecting to device:', error);
            // For errors, show the full device discovery modal
            onShowAllDevices();
        }
    };

    const formatLastSeen = (device: ChatDevice) => {
        const now = new Date();
        const diff = now.getTime() - device.lastSeen.getTime();
        const minutes = Math.floor(diff / (1000 * 60));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const getDeviceStatusText = (device: ChatDevice) => {
        if (device.connected) {
            return device.isKickChatDevice ? 'Connected (KickChat)' : 'Connected (Standard)';
        }
        return `Seen ${formatLastSeen(device)}`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                    <Users className="mr-2" size={20} />
                    Nearby Users
                </h2>
                <div className="flex items-center space-x-2">
                    {isScanning && (
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                    )}
                    <button
                        onClick={onShowAllDevices}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                        View All
                    </button>
                </div>
            </div>

            {nearbyDevices.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                    <Bluetooth size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No devices found</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Scanning automatically every 15s
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {nearbyDevices.slice(0, 5).map((device) => (
                        <div
                            key={device.id}
                            className={`flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors ${selectedDevice?.id === device.id ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                            onClick={() => handleQuickConnect(device)}
                        >
                            <div className="flex items-center space-x-2">
                                <div className="p-1 bg-blue-100 rounded-full">
                                    <Bluetooth size={14} className="text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{device.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {getDeviceStatusText(device)}
                                    </p>
                                    {device.isKickChatDevice !== undefined && (
                                        <p className="text-xs text-gray-400">
                                            {device.isKickChatDevice ? 'KickChat Device' : 'Standard BLE'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${device.connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                {selectedDevice?.id === device.id && (
                                    <span className="text-xs text-blue-600">Active</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {nearbyDevices.length > 5 && (
                        <div className="text-center pt-2">
                            <button
                                onClick={onShowAllDevices}
                                className="text-xs text-blue-500 hover:text-blue-700"
                            >
                                +{nearbyDevices.length - 5} more devices
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 