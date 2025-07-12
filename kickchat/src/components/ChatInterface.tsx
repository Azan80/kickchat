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
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <Bluetooth size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No messages yet</p>
                        <p className="text-sm">Connect to a device to start chatting</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.sender === currentUser?.id;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-800 border'
                                        }`}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
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
            </div>
        </div>
    );
} 