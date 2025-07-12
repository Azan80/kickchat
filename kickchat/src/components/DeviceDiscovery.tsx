'use client';

import { Bluetooth, Loader2, RefreshCw, WifiOff } from 'lucide-react';
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
    const bluetoothService = BluetoothChatService.getInstance();

    useEffect(() => {
        // Load existing devices
        const existingDevices = bluetoothService.getAllDevices();
        setDevices(existingDevices);

        // Set up connection listener
        const handleConnection = (device: ChatDevice) => {
            setDevices(prev => prev.map(d =>
                d.id === device.id ? { ...d, connected: true } : d
            ));
            setConnectingDevice(null);
        };

        const handleDisconnection = (deviceId: string) => {
            setDevices(prev => prev.map(d =>
                d.id === deviceId ? { ...d, connected: false } : d
            ));
        };

        bluetoothService.onConnection(handleConnection);
        bluetoothService.onDisconnection(handleDisconnection);

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

        try {
            const device = await bluetoothService.requestDevice();
            if (device) {
                setDevices(prev => {
                    const existing = prev.find(d => d.id === device.id);
                    if (existing) {
                        return prev.map(d => d.id === device.id ? device : d);
                    }
                    return [...prev, device];
                });
            }
        } catch (error: any) {
            // Don't show error if user just cancelled the dialog
            if (error.message && !error.message.includes('User cancelled')) {
                console.error('Error scanning for devices:', error);
                setError('Failed to scan for devices. Make sure Bluetooth is enabled.');
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
            const success = await bluetoothService.connectToDevice(device.id);
            if (success) {
                onDeviceSelect(device);
                onClose();
            } else {
                setError(`Failed to connect to ${device.name}`);
            }
        } catch (error) {
            console.error('Error connecting to device:', error);
            setError(`Failed to connect to ${device.name}`);
        } finally {
            setConnectingDevice(null);
        }
    };

    const handleDisconnectDevice = async (device: ChatDevice) => {
        try {
            await bluetoothService.disconnect(device.id);
            setDevices(prev => prev.map(d =>
                d.id === device.id ? { ...d, connected: false } : d
            ));
        } catch (error) {
            console.error('Error disconnecting device:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center">
                            <Bluetooth className="mr-2" size={24} />
                            Nearby Devices
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {!bluetoothService.isBluetoothSupported() ? (
                        <div className="text-center text-red-600">
                            <WifiOff size={48} className="mx-auto mb-4" />
                            <p>Bluetooth is not supported on this device</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={handleScanForDevices}
                                            disabled={isScanning}
                                            className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            {isScanning ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={16} />
                                            )}
                                            <span className="text-sm">
                                                {isScanning ? 'Scanning...' : 'Scan Now'}
                                            </span>
                                        </button>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="auto-scan"
                                                checked={autoScan}
                                                onChange={(e) => setAutoScan(e.target.checked)}
                                                className="rounded"
                                            />
                                            <label htmlFor="auto-scan" className="text-sm text-gray-600">
                                                Auto-scan
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                {isScanning && (
                                    <div className="text-sm text-blue-600 flex items-center space-x-1">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Looking for nearby devices...</span>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {devices.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <Bluetooth size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p>No devices found yet</p>
                                        <p className="text-sm">
                                            {autoScan ? 'Automatically scanning for devices...' : 'Click "Scan Now" to find nearby devices'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm text-gray-600 mb-2">
                                            Found {devices.length} device{devices.length !== 1 ? 's' : ''}
                                        </div>
                                        {devices.map((device) => (
                                            <div
                                                key={device.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-blue-100 rounded-full">
                                                        <Bluetooth size={20} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{device.name}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {device.connected ? 'Connected' : 'Available'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-2 h-2 rounded-full ${device.connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 