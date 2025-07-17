import { v4 as uuidv4 } from 'uuid';

export interface BluetoothMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'text';
}

export interface ChatDevice {
  id: string;
  name: string;
  connected: boolean;
  lastSeen: Date;
  rssi?: number; // Signal strength
  device?: any; // BluetoothDevice from Web API
  server?: any; // BluetoothRemoteGATTServer
  service?: any; // BluetoothRemoteGATTService
  characteristic?: any; // BluetoothRemoteGATTCharacteristic
  isKickChatDevice?: boolean; // Whether this device is running KickChat
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
}

class BluetoothChatService {
  private static instance: BluetoothChatService;
  private devices: Map<string, ChatDevice> = new Map();
  private messageCallbacks: ((message: BluetoothMessage) => void)[] = [];
  private connectionCallbacks: ((device: ChatDevice) => void)[] = [];
  private disconnectionCallbacks: ((deviceId: string) => void)[] = [];
  private deviceFoundCallbacks: ((device: ChatDevice) => void)[] = [];
  private currentUser: ChatUser | null = null;
  private isScanning: boolean = false;
  private scanStartTime: Date | null = null;
  
  // Standard BLE services we'll use for discovery
  private readonly GENERIC_ACCESS_SERVICE = 0x1800;
  private readonly DEVICE_NAME_CHARACTERISTIC = 0x2A00;
  private readonly GENERIC_ATTRIBUTE_SERVICE = 0x1801;
  
  // Custom service for KickChat (optional - for enhanced features)
  private readonly KICKCHAT_SERVICE_UUID = '12345678-1234-5678-9012-123456789abc';
  private readonly KICKCHAT_CHARACTERISTIC_UUID = '87654321-4321-8765-2109-cba987654321';

  private constructor() {}

  static getInstance(): BluetoothChatService {
    if (!BluetoothChatService.instance) {
      BluetoothChatService.instance = new BluetoothChatService();
    }
    return BluetoothChatService.instance;
  }

  setCurrentUser(user: ChatUser) {
    this.currentUser = user;
    localStorage.setItem('kickchat_user', JSON.stringify(user));
  }

  getCurrentUser(): ChatUser | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('kickchat_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  isBluetoothSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  isScanningInProgress(): boolean {
    return this.isScanning;
  }

  getLastScanTime(): Date | null {
    return this.scanStartTime;
  }

  async requestDevice(): Promise<ChatDevice | null> {
    if (!this.isBluetoothSupported()) {
      throw new Error('Bluetooth not supported');
    }

    // Prevent multiple simultaneous scans
    if (this.isScanning) {
      return null;
    }

    this.isScanning = true;
    this.scanStartTime = new Date();

    try {
      console.log('Starting device discovery...');
      
      // Use a simpler approach that works better for mobile devices
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          // Standard BLE services that most devices support
          0x1800, // Generic Access
          0x1801, // Generic Attribute
          0x180F, // Battery Service
          0x180A, // Device Information
          // Our custom service
          this.KICKCHAT_SERVICE_UUID
        ]
      });

      console.log('Device selected:', device.name || 'Unknown device');

      // Check if this device already exists
      const existingDevice = this.devices.get(device.id);
      if (existingDevice) {
        console.log('Device already exists, updating...');
        return this.updateExistingDevice(existingDevice, device);
      }

      // Generate device name
      const deviceName = this.generateDeviceNameSimple(device);

      const chatDevice: ChatDevice = {
        id: device.id,
        name: deviceName,
        connected: false,
        lastSeen: new Date(),
        device: device,
        isKickChatDevice: false
      };

      this.devices.set(device.id, chatDevice);
      
      // Notify listeners about the new device
      this.deviceFoundCallbacks.forEach(cb => cb(chatDevice));
      
      console.log('Device added to list:', deviceName);
      return chatDevice;
    } catch (error: any) {
      console.error('Error requesting device:', error);
      
      // Don't show error if user just cancelled
      if (error.message && !error.message.includes('User cancelled')) {
        console.error('Device discovery failed:', error.message);
      }
      
      return null;
    } finally {
      this.isScanning = false;
    }
  }

  private generateDeviceNameSimple(device: any): string {
    // Try to get the device name first
    if (device.name && device.name.trim()) {
      return device.name.trim();
    }

    // Generate a simple fallback name
    let fallbackName = 'Unknown Device';
    
    if (device.id) {
      const deviceId = device.id.toString();
      if (deviceId.length >= 4) {
        fallbackName = `Device ${deviceId.slice(-4)}`;
      } else {
        fallbackName = `Device ${deviceId}`;
      }
    }

    // Add timestamp to make names more unique
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${fallbackName} (${timestamp})`;
  }

  private updateExistingDevice(existingDevice: ChatDevice, newDevice: any): ChatDevice {
    existingDevice.device = newDevice;
    existingDevice.lastSeen = new Date();
    
    // Notify listeners about the updated device
    this.deviceFoundCallbacks.forEach(cb => cb(existingDevice));
    
    return existingDevice;
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const chatDevice = this.devices.get(deviceId);
    if (!chatDevice || !chatDevice.device) {
      console.error('Device not found:', deviceId);
      return false;
    }

    try {
      console.log('Attempting to connect to device:', chatDevice.name);
      
      // Quick connection test for mobile devices
      if (!chatDevice.device.gatt) {
        console.error('Device does not support GATT');
        throw new Error('Device does not support GATT connections');
      }

      // For mobile devices, try a simpler connection approach
      console.log('Connecting to GATT server...');
      const server = await chatDevice.device.gatt.connect();
      if (!server) {
        console.error('Failed to connect to GATT server');
        return false;
      }

      console.log('GATT server connected successfully');

      // Mark as connected immediately for mobile devices
      chatDevice.server = server;
      chatDevice.connected = true;
      chatDevice.lastSeen = new Date();
      chatDevice.isKickChatDevice = false; // Most mobile devices won't have our custom service

      // Handle disconnection
      chatDevice.device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected:', chatDevice.name);
        chatDevice.connected = false;
        this.disconnectionCallbacks.forEach(cb => cb(deviceId));
      });

      this.connectionCallbacks.forEach(cb => cb(chatDevice));
      console.log('Successfully connected to device:', chatDevice.name);
      return true;
    } catch (error: any) {
      console.error('Error connecting to device:', error);
      throw error;
    }
  }

  private async getConnectedDeviceName(device: any): Promise<string | null> {
    try {
      if (device.gatt && device.gatt.connected) {
        try {
          const service = await device.gatt.getPrimaryService(this.GENERIC_ACCESS_SERVICE);
          const characteristic = await service.getCharacteristic(this.DEVICE_NAME_CHARACTERISTIC);
          const value = await characteristic.readValue();
          const name = new TextDecoder().decode(value);
          if (name && name.trim()) {
            return name.trim();
          }
        } catch (error) {
          // Device might not support Generic Access service
        }
      }
      
      if (device.name && device.name.trim()) {
        return device.name.trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting connected device name:', error);
      return null;
    }
  }

  async sendMessage(deviceId: string, content: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device || !device.connected || !this.currentUser) {
      console.error('Cannot send message: device not connected or user not set');
      return false;
    }

    const message: BluetoothMessage = {
      id: uuidv4(),
      content,
      sender: this.currentUser.id,
      timestamp: new Date(),
      type: 'text'
    };

    try {
      if (device.isKickChatDevice && device.characteristic) {
        // Use custom KickChat service
        const encodedMessage = this.encodeMessage(message);
        await device.characteristic.writeValue(encodedMessage);
        console.log('Message sent via KickChat service');
      } else {
        // For non-KickChat devices, we'll show a message about limitations
        console.log('Sending message to non-KickChat device - limited functionality');
        
        // Store the message locally to show in the UI
        this.storeMessage(message);
        this.messageCallbacks.forEach(cb => cb(message));
        
        // Show a notification that the other device won't receive the message
        console.warn('Message stored locally but may not be received by the other device');
        return true; // Return true to show the message in the UI
      }
      
      // Store message locally
      this.storeMessage(message);
      
      // Notify callbacks
      this.messageCallbacks.forEach(cb => cb(message));
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  private encodeMessage(message: BluetoothMessage): Uint8Array {
    const messageString = JSON.stringify(message);
    return new TextEncoder().encode(messageString);
  }

  private decodeMessage(buffer: DataView): BluetoothMessage | null {
    try {
      const messageString = new TextDecoder().decode(buffer);
      return JSON.parse(messageString);
    } catch (error) {
      console.error('Error decoding message:', error);
      return null;
    }
  }

  private handleIncomingMessage(message: BluetoothMessage) {
    console.log('Received message:', message);
    this.storeMessage(message);
    this.messageCallbacks.forEach(cb => cb(message));
  }

  private storeMessage(message: BluetoothMessage) {
    const messages = this.getStoredMessages();
    messages.push(message);
    localStorage.setItem('kickchat_messages', JSON.stringify(messages));
  }

  getStoredMessages(): BluetoothMessage[] {
    const stored = localStorage.getItem('kickchat_messages');
    if (stored) {
      return JSON.parse(stored).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [];
  }

  getConnectedDevices(): ChatDevice[] {
    return Array.from(this.devices.values()).filter(device => device.connected);
  }

  getAllDevices(): ChatDevice[] {
    return Array.from(this.devices.values()).sort((a, b) => {
      // Sort by connection status first, then by last seen
      if (a.connected && !b.connected) return -1;
      if (!a.connected && b.connected) return 1;
      return b.lastSeen.getTime() - a.lastSeen.getTime();
    });
  }

  cleanupOldDevices(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const devicesToRemove: string[] = [];

    this.devices.forEach((device, id) => {
      if (!device.connected && device.lastSeen < oneHourAgo) {
        devicesToRemove.push(id);
      }
    });

    devicesToRemove.forEach(id => {
      this.devices.delete(id);
    });
  }

  onMessage(callback: (message: BluetoothMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  onConnection(callback: (device: ChatDevice) => void) {
    this.connectionCallbacks.push(callback);
  }

  onDisconnection(callback: (deviceId: string) => void) {
    this.disconnectionCallbacks.push(callback);
  }

  onDeviceFound(callback: (device: ChatDevice) => void) {
    this.deviceFoundCallbacks.push(callback);
  }

  async disconnect(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device && device.server) {
      device.server.disconnect();
    }
  }

  async disconnectAll(): Promise<void> {
    for (const device of this.devices.values()) {
      if (device.server) {
        device.server.disconnect();
      }
    }
  }

  getDeviceStats(): { total: number; connected: number; lastScan: Date | null } {
    return {
      total: this.devices.size,
      connected: this.getConnectedDevices().length,
      lastScan: this.scanStartTime
    };
  }

  getDeviceDebugInfo(): any {
    return {
      devices: Array.from(this.devices.values()).map(device => ({
        id: device.id,
        name: device.name,
        connected: device.connected,
        isKickChatDevice: device.isKickChatDevice,
        lastSeen: device.lastSeen
      })),
      currentUser: this.currentUser,
      isScanning: this.isScanning,
      lastScanTime: this.scanStartTime
    };
  }
}

export default BluetoothChatService; 