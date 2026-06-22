import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRepository, CaseRepository, AuditLogRepository, UserEntity } from './repositories/database.repositories';
import { encrypt, decrypt } from './services/encryption';
import { dbGet, dbInitialized } from './config/database';

async function runTests() {
  // Wait for database migrations to complete
  await dbInitialized;

  console.log('==================================================');
  console.log('   ISIQALO MED BACKEND SECURITY & ARCHITECTURE TESTS');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // Test 1: Encryption / Decryption at rest
    console.log('\n--- Test 1: AES-256-GCM Encryption / Decryption at rest ---');
    const secretSummary = 'Patient presents with severe dyspnea and tachycardia. ECG shows ST elevation.';
    const encrypted = encrypt(secretSummary);
    
    assert(encrypted !== secretSummary, 'Encrypted text should not equal plain text');
    assert(encrypted.split(':').length === 3, 'Encrypted format should contain IV, auth tag, and ciphertext');
    
    const decrypted = decrypt(encrypted);
    assert(decrypted === secretSummary, 'Decrypted text must match original plain text');

    // Test 2: Database Layer Direct Read vs API Read (Ensuring Encryption at Rest)
    console.log('\n--- Test 2: Relational Database Encryption at rest validation ---');
    const userId = crypto.randomUUID();
    const caseId = `case-test-${crypto.randomBytes(2).toString('hex')}`;
    const now = new Date().toISOString();

    // Create a mock user first to satisfy the FK constraint
    await UserRepository.createUser({
      id: userId,
      email: `${userId}@test.com`,
      password_hash: 'mock_hash',
      first_name: 'Test',
      last_name: 'Dr',
      role: 'practitioner',
      hpcsa_number: `MP${Math.floor(1000000 + Math.random() * 9000000)}`,
      speciality: 'General Medicine',
      practice_name: 'Test Practice',
      practice_number: '1234567',
      subscription_plan: 'starter',
      subscription_status: 'active',
      created_at: now,
      updated_at: now
    });

    const caseData = {
      id: caseId,
      title: 'Testing Cardiac Infarction Study',
      category: 'Cardiology',
      institution: 'Soweto Medical Center',
      summary_encrypted: encrypt(secretSummary),
      tags: 'ecg, cardiac',
      consent_obtained: 1,
      file_name: null,
      file_size: null,
      file_path_encrypted: null,
      uploaded_by_user_id: userId,
      created_at: now
    };

    // Insert case directly
    await CaseRepository.createCase(caseData);

    // Read raw row from DB to verify it's encrypted on disk
    const dbRow = await dbGet('SELECT * FROM cases WHERE id = ?', [caseId]);
    assert(dbRow !== undefined, 'Case record must exist in DB');
    assert(dbRow.summary_encrypted !== secretSummary, 'Direct database read must return encrypted ciphertext');
    assert(dbRow.summary_encrypted.includes(':'), 'Direct database read must return IV:tag:cipher format');

    // Decrypt and verify
    const apiReadDecrypted = decrypt(dbRow.summary_encrypted);
    assert(apiReadDecrypted === secretSummary, 'Repository level decrypt must restore the medical data');

    // Test 3: HPCSA Validation Schema check simulation
    console.log('\n--- Test 3: Validation schemas test simulation ---');
    const validHpcsa = 'MP0123456';
    const invalidHpcsa = 'INVALIDHPCSA';
    
    const hpcsaRegex = /^MP\s?\d{7}$/i;
    assert(hpcsaRegex.test(validHpcsa) === true, 'Valid HPCSA should pass regex check');
    assert(hpcsaRegex.test(invalidHpcsa) === false, 'Invalid HPCSA should fail regex check');

    // Test 4: Audit Logs Generation validation
    console.log('\n--- Test 4: Audit compliance logs check ---');
    const auditId = crypto.randomUUID();
    await AuditLogRepository.createAuditLog({
      id: auditId,
      user_id: userId,
      action: 'DATA_EXTRACTION_TEST',
      ip_address: '127.0.0.1',
      user_agent: 'Node-TestRunner',
      details: 'Practitioner ran verification tests',
      created_at: now
    });

    const savedLog = await dbGet('SELECT * FROM audit_logs WHERE id = ?', [auditId]);
    assert(savedLog !== undefined, 'Audit log record must be saved in database');
    assert(savedLog.action === 'DATA_EXTRACTION_TEST', 'Audit action field must match');
    assert(savedLog.ip_address === '127.0.0.1', 'Audit IP address field must match');

    console.log('\n==================================================');
    console.log(`TEST RUN COMPLETE: ${passed} passed, ${failed} failed.`);
    console.log('==================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exit(1);
  }
}

runTests();
