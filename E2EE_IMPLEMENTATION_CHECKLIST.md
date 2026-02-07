# E2EE Implementation Checklist & Best Practices

## Pre-Implementation Checklist

- [ ] Review E2EE_INTEGRATION_GUIDE.md fully
- [ ] Review this checklist
- [ ] Install dependencies: `npm install libsodium.js`
- [ ] Understand device ID concepts
- [ ] Review API response shapes in guide
- [ ] Test with backend E2EE endpoints ready

## Development Checklist

### Phase 1: Initialization (Required First)
- [ ] Update `app/providers.tsx` or root component with `useE2EEInitialization()`
- [ ] Verify device initialization works
- [ ] Check localStorage for `e2ee_device_state`
- [ ] Test: Device ID generated and persisted
- [ ] Test: Crypto functions available via `sodium`

### Phase 2: Authentication & Key Registration (After Login)
- [ ] Create auth flow wrapper
- [ ] Call `registerIdentity` hook after login success
- [ ] Call `registerGroupKey` for each user's groups
- [ ] Handle registration errors gracefully
- [ ] Show user feedback during key registration
- [ ] Test: Identity key registered on backend
- [ ] Test: Group keys registered on backend
- [ ] Test: Multiple registrations (should be idempotent)

### Phase 3: Group Management
- [ ] Fetch member public keys on group enter
- [ ] Update keys when new members join
- [ ] Cache keys in Redux
- [ ] Handle new group creation flow
- [ ] Test: Member keys available in room data
- [ ] Test: Keys refresh on member changes

### Phase 4: Message Encryption & Sending
- [ ] Implement encrypted message input
- [ ] Encrypt before sending (use hooks)
- [ ] Send encrypted data to backend
- [ ] Handle encryption errors
- [ ] Show encryption status to user
- [ ] Test: Messages encrypted per device
- [ ] Test: All recipient devices receive message

### Phase 5: Message Decryption & Display
- [ ] Fetch encrypted messages from backend
- [ ] Decrypt using hooks
- [ ] Display decrypted content
- [ ] Handle decryption errors gracefully
- [ ] Show decryption status
- [ ] Test: Own device decrypts messages
- [ ] Test: Cannot decrypt others' messages (security)

### Phase 6: Multi-Device Support
- [ ] Register second device (another browser)
- [ ] Add second device to group
- [ ] Verify messages encrypted for both devices
- [ ] Test: Each device decrypts its copy
- [ ] Test: Device removal works
- [ ] Test: Old device cannot decrypt new messages

### Phase 7: Key Rotation
- [ ] Implement key rotation UI
- [ ] Call `useRotateIdentityKeys()` hook
- [ ] Verify rotation on backend
- [ ] Test: New keys work for encryption
- [ ] Test: Old messages still decrypt
- [ ] Test: All group keys updated

### Phase 8: Error Handling & Edge Cases
- [ ] Handle missing member keys
- [ ] Handle decryption failures
- [ ] Handle network errors during encryption ops
- [ ] Handle localStorage failures
- [ ] Handle Sodium initialization errors
- [ ] Test: Graceful degradation without E2EE
- [ ] Test: User-friendly error messages

### Phase 9: Logout & Data Clearing
- [ ] Call `useClearE2EEData()` on logout
- [ ] Verify localStorage cleared
- [ ] Verify Redux state cleared
- [ ] Test: Cannot decrypt after logout
- [ ] Test: Re-login initializes clean state

### Phase 10: Production Readiness
- [ ] Remove debug logs
- [ ] Handle all error cases
- [ ] Performance testing (large groups)
- [ ] Test with slow network
- [ ] Test browser storage quota exceeded
- [ ] Security audit of key storage
- [ ] Documentation complete

## Best Practices

### DO ✅

#### For Initialization
- ✅ Initialize E2EE in root component/provider
- ✅ Await `crypto.initiateSodium()` before any crypto ops
- ✅ Store device ID and reuse across sessions
- ✅ Register keys after successful login
- ✅ Provide loading states to users

#### For Encryption
- ✅ Always fetch latest member public keys before encrypting
- ✅ Encrypt separately for each device
- ✅ Include error handling for encryption
- ✅ Cache member public keys in Redux
- ✅ Use hooks for encryption operations
- ✅ Show encryption progress to users

#### For Decryption
- ✅ Decrypt asynchronously (use useEffect)
- ✅ Handle decryption errors gracefully
- ✅ Show loading state while decrypting
- ✅ Verify sender's public key exists
- ✅ Use your private key for your device only

#### For Key Management
- ✅ Never send private keys to server
- ✅ Store only public keys on server
- ✅ Rotate keys periodically
- ✅ Verify public key fingerprints if needed
- ✅ Clear device data on logout
- ✅ Handle key versioning for rotation

#### For Multi-Device
- ✅ Generate unique device ID per device
- ✅ Each device has separate identity keypair
- ✅ Each device has separate group keypairs
- ✅ Encrypt message once per device
- ✅ Decrypt only your device's copy

#### For Error Handling
- ✅ Wrap crypto operations in try-catch
- ✅ Log errors to console (dev), don't expose secrets
- ✅ Show user-friendly error messages
- ✅ Continue gracefully if encryption fails
- ✅ Provide retry mechanisms
- ✅ Use Redux error state

#### For Performance
- ✅ Batch encrypt multiple messages when possible
- ✅ Lazy-load encryption keys per group
- ✅ Cache member keys in Redux
- ✅ Use async/await to avoid blocking UI
- ✅ Debounce frequent key fetches

### DON'T ❌

#### Never Do These
- ❌ Store private keys in Redux (use localStorage/device-manager)
- ❌ Send private keys to server
- ❌ Display private keys to users
- ❌ Use same keypair across devices
- ❌ Skip Sodium initialization
- ❌ Reuse nonces (handled by crypto module)
- ❌ Trust unverified public keys
- ❌ Decrypt with wrong private key
- ❌ Assume old devices can decrypt new messages
- ❌ Forget to clear keys on logout

#### Security Pitfalls
- ❌ Hardcode encryption keys
- ❌ Log plaintext messages
- ❌ Store plaintext in messages
- ❌ Skip error handling
- ❌ Assume HTTPS is enough (use E2EE anyway)
- ❌ Use weak key derivation
- ❌ Share device ID across users
- ❌ Store unencrypted keys in localStorage
- ❌ Skip key verification under load
- ❌ Ignore decryption failures

## Code Examples

### ✅ GOOD: Proper Error Handling
```typescript
const handleSendMessage = async (message: string) => {
  try {
    const encrypted = encrypt(message);
    if (!encrypted) {
      throw new Error('Encryption resulted in no recipients');
    }

    const response = await send(message, encrypted, userId);
    toast.success('Message sent securely');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    console.error('Send failed:', msg);
    toast.error('Failed to send message safely');
  }
};
```

### ❌ BAD: Missing Error Handling
```typescript
const handleSendMessage = async (message: string) => {
  const encrypted = encrypt(message);
  await send(message, encrypted, userId); // No error handling!
  toast.success('Sent');
};
```

### ✅ GOOD: Proper Decryption Pattern
```typescript
useEffect(() => {
  const decryptAndSet = async () => {
    try {
      const decrypted = decrypt(
        message.ciphertext,
        message.iv,
        senderPublicKey,
        groupId
      );
      setContent(decrypted);
    } catch (error) {
      setError('Failed to decrypt message');
    }
  };
  
  decryptAndSet();
}, [message, senderPublicKey, groupId, decrypt]);
```

### ❌ BAD: Synchronous Decryption
```typescript
// This blocks the UI and can cause performance issues
const content = decrypt(
  message.ciphertext,
  message.iv,
  senderPublicKey,
  groupId
);
return <div>{content}</div>;
```

### ✅ GOOD: Proper Key Registration
```typescript
useEffect(() => {
  const registerKeys = async () => {
    try {
      setLoading(true);
      
      // Register identity key
      await registerIdentity(userId);
      
      // Register group keys
      for (const groupId of userGroups) {
        await registerGroupKey(groupId, userId);
      }
      
      toast.success('Keys registered successfully');
    } catch (error) {
      toast.error('Failed to setup encryption');
    } finally {
      setLoading(false);
    }
  };
  
  registerKeys();
}, []);
```

### ❌ BAD: No Registration
```typescript
// Trying to encrypt without registering keys first!
const handleSendMessage = async (message: string) => {
  const encrypted = encrypt(message); // Will fail!
};
```

### ✅ GOOD: Multi-Device Support
```typescript
// Device 1: Register
await registerIdentity(userId); // Creates keypair A
await registerGroupKey(groupId, userId); // Creates group keypair

// Device 2: Register (separate device)
// Creates keypair B (different from Device 1)
await registerIdentity(userId); // Different deviceId
await registerGroupKey(groupId, userId); // Per-device group key

// Message: Encrypted for both devices
// Device 1 decrypts with keypair A
// Device 2 decrypts with keypair B
```

## Testing Checklist

### Unit Tests
- [ ] Test key generation
- [ ] Test encryption/decryption roundtrip
- [ ] Test base64 encoding/decoding
- [ ] Test hash functions

### Integration Tests
- [ ] Test E2EE initialization flow
- [ ] Test key registration flow
- [ ] Test encryption -> send -> decrypt flow
- [ ] Test with mock API responses

### Manual Tests
- [ ] Single device: Send and receive messages
- [ ] Two devices: Same user, different devices
- [ ] Multiple users: Different user encryption
- [ ] Group chat: Multiple devices per user
- [ ] Network errors: Handle gracefully
- [ ] Key rotation: Verify new keys work
- [ ] Logout/re-login: Clean state management

### Performance Tests
- [ ] Large message (10MB+)
- [ ] Large group (100+ members)
- [ ] High throughput (rapid messages)
- [ ] Low bandwidth simulation
- [ ] Check for memory leaks

## Debugging Tips

### Enable Debug Logging
```typescript
// In localStorage console or code
localStorage.setItem('E2EE_DEBUG', 'true');
```

### Check Device State
```typescript
import { getDeviceInfo } from '@/lib/device-manager';
console.table(getDeviceInfo());
```

### Verify Member Keys
```typescript
import { getE2EEService } from '@/lib/e2ee-service';
const keys = await getE2EEService().getMemberPublicKeys(groupId);
console.table(keys);
```

### Check Encryption
```typescript
import { generateBoxKeypair, encryptMessageForRecipient } from '@/lib/crypto';
const kp = generateBoxKeypair();
const encrypted = encryptMessageForRecipient('test', kp.publicKey);
console.log('Ciphertext length:', encrypted.ciphertext.length);
```

### Verify Redux State
```typescript
import { store } from '@/redux/store';
const state = store.getState();
console.log('E2EE State:', state.e2ee);
```

## Common Issues & Solutions

### Issue: "Sodium not initialized"
**Solution:** Ensure `useE2EEInitialization()` is called in root component before any crypto operations.

### Issue: "Device not initialized"
**Solution:** Call `initializeDevice()` or check that localStorage is not cleared.

### Issue: "Member public keys not available"
**Solution:** Call `fetchKeys()` from `useFetchGroupMemberPublicKeys` hook before encrypting.

### Issue: Decryption fails with "crypto_box_open failed"
**Solution:** Verify you're using the correct private key and the message was encrypted for your device.

### Issue: Performance lag on large messages
**Solution:** Move encryption to a Web Worker or async operation with loading state.

### Issue: Keys not persisting after refresh
**Solution:** Check browser localStorage isn't being cleared. Verify `e2ee_device_state` exists.

### Issue: Multiple devices can't decrypt each other's messages
**Solution:** This is expected. Each device encrypts for specific recipients. Verify member public keys include both devices.

## Documentation Assets

- [E2EE_INTEGRATION_GUIDE.md](./E2EE_INTEGRATION_GUIDE.md) - Detailed integration steps
- [EncryptedChatRoom.tsx](./components/examples/EncryptedChatRoom.tsx) - Complete example component
- [API Documentation](#) - Backend E2EE endpoints (from spec) 
- [Type Definitions](./lib/e2ee-types.ts) - All TypeScript types

## Support Resources

- **Libsodium.js**: https://github.com/jedisct1/libsodium.js
- **Crypto Box**: https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption
- **BLAKE2b**: https://libsodium.gitbook.io/doc/hashing/generic_hashing
- **Argon2**: https://libsodium.gitbook.io/doc/password_hashing/argon2

## Sign-Off Checklist

- [ ] All development checklist items completed
- [ ] All best practices followed
- [ ] All security concerns addressed
- [ ] Testing completed successfully
- [ ] Documentation reviewed
- [ ] Code reviewed by team
- [ ] Ready for production deployment

---

**Last Updated**: February 6, 2026  
**E2EE Implementation Status**: Complete Implementation  
**Next Phase**: Integration with Chatify frontend & testing
