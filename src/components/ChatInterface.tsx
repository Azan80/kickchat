'use client';

import { Bluetooth, BluetoothConnected, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BluetoothChatService, { BluetoothMessage, ChatDevice } from '../lib/bluetooth';

interface ChatInterfaceProps {
    selectedDevice: ChatDevice | null;
    onDeviceSelect: () => void;
}

export default function ChatInterface({ selectedDevice, onDeviceSelect }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<BluetoothMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const bluetoothService = BluetoothChatService.getInstance();

    useEffect(() => {
        // Load stored messages
        const storedMessages = bluetoothService.getStoredMessages();
        setMessages(storedMessages);

        // Set up message listener
        const handleNewMessage = (message: BluetoothMessage) => {
            setMessages(prev => [...prev, message]);
        };

        // Set up connection listener
        const handleConnection = (device: ChatDevice) => {
            setIsConnected(true);
        };

        const handleDisconnection = (deviceId: string) => {
            if (selectedDevice?.id === deviceId) {
                setIsConnected(false);
            }
        };

        bluetoothService.onMessage(handleNewMessage);
        bluetoothService.onConnection(handleConnection);
        bluetoothService.onDisconnection(handleDisconnection);

        return () => {
            // Cleanup listeners would go here if the service supported removal
        };
    }, []);

    useEffect(() => {
        setIsConnected(selectedDevice?.connected || false);
    }, [selectedDevice]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedDevice || !isConnected) return;

        const success = await bluetoothService.sendMessage(selectedDevice.id, newMessage);
        if (success) {
            setNewMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (timestamp: Date) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const currentUser = bluetoothService.getCurrentUser();

    const getDebugInfo = () => {
        const stats = bluetoothService.getDeviceStats();
        const debugInfo = bluetoothService.getDeviceDebugInfo();
        return { stats, debugInfo };
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onDeviceSelect}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                        >
                            {isConnected ? (
                                <BluetoothConnected size={20} />
                            ) : (
                                <Bluetooth size={20} />
                            )}
                            <span className="font-medium">
                                {selectedDevice ? selectedDevice.name : 'Select Device'}
                            </span>
                        </button>
                        {selectedDevice && (
                            <span className={`text-xs px-2 py-1 rounded ${selectedDevice.isKickChatDevice
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {selectedDevice.isKickChatDevice ? 'KickChat' : 'Standard BLE'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded"
                        >
                            Debug
                        </button>
                    </div>
                </div>
            </div>

            {/* Debug Panel */}
            {showDebug && (
                <div className="bg-gray-100 p-4 border-b">
                    <h3 className="text-sm font-semibold mb-2">Debug Information</h3>
                    <div className="text-xs space-y-1">
                        {(() => {
                            const { stats, debugInfo } = getDebugInfo();
                            return (
                                <>
                                    <p>Total devices: {stats.total}</p>
                                    <p>Connected devices: {stats.connected}</p>
                                    <p>Current user: {currentUser?.name || 'Not set'}</p>
                                    <p>Selected device: {selectedDevice?.name || 'None'}</p>
                                    <p>Device type: {selectedDevice?.isKickChatDevice ? 'KickChat' : 'Standard BLE'}</p>
                                    <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">
                            {isConnected ? 'Start typing to send a message' : 'Connect to a device first'}
                        </p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === currentUser?.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                    }`}
                            >
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${message.sender === currentUser?.id ? 'text-blue-100' : 'text-gray-500'
                                    }`}>
                                    {formatTime(message.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isConnected ? "Type a message..." : "Connect to a device first"}
                        disabled={!isConnected}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || !isConnected}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
                {selectedDevice && !selectedDevice.isKickChatDevice && (
                    <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Connected to a standard BLE device. Messages may not be received by the other device.
                    </p>
                )}
            </div>
        </div>
    );
} 