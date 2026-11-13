const PBKDF2_ITERATIONS = 600_000

interface EncryptedBackup {
  version: 1
  algorithm: 'AES-GCM-256'
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string
  iv: string
  data: string
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...u8))
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer.slice(0) as ArrayBuffer, hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackup(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const enc = new TextEncoder()
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer.slice(0) as ArrayBuffer }, key, enc.encode(plaintext))

  const backup: EncryptedBackup = {
    version: 1,
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    data: b64encode(cipherBuf),
  }
  return JSON.stringify(backup)
}

export async function decryptBackup(ciphertext: string, password: string): Promise<string> {
  let backup: EncryptedBackup
  try {
    backup = JSON.parse(ciphertext) as EncryptedBackup
  } catch {
    throw new Error('Ungültiges Dateiformat')
  }
  if (backup.version !== 1 || backup.algorithm !== 'AES-GCM-256') {
    throw new Error('Unbekanntes Backup-Format')
  }
  const salt = b64decode(backup.salt)
  const iv = b64decode(backup.iv)
  const data = b64decode(backup.data)
  const key = await deriveKey(password, salt)
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer.slice(0) as ArrayBuffer }, key, data.buffer.slice(0) as ArrayBuffer)
  } catch {
    throw new Error('Falsches Passwort oder beschädigte Datei')
  }
  return new TextDecoder().decode(plain)
}
