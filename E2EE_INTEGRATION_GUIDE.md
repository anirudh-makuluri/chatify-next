# Chatify E2EE Multi-Device Integration Guide

## Overview

This implementation provides a complete End-to-End Encryption (E2EE) system with multi-device support using libsodium (sodium.js). Each device has its own identity keypair and per-group keypairs.

## Files Created

### Core Modules
- **`lib/e2ee-types.ts`** - Type definitions for all E2EE operations
- **`lib/crypto.ts`** - Cryptographic operations (encryption, key generation, decryption)
- **`lib/device-manager.ts`** - Device key storage and management
- **`lib/e2ee-api.ts`** - API endpoint handlers
- **`lib/e2ee-service.ts`** - High-level E2EE service
- **`lib/hooks/useE2EE.ts`** - React hooks for E2EE operations
- **`redux/e2eeSlice.ts`** - Redux state management for E2EE
- **`redux/store.ts`** - Updated with E2EE reducer

## Installation

### 1. Install Dependencies
```bash
npm install libsodium.js
```

### 2. Update Environment Variables (if needed)
Add to your `.env.local`:
```
NEXT_PUBLIC_ENCRYPTION_ENABLED=true
```

## Integration Steps

### Step 1: Initialize E2EE in Your Root Component

In `app/layout.tsx` or `app/providers.tsx`:

```typescript
'use client';

import { useE2EEInitialization } from '@/lib/hooks/useE2EE';

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize E2EE on app startup
  const e2eeInitialized = useE2EEInitialization();

  return (
    <ReduxProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ReduxProvider>
  );
}
```

### Step 2: Register Device Keys After Login

In your login/auth component:

```typescript
'use client';

import { useRegisterDeviceIdentityKey, useRegisterDeviceGroupKey } from '@/lib/hooks/useE2EE';

export function LoginComponent() {
  const { register: registerIdentity, loading: identityLoading } = useRegisterDeviceIdentityKey();
  const { register: registerGroupKey, loading: groupLoading } = useRegisterDeviceGroupKey();

  const handleLoginSuccess = async (userId: string, userGroupIds: string[]) => {
    try {
      // 1. Register identity key
      await registerIdentity(userId);
      
      // 2. Register group keys
      for (const groupId of userGroupIds) {
        await registerGroupKey(groupId, userId);
      }

      // Navigation to home
      router.push('/home');
    } catch (error) {
      console.error('Key registration failed:', error);
      toast.error('Failed to setup encryption');
    }
  };

  return (
    // Your login form
  );
}
```

### Step 3: Send Encrypted Messages in Chat

In your message sending component:

```typescript
'use client';

import { useFetchGroupMemberPublicKeys, useEncryptGroupMessage, useSendEncryptedGroupMessage } from '@/lib/hooks/useE2EE';

export function ChatInput({ groupId, userId }: { groupId: string; userId: string }) {
  const { memberPublicKeys, fetch: fetchKeys } = useFetchGroupMemberPublicKeys(groupId);
  const { encrypt, loading: encryptLoading } = useEncryptGroupMessage(groupId);
  const { send, loading: sendLoading } = useSendEncryptedGroupMessage(groupId);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch keys once
    fetchKeys();
  }, [groupId, fetchKeys]);

  const handleSendMessage = async () => {
    try {
      // 1. Encrypt message
      const encrypted = encrypt(message);
      if (!encrypted) {
        throw new Error('Encryption failed');
      }

      // 2. Send encrypted message
      const response = await send(message, encrypted, userId);
      
      // Clear input
      setMessage('');
      
      // Show success toast
      toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type encrypted message..."
      />
      <button
        onClick={handleSendMessage}
        disabled={encryptLoading || sendLoading || !message}
      >
        {sendLoading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

### Step 4: Decrypt Received Messages

In your message display component:

```typescript
'use client';

import { useDecryptMessage } from '@/lib/hooks/useE2EE';

export function ChatMessage({ 
  message, 
  senderPublicKey,
  groupId 
}: { 
  message: { ciphertext: string; iv: string }; 
  senderPublicKey: string;
  groupId: string;
}) {
  const { decrypt, error } = useDecryptMessage();
  const [decryptedText, setDecryptedText] = useState('');

  useEffect(() => {
    try {
      const decrypted = decrypt(
        message.ciphertext,
        message.iv,
        senderPublicKey,
        groupId
      );
      setDecryptedText(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
    }
  }, [message, senderPublicKey, groupId, decrypt]);

  if (!decryptedText) {
    return <div>Loading...</div>;
  }

  return <div>{decryptedText}</div>;
}
```

### Step 5: Using the E2EE Service Directly

For more control, you can use the E2EE service directly:

```typescript
import { getE2EEService } from '@/lib/e2ee-service';

async function sendMessage(message: string, groupId: string, userId: string) {
  const e2eeService = getE2EEService();

  try {
    // Initialize if needed
    await e2eeService.initialize();

    // Get member public keys
    const memberPublicKeys = await e2eeService.getMemberPublicKeys(groupId);

    // Send encrypted message
    const messageId = await e2eeService.sendEncryptedMessage(
      groupId,
      userId,
      message,
      memberPublicKeys
    );

    console.log('Message sent with ID:', messageId);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
```

## Device ID Format

Device IDs are automatically generated in the format:
```
web:chrome:abcd1234567890
device_type:browser:random_hash
```

For mobile, adapt the format:
- Web: `web:chrome:abcd1234`
- iOS: `ios:iphone15:abcd1234`
- Android: `android:pixel7:abcd1234`

## Key Management

### Local Storage Structure

Device information is stored in `localStorage` under key: `e2ee_device_state`

```typescript
interface E2EEDeviceState {
  initialized: boolean;
  deviceId: string;
  deviceName: string;
  identityKeyPair: {
    deviceId: string;
    publicKey: string; // base64
    privateKey: string; // base64 - never share!
  };
  groupKeyPairs: {
    [groupId: string]: {
      groupId: string;
      publicKey: string; // base64
      privateKey: string; // base64 - never share!
    };
  };
}
```

### Key Rotation

When rotating keys:

```typescript
import { useRotateIdentityKeys } from '@/lib/hooks/useE2EE';

export function SettingsComponent({ userId }: { userId: string }) {
  const { rotate, loading } = useRotateIdentityKeys();

  const handleRotateKeys = async () => {
    try {
      await rotate(userId);
      toast.success('Keys rotated successfully');
    } catch (error) {
      toast.error('Failed to rotate keys');
    }
  };

  return (
    <button onClick={handleRotateKeys} disabled={loading}>
      {loading ? 'Rotating...' : 'Rotate Keys'}
    </button>
  );
}
```

## Encryption/Decryption Flow

### Send Flow
1. Get member public keys from server
2. For each recipient device, encrypt message using their public key
3. Send encrypted message with mapping: userId -> deviceId -> {ciphertext, iv}
4. Server stores encrypted message

### Receive Flow
1. Fetch encrypted message from server
2. For your device ID, extract the encrypted data
3. Use your private key to decrypt
4. Display decrypted message

## Best Practices

### 1. Always Initialize E2EE
```typescript
await crypto.initiateSodium();
```

### 2. Store Device ID Persistently
The device manager automatically stores device ID in localStorage. It's reused across sessions.

### 3. Register Keys for New Groups
When a user joins a new group, register the group key:
```typescript
const { register } = useRegisterDeviceGroupKey();
await register(newGroupId, userId);
```

### 4. Fetch Member Keys Periodically
When new members join, member public keys change. Refetch before encrypting:
```typescript
const { memberPublicKeys, fetch } = useFetchGroupMemberPublicKeys(groupId);
await fetch(); // Refresh before sending
```

### 5. Handle Encryption Errors
Always wrap encryption/decryption in try-catch:
```typescript
try {
  const encrypted = encrypt(message);
} catch (error) {
  console.error('Encryption failed:', error);
  // Show user-friendly error
}
```

### 6. Clear Data on Logout
```typescript
import { useClearE2EEData } from '@/lib/hooks/useE2EE';

export function LogoutButton() {
  const { clear } = useClearE2EEData();

  const handleLogout = async () => {
    clear(); // Clear E2EE data
    // Then redirect to login
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## Redux Integration

Access E2EE state anywhere:

```typescript
import { useAppSelector } from '@/redux/store';
import { selectDeviceState, selectE2EEError } from '@/redux/e2eeSlice';

export function DeviceInfo() {
  const deviceState = useAppSelector(selectDeviceState);
  const error = useAppSelector(selectE2EEError);

  return (
    <div>
      <p>Device ID: {deviceState?.deviceId}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

## Multi-Device Scenarios

### Scenario 1: User with Multiple Devices
- Each device generates its own identity keypair
- User registers each device with backend
- Messages encrypted separately for each device
- Each device decrypts only its own encrypted copy

### Scenario 2: Adding New Device
1. New device generates identity keypair
2. User registers device: `POST /auth/setup-keys`
3. For each group, derive group keypair
4. Register group keys: `POST /groups/{groupId}/members/add-key`
5. Existing devices fetch updated member public keys

### Scenario 3: Device Removal
- User can remove specific device keys: `DELETE /groups/{groupId}/members/{userId}/key?deviceId={deviceId}`
- Old device can no longer decrypt new messages

## Error Handling

```typescript
const { encrypt, error: encryptError } = useEncryptGroupMessage(groupId);

if (encryptError) {
  return <div className="error">Encryption failed: {encryptError}</div>;
}
```

## Performance Tips

1. **Cache Member Public Keys** - Reuse fetched keys, refetch only when needed
2. **Batch Encryption** - Use `encryptMessageForMultipleRecipients` for efficiency
3. **Lazy Load Keys** - Fetch group keys on group enter, not at app startup
4. **Async Encryption** - Encrypt in background to avoid UI blocking

## Security Considerations

1. **Private Keys** - NEVER send private keys to server
2. **Key Storage** - Uses browser localStorage (review security implications)
3. **Nonce Uniqueness** - Each message uses a unique nonce (handled by crypto module)
4. **Public Key Verification** - Consider implementing key fingerprint verification
5. **Perfect Forward Secrecy** - Current implementation: basic PFS via per-message nonces

## Troubleshooting

### "Sodium not initialized"
```typescript
// Make sure to call this before any crypto operations
await crypto.initiateSodium();
```

### "Device not initialized"
```typescript
// Initialize on app startup
const e2eeInitialized = useE2EEInitialization();
```

### "Member public keys not available"
```typescript
// Fetch keys first
const { fetch } = useFetchGroupMemberPublicKeys(groupId);
await fetch();
```

### Decryption fails
- Ensure you're using the correct group ID (if it's a group message)
- Verify the sender's public key is correct
- Check that message is encrypted for your device ID

## Testing

```typescript
// Test encryption/decryption
import { generateBoxKeypair, encryptMessageForRecipient, decryptMessage } from '@/lib/crypto';

async function testE2EE() {
  const keypair1 = generateBoxKeypair();
  const keypair2 = generateBoxKeypair();

  const message = 'Hello, World!';
  const encrypted = encryptMessageForRecipient(message, keypair2.publicKey);

  const decrypted = decryptMessage(
    encrypted.ciphertext,
    encrypted.iv,
    keypair1.publicKey,
    keypair2.privateKey
  );

  console.assert(decrypted === message, 'Encryption/Decryption failed');
}
```

## API Summary

### Authentication
- `registerDeviceIdentityKey(request)` - Register device identity key

### Group Keys
- `registerDeviceGroupKey(groupId, request)` - Register device group key
- `getGroupPublicKeys(groupId)` - Get all member public keys for group
- `removeDeviceGroupKey(groupId, userId, deviceId)` - Remove device from group

### Identity Keys
- `getIdentityKeyForDevice(userId, deviceId)` - Get single device identity key
- `getIdentityKeysForAllDevices(userId)` - Get all device identity keys

### Key Management
- `rotateDeviceKeys(userId, request)` - Rotate all keys for device

### Messaging
- `storeEncryptedGroupMessage(groupId, request)` - Send encrypted message

## Support & Debugging

Enable debug logging:
```typescript
localStorage.setItem('E2EE_DEBUG', 'true');
```

Check device state:
```typescript
import { getDeviceInfo } from '@/lib/device-manager';
console.log(getDeviceInfo());
```

## Next Steps

1. ✅ Setup device initialization in root layout
2. ✅ Add key registration in auth flow  
3. ✅ Implement encrypted message sending in chat
4. ✅ Add message decryption in chat display
5. ✅ Test multi-device scenarios
6. ✅ Add key rotation UI
7. ✅ Monitor and debug encryption operations

---

## Version Info
- **libsodium.js**: ^0.7.11
- **Encryption Algorithm**: crypto_box (Curve25519/Salsa20/Poly1305)
- **Hash Algorithm**: BLAKE2b
- **Key Derivation**: Argon2

