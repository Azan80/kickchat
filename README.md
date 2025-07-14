# KickChat - Bluetooth Chat Application

A peer-to-peer chat application that uses Bluetooth for offline communication between devices.

## Features

- **Bluetooth-only Communication**: No internet required
- **Device Discovery**: Scan for nearby Bluetooth-enabled devices
- **Real-time Messaging**: Send and receive messages instantly (between KickChat devices)
- **User Profiles**: Set up your display name and avatar
- **Message History**: Messages are stored locally on your device
- **Connection Management**: Automatic reconnection when devices come back in range
- **Debug Panel**: Built-in debugging tools to troubleshoot connection issues

## Browser Support

KickChat uses the Web Bluetooth API and requires a supported browser:

- **Chrome** (Desktop & Mobile)
- **Edge** (Desktop)
- **Opera** (Desktop & Mobile)
- **Samsung Internet** (Mobile)

**Note**: Web Bluetooth is not supported in Safari or Firefox.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## How to Use

### First Time Setup
1. When you first open KickChat, you'll be prompted to set up your profile
2. Enter your display name and optionally select an avatar
3. Click "Save Profile" to continue

### Connecting to Another Device

#### For Best Results (KickChat to KickChat):
1. Both devices need to have KickChat open in a supported browser
2. Click "Connect Device" or the Bluetooth icon in the header
3. Click "Scan for Devices" to find nearby devices
4. Select a device from the list and click "Connect"
5. The other device will need to accept the connection request
6. Once connected, you'll see "Connected (KickChat)" status

#### For Standard Bluetooth Devices:
1. You can connect to any Bluetooth device, but functionality will be limited
2. Messages will be stored locally but may not be received by the other device
3. You'll see "Connected (Standard)" status for non-KickChat devices

### Sending Messages
1. Once connected, you can type messages in the input field
2. Press Enter or click the send button to send messages
3. Messages will appear in real-time on both devices (for KickChat devices)

### Debug Panel
- Click the "Debug" button in the chat header to see connection information
- This helps troubleshoot connection issues and shows device status

## Troubleshooting

### "Bluetooth not supported" Error
- Make sure you're using a supported browser (Chrome, Edge, Opera)
- Check that Bluetooth is enabled on your device
- Try accessing the app over HTTPS (required for Web Bluetooth)

### Can't Find Devices
- Ensure both devices have Bluetooth enabled
- Make sure devices are within 10-30 meters of each other
- Try moving devices closer together
- Check that the other device is not connected to another application
- Use the "Scan for Devices" button to manually search

### Connection Issues
- Refresh the page and try again
- Clear your browser cache
- Make sure both devices are running the same version of KickChat
- Check the debug panel for connection status
- Try disconnecting and reconnecting

### Limited Functionality with Non-KickChat Devices
- Standard Bluetooth devices can be discovered and connected
- Messages will be stored locally but may not be received
- Look for devices marked as "KickChat Device" for full functionality

## Technical Details

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Bluetooth**: Web Bluetooth API with custom GATT services
- **Storage**: Local storage for messages and user profiles

## Device Types

### KickChat Devices
- Full messaging functionality
- Real-time message exchange
- Automatic reconnection
- Message history synchronization

### Standard BLE Devices
- Can be discovered and connected
- Limited messaging functionality
- Messages stored locally only
- Useful for device discovery testing

## Security & Privacy

- Messages are transmitted directly between devices via Bluetooth
- No data is sent to external servers
- Message history is stored locally on each device
- No user data is collected or tracked

## Development

To contribute to KickChat:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Make your changes and test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
