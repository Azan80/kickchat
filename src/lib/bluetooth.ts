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
  
  // Custom service UUID for our chat app
  private readonly SERVICE_UUID = '12345678-1234-5678-9012-123456789abc';
  private readonly CHARACTERISTIC_UUID = '87654321-4321-8765-2109-cba987654321';

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
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [this.SERVICE_UUID]
      });

      const chatDevice: ChatDevice = {
        id: device.id,
        name: device.name || `Device ${device.id.slice(-4)}`,
        connected: false,
        lastSeen: new Date(),
        device: device
      };

      this.devices.set(device.id, chatDevice);
      
      // Notify listeners about the new device
      this.deviceFoundCallbacks.forEach(cb => cb(chatDevice));
      
      return chatDevice;
    } catch (error) {
      console.error('Error requesting device:', error);
      return null;
    } finally {
      this.isScanning = false;
    }
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const chatDevice = this.devices.get(deviceId);
    if (!chatDevice || !chatDevice.device) {
      return false;
    }

    try {
      const server = await chatDevice.device.gatt?.connect();
      if (!server) {
        return false;
      }

      const service = await server.getPrimaryService(this.SERVICE_UUID);
      const characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      // Set up notifications for incoming messages
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        if (value) {
          const message = this.decodeMessage(value);
          if (message) {
            this.handleIncomingMessage(message);
          }
        }
      });

      chatDevice.server = server;
      chatDevice.service = service;
      chatDevice.characteristic = characteristic;
      chatDevice.connected = true;
      chatDevice.lastSeen = new Date();

      // Handle disconnection
      chatDevice.device.addEventListener('gattserverdisconnected', () => {
        chatDevice.connected = false;
        this.disconnectionCallbacks.forEach(cb => cb(deviceId));
      });

      this.connectionCallbacks.forEach(cb => cb(chatDevice));
      return true;
    } catch (error) {
      console.error('Error connecting to device:', error);
      return false;
    }
  }

  async sendMessage(deviceId: string, content: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device || !device.connected || !device.characteristic || !this.currentUser) {
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
      const encodedMessage = this.encodeMessage(message);
      await device.characteristic.writeValue(encodedMessage);
      
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

  // Clean up old devices (older than 1 hour)
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

  // Get device stats for debugging
  getDeviceStats(): { total: number; connected: number; lastScan: Date | null } {
    return {
      total: this.devices.size,
      connected: this.getConnectedDevices().length,
      lastScan: this.scanStartTime
    };
  }
}

export default BluetoothChatService; 