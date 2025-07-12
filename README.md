# KickChat - Bluetooth Chat Application

A peer-to-peer chat application that uses Bluetooth for offline communication between devices.

## Features

- **Bluetooth-only Communication**: No internet required
- **Device Discovery**: Scan for nearby KickChat-enabled devices
- **Real-time Messaging**: Send and receive messages instantly
- **User Profiles**: Set up your display name and avatar
- **Message History**: Messages are stored locally on your device
- **Connection Management**: Automatic reconnection when devices come back in range

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
1. Both devices need to have KickChat open in a supported browser
2. Click "Connect Device" or the Bluetooth icon in the header
3. Click "Scan for Devices" to find nearby devices
4. Select a device from the list and click "Connect"
5. The other device will need to accept the connection

### Sending Messages
1. Once connected, you can type messages in the input field
2. Press Enter or click the send button to send messages
3. Messages will appear in real-time on both devices

### Important Notes
- **Range**: Bluetooth typically works within 10-30 meters
- **Privacy**: All messages are stored locally on your device only
- **Offline**: No internet connection required once the app is loaded
- **Power**: Bluetooth scanning can drain battery faster

## Technical Details

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Bluetooth**: Web Bluetooth API with custom GATT services
- **Storage**: Local storage for messages and user profiles

## Troubleshooting

### "Bluetooth not supported" Error
- Make sure you're using a supported browser (Chrome, Edge, Opera)
- Check that Bluetooth is enabled on your device
- Try accessing the app over HTTPS (required for Web Bluetooth)

### Can't Find Devices
- Ensure both devices have KickChat open
- Make sure Bluetooth is enabled on both devices
- Try moving devices closer together
- Check that the other device is not connected to another chat

### Connection Issues
- Refresh the page and try again
- Clear your browser cache
- Make sure both devices are running the same version of KickChat

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
