'use client';

import { Bluetooth, Loader2, Users, Wifi } from 'lucide-react';
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
                d.id === device.id ? { ...d, connected: true } : d
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

    const formatLastScan = () => {
        if (!lastScanTime) return 'Never';
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastScanTime.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const formatLastSeen = (device: ChatDevice) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - device.lastSeen.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    if (!bluetoothService.isBluetoothSupported()) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Users className="mr-2" size={20} />
                    Nearby Users
                </h2>
                <div className="text-center text-gray-500 py-4">
                    <Wifi size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Bluetooth not supported</p>
                </div>
            </div>
        );
    }

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

            <div className="space-y-2">
                {nearbyDevices.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                        <Bluetooth size={24} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No nearby users found</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {isScanning ? 'Scanning...' : `Last scan: ${formatLastScan()}`}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-xs text-gray-500 mb-2">
                            {nearbyDevices.length} user{nearbyDevices.length !== 1 ? 's' : ''} nearby
                            {!isScanning && (
                                <span className="ml-1">• Last scan: {formatLastScan()}</span>
                            )}
                        </div>
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
                                            {device.connected ? 'Connected' : `Seen ${formatLastSeen(device)}`}
                                        </p>
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
                            <button
                                onClick={onShowAllDevices}
                                className="w-full text-center text-sm text-blue-500 hover:text-blue-700 py-2"
                            >
                                View {nearbyDevices.length - 5} more...
                            </button>
                        )}
                    </>
                )}
            </div>

            {isScanning && (
                <div className="mt-3 text-xs text-blue-600 flex items-center justify-center space-x-1">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Scanning for nearby users...</span>
                </div>
            )}
        </div>
    );
} 