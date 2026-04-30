const IDENTITY_KEY_PREFIX = 'messenger-e2ee-identity-v1:'
const THREAD_KEY_PREFIX = 'messenger-e2ee-thread-v1:'

export type MessengerUserPublicKeyBundle = {
  user_id: string
  algorithm: string
  public_key_jwk: JsonWebKey
  updated_at?: string | null
}

export type MessengerThreadKeyEnvelope = {
  thread_id: string
  recipient_user_id: string
  sender_user_id: string
  key_version: number
  algorithm: string
  encrypted_key_json: {
    wrapped_key_b64?: string
    iv_b64?: string
  }
  updated_at?: string | null
}

export type MessengerEncryptedPayload = {
  scheme: 'messenger-e2ee-v1'
  algorithm: 'AES-GCM'
  ciphertext_b64: string
  iv_b64: string
  key_version: number
}

export type MessengerEncryptedAttachmentMeta = {
  scheme: 'messenger-e2ee-v1'
  algorithm: 'AES-GCM'
  iv_b64: string
  key_version: number
  encrypted_blob: true
  original_size_bytes?: number
}

type StoredIdentityKeyPair = {
  algorithm: 'ECDH-P256'
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
}

type StoredThreadKey = {
  keyVersion: number
  keyRawB64: string
}

function requireCrypto() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Browser crypto is unavailable')
  }
  return window.crypto.subtle
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value)
}

function decodeUtf8(value: ArrayBuffer) {
  return new TextDecoder().decode(value)
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function getIdentityStorageKey(userId: string) {
  return `${IDENTITY_KEY_PREFIX}${userId}`
}

function getThreadKeyStorageKey(userId: string, threadId: string) {
  return `${THREAD_KEY_PREFIX}${userId}:${threadId}`
}

async function importPrivateEcdhKey(jwk: JsonWebKey) {
  return requireCrypto().importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])
}

async function importPublicEcdhKey(jwk: JsonWebKey) {
  return requireCrypto().importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
}

async function importAesKeyFromRawB64(rawB64: string) {
  return requireCrypto().importKey('raw', base64ToArrayBuffer(rawB64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function derivePairwiseKey(privateJwk: JsonWebKey, publicJwk: JsonWebKey) {
  const privateKey = await importPrivateEcdhKey(privateJwk)
  const publicKey = await importPublicEcdhKey(publicJwk)
  return requireCrypto().deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function ensureLocalMessengerIdentity(userId: string): Promise<StoredIdentityKeyPair> {
  const storageKey = getIdentityStorageKey(userId)
  const stored = window.localStorage.getItem(storageKey)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoredIdentityKeyPair
      if (parsed?.publicKeyJwk && parsed?.privateKeyJwk) return parsed
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }
  const keyPair = await requireCrypto().generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  )
  const publicKeyJwk = await requireCrypto().exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await requireCrypto().exportKey('jwk', keyPair.privateKey)
  const payload: StoredIdentityKeyPair = {
    algorithm: 'ECDH-P256',
    publicKeyJwk,
    privateKeyJwk,
  }
  window.localStorage.setItem(storageKey, JSON.stringify(payload))
  return payload
}

export function getStoredThreadKey(userId: string, threadId: string): StoredThreadKey | null {
  const raw = window.localStorage.getItem(getThreadKeyStorageKey(userId, threadId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredThreadKey
    if (!parsed?.keyRawB64 || !parsed?.keyVersion) return null
    return parsed
  } catch {
    window.localStorage.removeItem(getThreadKeyStorageKey(userId, threadId))
    return null
  }
}

export function storeThreadKey(userId: string, threadId: string, key: StoredThreadKey) {
  window.localStorage.setItem(getThreadKeyStorageKey(userId, threadId), JSON.stringify(key))
}

export async function generateThreadSharedKey() {
  const key = await requireCrypto().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const raw = await requireCrypto().exportKey('raw', key)
  return arrayBufferToBase64(raw)
}

export async function createThreadKeyEnvelope(sharedKeyRawB64: string, ownPrivateKeyJwk: JsonWebKey, recipientPublicKeyJwk: JsonWebKey) {
  const wrappingKey = await derivePairwiseKey(ownPrivateKeyJwk, recipientPublicKeyJwk)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await requireCrypto().encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    base64ToArrayBuffer(sharedKeyRawB64),
  )
  return {
    wrapped_key_b64: arrayBufferToBase64(ciphertext),
    iv_b64: arrayBufferToBase64(iv.buffer),
  }
}

export async function decryptThreadKeyEnvelope(envelope: MessengerThreadKeyEnvelope, ownPrivateKeyJwk: JsonWebKey, senderPublicKeyJwk: JsonWebKey) {
  const wrappingKey = await derivePairwiseKey(ownPrivateKeyJwk, senderPublicKeyJwk)
  const wrappedKeyB64 = envelope.encrypted_key_json?.wrapped_key_b64 || ''
  const ivB64 = envelope.encrypted_key_json?.iv_b64 || ''
  if (!wrappedKeyB64 || !ivB64) throw new Error('Missing encrypted thread key envelope')
  const plaintext = await requireCrypto().decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(ivB64)) },
    wrappingKey,
    base64ToArrayBuffer(wrappedKeyB64),
  )
  return arrayBufferToBase64(plaintext)
}

export async function encryptMessengerText(sharedKeyRawB64: string, plainText: string, keyVersion: number): Promise<MessengerEncryptedPayload> {
  const key = await importAesKeyFromRawB64(sharedKeyRawB64)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await requireCrypto().encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodeUtf8(plainText),
  )
  return {
    scheme: 'messenger-e2ee-v1',
    algorithm: 'AES-GCM',
    ciphertext_b64: arrayBufferToBase64(ciphertext),
    iv_b64: arrayBufferToBase64(iv.buffer),
    key_version: keyVersion,
  }
}

export async function decryptMessengerText(sharedKeyRawB64: string, payload: MessengerEncryptedPayload) {
  const key = await importAesKeyFromRawB64(sharedKeyRawB64)
  const plaintext = await requireCrypto().decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(payload.iv_b64)) },
    key,
    base64ToArrayBuffer(payload.ciphertext_b64),
  )
  return decodeUtf8(plaintext)
}

export async function encryptCallSignalPayload(sharedKeyRawB64: string, payload: Record<string, unknown>, keyVersion: number) {
  const serialized = JSON.stringify(payload)
  return encryptMessengerText(sharedKeyRawB64, serialized, keyVersion)
}

export async function decryptCallSignalPayload(sharedKeyRawB64: string, payload: MessengerEncryptedPayload) {
  const serialized = await decryptMessengerText(sharedKeyRawB64, payload)
  return JSON.parse(serialized) as Record<string, unknown>
}

export async function encryptMessengerBinary(sharedKeyRawB64: string, rawData: ArrayBuffer, keyVersion: number): Promise<{ encryptedBytes: Uint8Array; payload: MessengerEncryptedAttachmentMeta }> {
  const key = await importAesKeyFromRawB64(sharedKeyRawB64)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await requireCrypto().encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawData,
  )
  return {
    encryptedBytes: new Uint8Array(ciphertext),
    payload: {
      scheme: 'messenger-e2ee-v1',
      algorithm: 'AES-GCM',
      iv_b64: arrayBufferToBase64(iv.buffer),
      key_version: keyVersion,
      encrypted_blob: true,
      original_size_bytes: rawData.byteLength,
    },
  }
}

export async function decryptMessengerBinary(sharedKeyRawB64: string, payload: MessengerEncryptedAttachmentMeta, encryptedData: ArrayBuffer) {
  const key = await importAesKeyFromRawB64(sharedKeyRawB64)
  return requireCrypto().decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(payload.iv_b64)) },
    key,
    encryptedData,
  )
}
