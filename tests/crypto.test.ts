import { describe, it, expect } from 'vitest'
import { encryptBackup, decryptBackup } from '../src/utils/crypto'

describe('encryptBackup / decryptBackup', () => {
  it('round-trips plaintext', async () => {
    const plain = JSON.stringify({ test: 'hello', data: [1, 2, 3] })
    const password = 'geheimesPasswort1234!'
    const cipher = await encryptBackup(plain, password)
    const result = await decryptBackup(cipher, password)
    expect(result).toBe(plain)
  })

  it('produces a different ciphertext each time (random IV/salt)', async () => {
    const plain = 'test data'
    const password = 'pw'
    const c1 = await encryptBackup(plain, password)
    const c2 = await encryptBackup(plain, password)
    expect(c1).not.toBe(c2)
  })

  it('throws on wrong password', async () => {
    const cipher = await encryptBackup('secret', 'correct-password')
    await expect(decryptBackup(cipher, 'wrong-password')).rejects.toThrow()
  })

  it('throws on tampered ciphertext', async () => {
    const cipher = await encryptBackup('secret', 'password')
    const parsed = JSON.parse(cipher) as { data: string }
    parsed.data = parsed.data.slice(0, -4) + 'XXXX'
    await expect(decryptBackup(JSON.stringify(parsed), 'password')).rejects.toThrow()
  })

  it('output contains expected metadata fields', async () => {
    const cipher = await encryptBackup('test', 'pw')
    const parsed = JSON.parse(cipher) as Record<string, unknown>
    expect(parsed).toHaveProperty('version')
    expect(parsed).toHaveProperty('algorithm')
    expect(parsed).toHaveProperty('kdf')
    expect(parsed).toHaveProperty('iterations')
    expect(parsed).toHaveProperty('salt')
    expect(parsed).toHaveProperty('iv')
    expect(parsed).toHaveProperty('data')
  })

  it('uses AES-GCM-256 and PBKDF2', async () => {
    const cipher = await encryptBackup('test', 'pw')
    const parsed = JSON.parse(cipher) as { algorithm: string; kdf: string }
    expect(parsed.algorithm).toBe('AES-GCM-256')
    expect(parsed.kdf).toBe('PBKDF2-SHA256')
  })
})
