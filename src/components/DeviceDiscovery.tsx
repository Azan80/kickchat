'use client';

import { Bluetooth, Loader2, RefreshCw, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import BluetoothChatService, { ChatDevice } from '../lib/bluetooth';

interface DeviceDiscoveryProps {
    onDeviceSelect: (device: ChatDevice) => void;
    onClose: () => void;
}

export default function DeviceDiscovery({ onDeviceSelect, onClose }: DeviceDiscoveryProps) {
    const [devices, setDevices] = useState<ChatDevice[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoScan, setAutoScan] = useState(true);
    const [scanCount, setScanCount] = useState(0);
    const bluetoothService = BluetoothChatService.getInstance();

    useEffect(() => {
        // Load existing devices
        const existingDevices = bluetoothService.getAllDevices();
        setDevices(existingDevices);

        // Set up connection listener
        const handleConnection = (device: ChatDevice) => {
            setDevices(prev => prev.map(d =>
                d.id === device.id ? { ...d, connected: true, isKickChatDevice: device.isKickChatDevice } : d
            ));
            setConnectingDevice(null);
        };

        const handleDisconnection = (deviceId: string) => {
            setDevices(prev => prev.map(d =>
                d.id === deviceId ? { ...d, connected: false } : d
            ));
        };

        const handleDeviceFound = (device: ChatDevice) => {
            setDevices(prev => {
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

        // Auto-scan on mount
        if (bluetoothService.isBluetoothSupported()) {
            handleScanForDevices();
        }

        return () => {
            // Cleanup listeners would go here if the service supported removal
        };
    }, []);

    // Auto-scan every 10 seconds when enabled
    useEffect(() => {
        if (!autoScan || !bluetoothService.isBluetoothSupported()) return;

        const interval = setInterval(() => {
            if (!isScanning) {
                handleScanForDevices();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [autoScan, isScanning]);

    const handleScanForDevices = async () => {
        if (!bluetoothService.isBluetoothSupported()) {
            setError('Bluetooth is not supported on this device');
            return;
        }

        setIsScanning(true);
        setError(null);
        setScanCount(prev => prev + 1);

        try {
            console.log('Starting device scan...');
            const device = await bluetoothService.requestDevice();
            if (device) {
                setDevices(prev => {
                    const existing = prev.find(d => d.id === device.id);
                    if (existing) {
                        return prev.map(d => d.id === device.id ? device : d);
                    }
                    return [...prev, device];
                });
                console.log('Device found:', device.name);
            } else {
                console.log('No new devices found in this scan');
            }
        } catch (error: any) {
            // Don't show error if user just cancelled the dialog
            if (error.message && !error.message.includes('User cancelled')) {
                console.error('Error scanning for devices:', error);
                setError('Failed to scan for devices. Make sure Bluetooth is enabled and devices are nearby.');
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleConnectToDevice = async (device: ChatDevice) => {
        if (device.connected) {
            onDeviceSelect(device);
            onClose();
            return;
        }

        setConnectingDevice(device.id);
        setError(null);

        try {
            console.log('Attempting to connect to:', device.name);
            const success = await bluetoothService.connectToDevice(device.id);
            if (success) {
                console.log('Successfully connected to:', device.name);
                onDeviceSelect(device);
                onClose();
            } else {
                console.error('Failed to connect to:', device.name);
                setError(`Failed to connect to ${device.name}. Make sure the device is nearby and Bluetooth is enabled.`);
            }
        } catch (error: any) {
            console.error('Error connecting to device:', error);

            // Handle specific error types
            if (error.message?.includes('Device not supported')) {
                setError(`${device.name} is not supported for Bluetooth connections. Try a different device type.`);
            } else if (error.message?.includes('Permission denied')) {
                setError(`Permission denied. Please allow Bluetooth access and try again.`);
            } else if (error.message?.includes('Device may be busy')) {
                setError(`${device.name} may be busy or out of range. Try moving closer and disconnecting from other apps.`);
            } else if (error.message?.includes('Device unavailable')) {
                setError(`${device.name} is unavailable or already connected to another app. Try disconnecting it first.`);
            } else {
                setError(`Failed to connect to ${device.name}. Please try again.`);
            }
        } finally {
            setConnectingDevice(null);
        }
    };

    const handleDisconnectDevice = async (device: ChatDevice) => {
        try {
            await bluetoothService.disconnect(device.id);
        } catch (error) {
            console.error('Error disconnecting device:', error);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold flex items-center">
                        <Bluetooth className="mr-2" size={24} />
                        Device Discovery
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleScanForDevices}
                                    disabled={isScanning}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isScanning ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={16} />
                                    )}
                                    <span>{isScanning ? 'Scanning...' : 'Scan for Devices'}</span>
                                </button>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={autoScan}
                                        onChange={(e) => setAutoScan(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Auto-scan every 10s</span>
                                </label>
                            </div>
                            <div className="text-sm text-gray-500">
                                Scan count: {scanCount}
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="text-sm text-gray-600">
                            <p>• Make sure both devices have Bluetooth enabled</p>
                            <p>• Devices should be within 10-30 meters of each other</p>
                            <p>• Both devices need to have KickChat open for full functionality</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Available Devices ({devices.length})</h3>

                        {devices.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>No devices found</p>
                                <p className="text-sm">Click "Scan for Devices" to search for nearby devices</p>
                            </div>
                        ) : (
                            <>
                                {devices.map((device) => (
                                    <div
                                        key={device.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-full">
                                                <Bluetooth size={16} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{device.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {getDeviceStatusText(device)}
                                                </p>
                                                {device.isKickChatDevice !== undefined && (
                                                    <p className="text-xs text-gray-400">
                                                        {device.isKickChatDevice ? 'KickChat Device' : 'Standard BLE Device'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <div className={`w-3 h-3 rounded-full ${device.connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            {device.connected ? (
                                                <div className="space-x-2">
                                                    <button
                                                        onClick={() => handleConnectToDevice(device)}
                                                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                                    >
                                                        Select
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisconnectDevice(device)}
                                                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnectToDevice(device)}
                                                    disabled={connectingDevice === device.id}
                                                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
                                                >
                                                    {connectingDevice === device.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        'Connect'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 