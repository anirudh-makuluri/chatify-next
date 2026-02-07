/**
 * E2EE Test Utilities - Helper functions for testing E2EE operations
 * Use these in your test files to validate E2EE functionality
 */

import * as crypto from './crypto';
import * as deviceManager from './device-manager';
import { generateBoxKeypair } from './crypto';

/**
 * Test: Basic key generation
 */
export async function testKeyGeneration(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const keypair = crypto.generateBoxKeypair();

		// Verify keypair structure
		if (!keypair.publicKey || !keypair.privateKey) {
			console.error('Invalid keypair generated');
			return false;
		}

		// Verify base64 format
		if (
			!/^[A-Za-z0-9+/=]+$/.test(keypair.publicKey) ||
			!/^[A-Za-z0-9+/=]+$/.test(keypair.privateKey)
		) {
			console.error('Keys not in base64 format');
			return false;
		}

		console.log('✓ Key generation test passed');
		return true;
	} catch (error) {
		console.error('Key generation test failed:', error);
		return false;
	}
}

/**
 * Test: Encryption and decryption roundtrip
 */
export async function testEncryptionRoundtrip(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const message = 'Hello, E2EE World!';
		const senderKeypair = crypto.generateBoxKeypair();
		const recipientKeypair = crypto.generateBoxKeypair();

		// Encrypt message for recipient
		const encrypted = crypto.encryptMessageForRecipient(
			message,
			recipientKeypair.publicKey
		);

		// Decrypt message
		const decrypted = crypto.decryptMessage(
			encrypted.ciphertext,
			encrypted.iv,
			senderKeypair.publicKey,
			recipientKeypair.privateKey
		);

		// Verify decryption
		if (decrypted !== message) {
			console.error(
				`Decryption mismatch: expected "${message}", got "${decrypted}"`
			);
			return false;
		}

		console.log('✓ Encryption roundtrip test passed');
		return true;
	} catch (error) {
		console.error('Encryption roundtrip test failed:', error);
		return false;
	}
}

/**
 * Test: Multiple recipient encryption
 */
export async function testMultipleRecipientEncryption(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const message = 'Broadcast message';
		const recipient1 = crypto.generateBoxKeypair();
		const recipient2 = crypto.generateBoxKeypair();
		const recipient3 = crypto.generateBoxKeypair();

		const recipientKeys = {
			user1: recipient1.publicKey,
			user2: recipient2.publicKey,
			user3: recipient3.publicKey,
		};

		// Encrypt for all recipients
		const encrypted =
			crypto.encryptMessageForMultipleRecipients(
				message,
				recipientKeys
			);

		// Verify all recipients have encrypted copy
		if (Object.keys(encrypted).length !== 3) {
			console.error('Not all recipients encrypted');
			return false;
		}

		// Verify each recipient can decrypt their copy
		const senderKeypair = crypto.generateBoxKeypair();

		const decrypted1 = crypto.decryptMessage(
			encrypted.user1.ciphertext,
			encrypted.user1.iv,
			senderKeypair.publicKey,
			recipient1.privateKey
		);

		const decrypted2 = crypto.decryptMessage(
			encrypted.user2.ciphertext,
			encrypted.user2.iv,
			senderKeypair.publicKey,
			recipient2.privateKey
		);

		if (decrypted1 !== message || decrypted2 !== message) {
			console.error('Multi-recipient decryption failed');
			return false;
		}

		console.log('✓ Multiple recipient encryption test passed');
		return true;
	} catch (error) {
		console.error('Multiple recipient encryption test failed:', error);
		return false;
	}
}

/**
 * Test: Device initialization and storage
 */
export async function testDeviceInitialization(): Promise<boolean> {
	try {
		// Clear existing device data
		deviceManager.clearDeviceData();

		// Initialize device
		const deviceState = deviceManager.initializeDevice('Test Device');

		// Verify device state
		if (
			!deviceState.initialized ||
			!deviceState.deviceId ||
			!deviceState.identityKeyPair
		) {
			console.error('Device initialization failed');
			return false;
		}

		// Verify retrieval
		const retrieved = deviceManager.getDeviceState();
		if (!retrieved || retrieved.deviceId !== deviceState.deviceId) {
			console.error('Device state retrieval failed');
			return false;
		}

		// Verify persistence
		const deviceId = deviceManager.getDeviceId();
		if (deviceId !== deviceState.deviceId) {
			console.error('Device ID persistence failed');
			return false;
		}

		console.log('✓ Device initialization test passed');
		deviceManager.clearDeviceData(); // Cleanup
		return true;
	} catch (error) {
		console.error('Device initialization test failed:', error);
		return false;
	}
}

/**
 * Test: Group key management
 */
export async function testGroupKeyManagement(): Promise<boolean> {
	try {
		deviceManager.clearDeviceData();
		deviceManager.initializeDevice();

		const groupId = 'test-group-123';

		// Add group key
		const keypair = crypto.generateBoxKeypair();
		const groupKeyPair = {
			groupId,
			publicKey: keypair.publicKey,
			privateKey: keypair.privateKey,
		};

		deviceManager.setGroupKeyPair(groupKeyPair);

		// Retrieve group key
		const retrieved = deviceManager.getGroupKeyPair(groupId);
		if (!retrieved || retrieved.groupId !== groupId) {
			console.error('Group key retrieval failed');
			return false;
		}

		// Remove group key
		deviceManager.removeGroupKeyPair(groupId);
		const afterRemoval = deviceManager.getGroupKeyPair(groupId);
		if (afterRemoval) {
			console.error('Group key removal failed');
			return false;
		}

		console.log('✓ Group key management test passed');
		deviceManager.clearDeviceData(); // Cleanup
		return true;
	} catch (error) {
		console.error('Group key management test failed:', error);
		return false;
	}
}

/**
 * Test: Key rotation
 */
export async function testKeyRotation(): Promise<boolean> {
	try {
		deviceManager.clearDeviceData();
		deviceManager.initializeDevice();

		const originalKeys = deviceManager.getIdentityPublicKey();

		// Rotate keys
		const newKeypair = deviceManager.rotateIdentityKeyPair();
		const newKeys = deviceManager.getIdentityPublicKey();

		// Verify keys changed
		if (originalKeys === newKeys) {
			console.error('Key rotation did not change keys');
			return false;
		}

		// Verify new keypair returned
		if (newKeypair.publicKey !== newKeys) {
			console.error('Returned keypair does not match stored key');
			return false;
		}

		console.log('✓ Key rotation test passed');
		deviceManager.clearDeviceData(); // Cleanup
		return true;
	} catch (error) {
		console.error('Key rotation test failed:', error);
		return false;
	}
}

/**
 * Test: Hashing functionality
 */
export async function testHashing(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const input = 'test-input-string';
		const hash1 = crypto.hashString(input);
		const hash2 = crypto.hashString(input);

		// Hash should be deterministic
		if (hash1 !== hash2) {
			console.error('Hash is not deterministic');
			return false;
		}

		// Hash should be base64
		if (!/^[A-Za-z0-9+/=]+$/.test(hash1)) {
			console.error('Hash not in base64 format');
			return false;
		}

		// Different input should produce different hash
		const hash3 = crypto.hashString('different-input');
		if (hash1 === hash3) {
			console.error('Different inputs produced same hash');
			return false;
		}

		console.log('✓ Hashing test passed');
		return true;
	} catch (error) {
		console.error('Hashing test failed:', error);
		return false;
	}
}

/**
 * Test: Key derivation
 */
export async function testKeyDerivation(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const password = 'my-secure-password';

		// Derive key from password
		const result1 = crypto.deriveKeyFromPassword(password);

		// Same password with different salt should produce different key
		const result2 = crypto.deriveKeyFromPassword(password);

		if (result1.key === result2.key) {
			console.error('Key derivation not using random salt');
			return false;
		}

		// Verify base64 format
		if (
			!/^[A-Za-z0-9+/=]+$/.test(result1.key) ||
			!/^[A-Za-z0-9+/=]+$/.test(result1.salt)
		) {
			console.error('Key derivation result not in base64');
			return false;
		}

		console.log('✓ Key derivation test passed');
		return true;
	} catch (error) {
		console.error('Key derivation test failed:', error);
		return false;
	}
}

/**
 * Test: Nonce generation
 */
export async function testNonceGeneration(): Promise<boolean> {
	try {
		await crypto.initiateSodium();

		const nonce1 = crypto.generateRandomNonce();
		const nonce2 = crypto.generateRandomNonce();

		// Nonces should be different
		if (nonce1 === nonce2) {
			console.error('Nonces not unique');
			return false;
		}

		// Should be base64
		if (!/^[A-Za-z0-9+/=]+$/.test(nonce1)) {
			console.error('Nonce not in base64');
			return false;
		}

		console.log('✓ Nonce generation test passed');
		return true;
	} catch (error) {
		console.error('Nonce generation test failed:', error);
		return false;
	}
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<{
	passed: number;
	failed: number;
	results: { test: string; passed: boolean }[];
}> {
	console.log('🧪 Starting E2EE tests...\n');

	const tests = [
		{ name: 'Key Generation', fn: testKeyGeneration },
		{ name: 'Encryption Roundtrip', fn: testEncryptionRoundtrip },
		{ name: 'Multiple Recipient Encryption', fn: testMultipleRecipientEncryption },
		{ name: 'Device Initialization', fn: testDeviceInitialization },
		{ name: 'Group Key Management', fn: testGroupKeyManagement },
		{ name: 'Key Rotation', fn: testKeyRotation },
		{ name: 'Hashing', fn: testHashing },
		{ name: 'Key Derivation', fn: testKeyDerivation },
		{ name: 'Nonce Generation', fn: testNonceGeneration },
	];

	const results: { test: string; passed: boolean }[] = [];
	let passed = 0;
	let failed = 0;

	for (const test of tests) {
		try {
			const result = await test.fn();
			if (result) {
				passed++;
			} else {
				failed++;
			}
			results.push({ test: test.name, passed: result });
		} catch (error) {
			failed++;
			results.push({ test: test.name, passed: false });
			console.error(`✗ ${test.name} crashed:`, error);
		}
	}

	console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

	return { passed, failed, results };
}

/**
 * Performance test: Measure encryption speed
 */
export async function benchmarkEncryption(
	iterations: number = 100
): Promise<{ totalTime: number; avgTime: number; opsPerSecond: number }> {
	try {
		await crypto.initiateSodium();

		const message = 'Performance test message';
		const recipientKeyPair = crypto.generateBoxKeypair();

		const startTime = performance.now();

		for (let i = 0; i < iterations; i++) {
			crypto.encryptMessageForRecipient(message, recipientKeyPair.publicKey);
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTime = totalTime / iterations;
		const opsPerSecond = 1000 / avgTime;

		console.log(`⚡ Encryption Performance:`);
		console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
		console.log(`   Average: ${avgTime.toFixed(3)}ms per operation`);
		console.log(`   Throughput: ${opsPerSecond.toFixed(0)} ops/sec`);

		return { totalTime, avgTime, opsPerSecond };
	} catch (error) {
		console.error('Benchmark failed:', error);
		throw error;
	}
}

/**
 * Performance test: Measure decryption speed
 */
export async function benchmarkDecryption(
	iterations: number = 100
): Promise<{ totalTime: number; avgTime: number; opsPerSecond: number }> {
	try {
		await crypto.initiateSodium();

		const message = 'Performance test message';
		const senderKeyPair = crypto.generateBoxKeypair();
		const recipientKeyPair = crypto.generateBoxKeypair();

		// Pre-encrypt message
		const encrypted = crypto.encryptMessageForRecipient(
			message,
			recipientKeyPair.publicKey
		);

		const startTime = performance.now();

		for (let i = 0; i < iterations; i++) {
			crypto.decryptMessage(
				encrypted.ciphertext,
				encrypted.iv,
				senderKeyPair.publicKey,
				recipientKeyPair.privateKey
			);
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTime = totalTime / iterations;
		const opsPerSecond = 1000 / avgTime;

		console.log(`⚡ Decryption Performance:`);
		console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
		console.log(`   Average: ${avgTime.toFixed(3)}ms per operation`);
		console.log(`   Throughput: ${opsPerSecond.toFixed(0)} ops/sec`);

		return { totalTime, avgTime, opsPerSecond };
	} catch (error) {
		console.error('Benchmark failed:', error);
		throw error;
	}
}

/**
 * Run performance benchmarks
 */
export async function runBenchmarks(): Promise<void> {
	console.log('🏃 Starting E2EE benchmarks...\n');

	try {
		await benchmarkEncryption(100);
		console.log();
		await benchmarkDecryption(100);
		console.log('\n✅ Benchmarks complete');
	} catch (error) {
		console.error('Benchmark error:', error);
	}
}
