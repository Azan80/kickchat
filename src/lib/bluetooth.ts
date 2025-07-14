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
      // Request device with more specific filters to avoid unsupported devices
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          // Look for devices with standard services
          { services: [this.GENERIC_ACCESS_SERVICE] },
          { services: [this.GENERIC_ATTRIBUTE_SERVICE] },
          { services: [this.KICKCHAT_SERVICE_UUID] },
          // Common device types
          { services: ['battery_service'] },
          { services: ['device_information'] },
        ],
        optionalServices: [
          this.GENERIC_ACCESS_SERVICE,
          this.GENERIC_ATTRIBUTE_SERVICE,
          this.KICKCHAT_SERVICE_UUID,
          'battery_service',
          'device_information'
        ]
      });

      // Check if this device already exists
      const existingDevice = this.devices.get(device.id);
      if (existingDevice) {
        return this.updateExistingDevice(existingDevice, device);
      }

      // Generate device name
      const deviceName = await this.generateDeviceName(device);

      const chatDevice: ChatDevice = {
        id: device.id,
        name: deviceName,
        connected: false,
        lastSeen: new Date(),
        device: device,
        isKickChatDevice: false // Will be determined during connection
      };

      this.devices.set(device.id, chatDevice);
      
      // Notify listeners about the new device
      this.deviceFoundCallbacks.forEach(cb => cb(chatDevice));
      
      return chatDevice;
    } catch (error: any) {
      console.error('Error requesting device:', error);
      
      // If the filtered approach fails, try the fallback approach
      if (error.message?.includes('no services found')) {
        console.log('Retrying with acceptAllDevices approach...');
        return this.requestDeviceFallback();
      }
      
      return null;
    } finally {
      this.isScanning = false;
    }
  }

  private async requestDeviceFallback(): Promise<ChatDevice | null> {
    try {
      // Fallback approach for broader device discovery
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          this.GENERIC_ACCESS_SERVICE,
          this.GENERIC_ATTRIBUTE_SERVICE,
          this.KICKCHAT_SERVICE_UUID
        ]
      });

      // Check if this device already exists
      const existingDevice = this.devices.get(device.id);
      if (existingDevice) {
        return this.updateExistingDevice(existingDevice, device);
      }

      // Generate device name
      const deviceName = await this.generateDeviceName(device);

      const chatDevice: ChatDevice = {
        id: device.id,
        name: deviceName,
        connected: false,
        lastSeen: new Date(),
        device: device,
        isKickChatDevice: false
      };

      this.devices.set(device.id, chatDevice);
      this.deviceFoundCallbacks.forEach(cb => cb(chatDevice));
      
      return chatDevice;
    } catch (error) {
      console.error('Fallback device request also failed:', error);
      return null;
    }
  }

  private updateExistingDevice(existingDevice: ChatDevice, newDevice: any): ChatDevice {
    existingDevice.device = newDevice;
    existingDevice.lastSeen = new Date();
    
    // Notify listeners about the updated device
    this.deviceFoundCallbacks.forEach(cb => cb(existingDevice));
    
    return existingDevice;
  }

  private async generateDeviceName(device: any): Promise<string> {
    // Try to get the device name first
    if (device.name && device.name.trim()) {
      console.log('Using device name:', device.name.trim());
      return device.name.trim();
    }

    // Try to get device name from GATT services
    try {
      if (device.gatt) {
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(this.GENERIC_ACCESS_SERVICE);
        const characteristic = await service.getCharacteristic(this.DEVICE_NAME_CHARACTERISTIC);
        const value = await characteristic.readValue();
        const name = new TextDecoder().decode(value);
        if (name && name.trim()) {
          return name.trim();
        }
      }
    } catch (error) {
      // Device might not support Generic Access service
      console.log('Could not get device name from GATT:', error);
    }

    // Generate fallback name
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
    
    const finalName = `${fallbackName} (${timestamp})`;
    console.log('Generated fallback name:', finalName, 'for device:', device.id);
    return finalName;
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const chatDevice = this.devices.get(deviceId);
    if (!chatDevice || !chatDevice.device) {
      console.error('Device not found:', deviceId);
      return false;
    }

    try {
      console.log('Attempting to connect to device:', chatDevice.name);
      
      // Check if device supports GATT
      if (!chatDevice.device.gatt) {
        console.error('Device does not support GATT');
        throw new Error('Device does not support GATT connections');
      }

      // Check if device is already connected
      if (chatDevice.device.gatt.connected) {
        console.log('Device already connected, using existing connection');
        chatDevice.connected = true;
        this.connectionCallbacks.forEach(cb => cb(chatDevice));
        return true;
      }

      console.log('Connecting to GATT server...');
      const server = await chatDevice.device.gatt.connect();
      if (!server) {
        console.error('Failed to connect to GATT server');
        return false;
      }

      console.log('GATT server connected successfully');

      // Try to get a better device name after connection
      try {
        const betterName = await this.getConnectedDeviceName(chatDevice.device);
        if (betterName && betterName !== chatDevice.name) {
          console.log(`Updating device name from "${chatDevice.name}" to "${betterName}"`);
          chatDevice.name = betterName;
        }
      } catch (nameError) {
        console.log('Could not get better device name:', nameError);
      }

      // Check if this is a KickChat device by looking for our custom service
      let isKickChatDevice = false;
      try {
        console.log('Checking for KickChat service...');
        const kickChatService = await server.getPrimaryService(this.KICKCHAT_SERVICE_UUID);
        const kickChatCharacteristic = await kickChatService.getCharacteristic(this.KICKCHAT_CHARACTERISTIC_UUID);
        
        // Set up notifications for incoming messages
        await kickChatCharacteristic.startNotifications();
        kickChatCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          if (value) {
            const message = this.decodeMessage(value);
            if (message) {
              this.handleIncomingMessage(message);
            }
          }
        });

        chatDevice.service = kickChatService;
        chatDevice.characteristic = kickChatCharacteristic;
        isKickChatDevice = true;
        console.log('Connected to KickChat device with custom service');
      } catch (serviceError) {
        console.log('Device does not have KickChat service, checking for standard services...');
        
        // Try to find any available services for basic compatibility
        try {
          const services = await server.getPrimaryServices();
          console.log('Available services:', services.map((s: any) => s.uuid));
          
          if (services.length > 0) {
            // Try to use the first available service for basic connectivity
            chatDevice.service = services[0];
            console.log('Using service:', services[0].uuid, 'for basic connectivity');
          }
          
          isKickChatDevice = false;
        } catch (servicesError) {
          console.log('Could not enumerate services:', servicesError);
          isKickChatDevice = false;
        }
      }

      chatDevice.server = server;
      chatDevice.connected = true;
      chatDevice.lastSeen = new Date();
      chatDevice.isKickChatDevice = isKickChatDevice;

      // Handle disconnection
      chatDevice.device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected:', chatDevice.name);
        chatDevice.connected = false;
        this.disconnectionCallbacks.forEach(cb => cb(deviceId));
      });

      this.connectionCallbacks.forEach(cb => cb(chatDevice));
      console.log('Successfully connected to device:', chatDevice.name, 'KickChat:', isKickChatDevice);
      return true;
    } catch (error: any) {
      console.error('Error connecting to device:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Unsupported device')) {
        console.error('This device type is not supported for Bluetooth connections');
        throw new Error('Device not supported: This device cannot establish Bluetooth connections');
      } else if (error.message?.includes('GATT operation failed')) {
        console.error('GATT operation failed - device may be busy or out of range');
        throw new Error('Connection failed: Device may be busy or out of range');
      } else if (error.message?.includes('Connection failed')) {
        console.error('Connection failed - device may be unavailable');
        throw new Error('Connection failed: Device unavailable or already connected to another app');
      } else if (error.message?.includes('Permission denied')) {
        console.error('Permission denied - user may have rejected the connection');
        throw new Error('Permission denied: Please allow Bluetooth access');
      }
      
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