# E2EE Base64 Key Validation Debugging Guide

## Issue
The identityPublicKey is not passing server-side base64 validation.

## Quick Debug Steps

### 1. Browser Console Diagnosis
```javascript
// Run in browser console (F12)
window.__e2eeDiagnostics()
```

This will output a detailed diagnostic report including:
- Whether Sodium is initialized
- Current device state
- Identity public key validation status
- Test keypair generation results
- Character composition of keys

### 2. What to Look For in Diagnostics

The output includes a `summary` object:
```javascript
{
  sodiumWorking: boolean,        // Is libsodium initialized?
  deviceInitialized: boolean,    // Device keys created?
  identityKeyValid: boolean,     // Does the identity key pass base64 validation?
  readyForRegistration: boolean  // Can we send keys to server?
}
```

### 3. Interpreting Results

#### If `identityKeyValid: false`
Check the `steps` array for the "Get Identity Public Key" step:
- **keyLength**: Should be around 43-44 characters for a 32-byte key
  - Too short? Key might be truncated
  - Too long? Key might have extra characters
- **Key characters**: Check for unexpected characters
  - Valid base64: `A-Z`, `a-z`, `0-9`, `+`, `/`, `=`
  - Invalid: spaces, newlines, special characters

#### If `sodiumWorking: false`
- libsodium-wrappers-sumo is not initialized
- Check browser console for any import errors
- Ensure you've logged in (which triggers key generation)

#### If `deviceInitialized: false`
- Device keys haven't been created yet
- Check app/providers.tsx logs for "E2EE key setup" messages

### 4. Server Validation Rules

The server validates base64 keys using this logic:
```javascript
function isValidBase64Key(value) {
  // 1. Must be a string
  if (typeof value !== 'string') return false;
  
  // 2. After trim, length must be between KEY_MIN_LENGTH and KEY_MAX_LENGTH
  const trimmed = value.trim();
  if (trimmed.length < 40 || trimmed.length > 45) return false;
  
  // 3. Only valid base64 characters: A-Z, a-z, 0-9, +, /, =
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) return false;
  
  // 4. Round-trip test: decode and re-encode should match (minus padding)
  try {
    const normalized = Buffer.from(trimmed, 'base64').toString('base64');
    const strippedInput = trimmed.replace(/=+$/, '');
    const strippedNormalized = normalized.replace(/=+$/, '');
    return strippedInput === strippedNormalized;
  } catch (error) {
    return false;
  }
}
```

### 5. Common Issues & Solutions

| Problem | Check | Solution |
|---------|-------|----------|
| `keyLength: 0` or `NULL` | identityPublicKey is missing | Device not initialized; check device-manager logs |
| `keyLength < 40` | Key is truncated | Check if storage/retrieval is cutting off data |
| `keyLength > 50` | Key has extra content | Check for newlines, spaces, or extra characters |
| `isValidBase64: false` | Invalid characters | Look at the actual key value in logs |
| `sodiumWorking: false` | Sodium not ready | Check for libsodium-wrappers-sumo import errors |

### 6. Manual Key Inspection

To inspect the actual key value:
```javascript
// In browser console
(async () => {
  const dm = await import('@/lib/device-manager');
  const key = dm.getIdentityPublicKey();
  console.log('Key:', key);
  console.log('Length:', key.length);
  console.log('First 20 chars:', key.substring(0, 20));
  console.log('Last 10 chars:', key.substring(key.length - 10));
})()
```

### 7. Validate Key Manually

```javascript
// Test if a key passes validation
(async () => {
  const crypto = await import('@/lib/crypto');
  const key = 'YOUR_KEY_HERE';
  const isValid = crypto.isValidBase64Key(key);
  console.log('Is valid:', isValid);
})()
```

###  8. Check localStorage

```javascript
// In browser console
const stored = localStorage.getItem('e2ee_device_state');
if (stored) {
  const state = JSON.parse(stored);
  console.log('Device ID:', state.deviceId);
  console.log('Identity Public Key:', state.identityKeyPair?.publicKey);
} else {
  console.log('No device state found in localStorage');
}
```

## Next Steps After Diagnosis

1. **Share the output of `window.__e2eeDiagnostics()`** - Copy the console output and share it
2. **Check browser network tab** - See the actual request/response to `/auth/setup-keys`
3. **Use the key inspection utility** for deeper details:
   ```javascript
   (async () => {
     const { inspectBase64Key } = await import('@/lib/crypto');
     const dm = await import('@/lib/device-manager');
     const key = dm.getIdentityPublicKey();
     if (key) {
       const inspection = inspectBase64Key(key);
       console.log('=== Detailed Key Inspection ===', inspection);
     }
   })()
   ```

The inspection output includes:
- **Character composition**: Which base64 characters are present
- **Decoded length**: Should be exactly 32 bytes for a valid key
- **Padding**: Number of `=` padding characters
- **Round-trip match**: Whether the key can be decoded and re-encoded identically

## Related Files

- `/lib/crypto.ts` - Key generation and base64 validation
- `/lib/device-manager.ts` - Storage and retrieval of keys
- `/lib/e2ee-service.ts` - High-level orchestration including diagnostics
- `/app/providers.tsx` - Key registration on login
