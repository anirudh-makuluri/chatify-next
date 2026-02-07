# E2EE Implementation Summary

## Quick Start

### 1. Install Dependencies
```bash
npm install libsodium
```

### 2. Initialize in Root Component
```typescript
// app/providers.tsx or app/layout.tsx
import { useE2EEInitialization } from '@/lib/hooks/useE2EE';

export function Providers({ children }: { children: React.ReactNode }) {
  const e2eeReady = useE2EEInitialization();
  return <>{children}</>;
}
```

### 3. Register Keys After Login
```typescript
import { useRegisterDeviceIdentityKey, useRegisterDeviceGroupKey } from '@/lib/hooks/useE2EE';

const { register: registerIdentity } = useRegisterDeviceIdentityKey();
const { register: registerGroupKey } = useRegisterDeviceGroupKey();

// After login
await registerIdentity(userId);
for (const groupId of userGroups) {
  await registerGroupKey(groupId, userId);
}
```

### 4. Send Encrypted Messages
```typescript
import { useFetchGroupMemberPublicKeys, useEncryptGroupMessage, useSendEncryptedGroupMessage } from '@/lib/hooks/useE2EE';

const { memberPublicKeys, fetch } = useFetchGroupMemberPublicKeys(groupId);
const { encrypt } = useEncryptGroupMessage(groupId);
const { send } = useSendEncryptedGroupMessage(groupId);

// Fetch keys once
useEffect(() => { fetch(); }, [groupId, fetch]);

// Send message
const encrypted = encrypt(message);
await send(message, encrypted, userId);
```

### 5. Decrypt Received Messages
```typescript
import { useDecryptMessage } from '@/lib/hooks/useE2EE';

const { decrypt } = useDecryptMessage();

useEffect(() => {
  const text = decrypt(
    message.ciphertext,
    message.iv,
    senderPublicKey,
    groupId
  );
  setContent(text);
}, [message, decrypt]);
```

## File Structure

```
lib/
├── e2ee-types.ts          # Type definitions
├── crypto.ts              # Encryption/decryption operations
├── device-manager.ts      # Device key storage & management
├── e2ee-api.ts           # API endpoint handlers
├── e2ee-service.ts       # High-level E2EE service
└── hooks/
    └── useE2EE.ts        # React hooks

redux/
├── e2eeSlice.ts          # Redux state management
└── store.ts              # Updated store config

components/
└── examples/
    └── EncryptedChatRoom.tsx  # Example implementation

E2EE_INTEGRATION_GUIDE.md        # Detailed integration guide
E2EE_IMPLEMENTATION_CHECKLIST.md # Implementation checklist
E2EE_QUICK_REFERENCE.md          # Quick reference (this file)
```

## Core Concepts

### Device ID
- Format: `deviceType:browser:randomHash`
- Example: `web:chrome:abcd1234567890ab`
- Storage: Browser localStorage
- Persistence: Reused across sessions

### Identity Key
- Generated per device
- Never shared (public key only)
- Used to encrypt messages for that device
- Rotatable for security

### Group Key
- Generated per device per group
- Separate keypair for each group
- Public key shared with group members
- Allows group-specific encryption

### Encryption Flow
```
Message
  ↓
Get member public keys
  ↓
Encrypt per recipient device
  ↓
Send encrypted bundle to server
  ↓
Server stores encrypted message
```

### Decryption Flow
```
Receive encrypted message
  ↓
Extract your device's ciphertext
  ↓
Use your private key to decrypt
  ↓
Display plaintext
```

## API Endpoints Used

```
POST /auth/setup-keys                                  # Register identity key
POST /groups/{groupId}/members/add-key                # Register group key
GET  /groups/{groupId}/members/public-keys            # Get member keys
GET  /users/{userId}/identity-key                     # Get identity keys
GET  /users/{userId}/identity-key?deviceId={deviceId} # Get single device key
POST /users/{userId}/rotate-keys                      # Rotate keys
DELETE /groups/{groupId}/members/{userId}/key         # Remove user keys
DELETE /groups/{groupId}/members/{userId}/key?deviceId={deviceId} # Remove device key
POST /groups/{groupId}/messages                       # Send encrypted message
```

## Key Data Structures

### Device State (localStorage)
```json
{
  "initialized": true,
  "deviceId": "web:chrome:abcd1234",
  "deviceName": "My Chrome Browser",
  "identityKeyPair": {
    "deviceId": "web:chrome:abcd1234",
    "publicKey": "base64_string",
    "privateKey": "base64_string",
    "deviceName": "My Chrome Browser"
  },
  "groupKeyPairs": {
    "groupId1": {
      "groupId": "groupId1",
      "publicKey": "base64_string",
      "privateKey": "base64_string"
    }
  }
}
```

### Room with E2EE
```json
{
  "id": "group_123",
  "members": ["userId1", "userId2"],
  "memberPublicKeys": {
    "userId1": {
      "deviceId1": "base64_public_key",
      "deviceId2": "base64_public_key"
    },
    "userId2": {
      "deviceId3": "base64_public_key"
    }
  }
}
```

### Encrypted Message
```json
{
  "senderId": "userId1",
  "recipients": {
    "userId1": {
      "deviceId1": {
        "ciphertext": "base64_encrypted_data",
        "iv": "base64_nonce"
      },
      "deviceId2": {
        "ciphertext": "base64_encrypted_data",
        "iv": "base64_nonce"
      }
    },
    "userId2": {
      "deviceId3": {
        "ciphertext": "base64_encrypted_data",
        "iv": "base64_nonce"
      }
    }
  },
  "senderKeys": {
    "chainKey": "base64_optional",
    "signatureKey": "base64_optional"
  }
}
```

## Hook Reference

### Initialization
```typescript
// Initialize E2EE (call once in root)
const initialized = useE2EEInitialization();
```

### State Access
```typescript
// Get device state
const deviceState = useDeviceState();
const deviceId = useDeviceId();
const publicKey = useIdentityPublicKey();
const error = useE2EEError();
```

### Key Registration
```typescript
// Register identity key
const { register, loading, error } = useRegisterDeviceIdentityKey();
await register(userId);

// Register group key
const { register, loading, error } = useRegisterDeviceGroupKey();
await register(groupId, userId);
```

### Encryption/Decryption
```typescript
// Fetch member keys
const { memberPublicKeys, fetch } = useFetchGroupMemberPublicKeys(groupId);

// Encrypt message
const { encrypt, loading, error } = useEncryptGroupMessage(groupId);
const encrypted = encrypt(message);

// Decrypt message
const { decrypt, loading, error } = useDecryptMessage();
const plaintext = decrypt(ciphertext, iv, senderPublicKey, groupId);

// Send encrypted
const { send, loading, error } = useSendEncryptedGroupMessage(groupId);
await send(message, encrypted, userId);
```

### Key Management
```typescript
// Rotate keys
const { rotate, loading, error } = useRotateIdentityKeys();
await rotate(userId);

// Clear data
const { clear } = useClearE2EEData();
clear(); // On logout
```

## Service Reference

```typescript
import { getE2EEService } from '@/lib/e2ee-service';

const svc = getE2EEService();

// Initialization
await svc.initialize();

// Setup
await svc.setupDeviceKeys(userId, groupIds);

// Encrypt for group
const encrypted = await svc.encryptMessageForGroup(
  groupId,
  message,
  memberPublicKeys
);

// Decrypt message
const plaintext = await svc.decryptGroupMessage(
  ciphertext,
  iv,
  senderPublicKey,
  groupId
);

// Send encrypted
const messageId = await svc.sendEncryptedMessage(
  groupId,
  userId,
  message,
  recipientPublicKeys
);

// Rotate keys
await svc.rotateIdentityKeys(userId);

// Get member keys
const keys = await svc.getMemberPublicKeys(groupId);

// Remove from group
await svc.removeFromGroup(groupId, userId);

// Device info
const info = svc.getDeviceInfo();

// Public keys
const pubKeys = svc.getPublicKeys();

// Clear data
svc.clearAllData();
```

## Redux Integration

```typescript
import { useAppSelector } from '@/redux/store';
import {
  selectDeviceState,
  selectDeviceId,
  selectIdentityPublicKey,
  selectGroupMemberPublicKeys,
  selectE2EEError,
  selectIsInitializing,
} from '@/redux/e2eeSlice';

// In components
const deviceState = useAppSelector(selectDeviceState);
const deviceId = useAppSelector(selectDeviceId);
const memberKeys = useAppSelector(selectGroupMemberPublicKeys(groupId));
const error = useAppSelector(selectE2EEError);
```

## Common Patterns

### Pattern 1: Initialize & Register Keys
```typescript
useEffect(() => {
  const setup = async () => {
    try {
      const { register: regIdentity } = useRegisterDeviceIdentityKey();
      const { register: regGroup } = useRegisterDeviceGroupKey();
      
      await regIdentity(user.id);
      for (const g of user.groups) {
        await regGroup(g.id, user.id);
      }
    } catch (err) {
      console.error('Setup failed:', err);
    }
  };
  
  if (user && !initialized) {
    setup();
  }
}, [user, initialized]);
```

### Pattern 2: Fetch & Cache Keys
```typescript
useEffect(() => {
  const load = async () => {
    const { fetch } = useFetchGroupMemberPublicKeys(groupId);
    await fetch();
  };
  
  load();
}, [groupId]);
```

### Pattern 3: Encrypt & Send
```typescript
const handleSend = async (text: string) => {
  try {
    const { encrypt } = useEncryptGroupMessage(groupId);
    const { send } = useSendEncryptedGroupMessage(groupId);
    
    const encrypted = encrypt(text);
    if (!encrypted) throw new Error('No recipients');
    
    await send(text, encrypted, userId);
    toast.success('Sent securely');
  } catch (err) {
    toast.error('Send failed');
  }
};
```

### Pattern 4: Decrypt on Display
```typescript
useEffect(() => {
  const decryptAndDisplay = async () => {
    try {
      const { decrypt } = useDecryptMessage();
      const text = decrypt(
        message.ciphertext,
        message.iv,
        senderPubKey,
        groupId
      );
      setContent(text);
    } catch (err) {
      setError('Decryption failed');
    }
  };
  
  decryptAndDisplay();
}, [message, senderPubKey, groupId]);
```

## Error Handling

```typescript
// Always wrap crypto operations
try {
  const encrypted = encrypt(message);
  if (!encrypted) throw new Error('No recipients for encryption');
  
  await send(message, encrypted, userId);
} catch (error) {
  // Show user-friendly error, not technical details
  if (error instanceof Error) {
    console.error('Detailed error:', error.message);
    toast.error('Failed to send message securely');
  } else {
    toast.error('An unknown error occurred');
  }
}
```

## Performance Tips

1. **Cache keys** - Don't fetch member keys for every message
2. **Async encryption** - Move to useEffect or background task
3. **Batch operations** - Encrypt multiple messages together if possible
4. **Lazy load** - Fetch group keys only when needed
5. **Monitor state** - Use Redux DevTools to track state changes

## Security Checklist

- ✅ Private keys stored locally only (never sent to server)
- ✅ Public keys verified with sender
- ✅ Unique nonce per encryption operation
- ✅ Proper key derivation for group keys
- ✅ Clear keys on logout
- ✅ No plaintext logging
- ✅ HTTPS for all communications
- ✅ Device ID verification

## Troubleshooting Quick Guide

| Error | Solution |
|-------|----------|
| "Sodium not initialized" | Call `useE2EEInitialization()` in root |
| "Device not initialized" | Check localStorage > e2ee_device_state |
| "Keys not available" | Call `fetch()` before encrypting |
| "Decryption failed" | Verify sender public key & group ID |
| "No recipients" | Check member public keys loaded |
| "Keys not saving" | Check browser storage quota |

## Next Steps

1. Follow [E2EE_INTEGRATION_GUIDE.md](./E2EE_INTEGRATION_GUIDE.md) for detailed steps
2. Use [EncryptedChatRoom.tsx](./components/examples/EncryptedChatRoom.tsx) as reference
3. Follow [E2EE_IMPLEMENTATION_CHECKLIST.md](./E2EE_IMPLEMENTATION_CHECKLIST.md)
4. Test all scenarios before production
5. Monitor encryption performance
6. Collect user feedback

## Support Resources

- **Detailed Guide**: E2EE_INTEGRATION_GUIDE.md
- **Checklist**: E2EE_IMPLEMENTATION_CHECKLIST.md
- **Example**: components/examples/EncryptedChatRoom.tsx
- **Types**: lib/e2ee-types.ts
- **API Reference**: Backend API specification

---

**Implementation Status**: ✅ Complete  
**Version**: 1.0.0  
**Last Updated**: February 6, 2026  
**Encryption Algorithm**: Curve25519/Salsa20/Poly1305 (libsodium crypto_box)
