/**
 * Encrypts sensitive values before storing in sessionStorage using
 * AES-GCM with a per-session key held only in memory.
 * This prevents clear-text storage of tokens and PKCE verifiers.
 */

let sessionKey: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  sessionKey ??= await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return sessionKey;
}

/**
 * Encrypts a value and stores it in sessionStorage under the given key.
 *
 * @param key - The sessionStorage key to store under.
 * @param value - The plaintext value to encrypt and store.
 * @returns A promise that resolves when the value is stored.
 */
export async function secureSet(key: string, value: string): Promise<void> {
  const cryptoKey = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded,
  );

  // Store IV + ciphertext as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  sessionStorage.setItem(key, btoa(String.fromCharCode(...combined)));
}

/**
 * Retrieves and decrypts a value from sessionStorage.
 *
 * @param key - The sessionStorage key to retrieve.
 * @returns The decrypted plaintext value, or null if not found or decryption fails.
 */
export async function secureGet(key: string): Promise<string | null> {
  const stored = sessionStorage.getItem(key);
  if (!stored || !sessionKey) {
    return null;
  }

  try {
    const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // Key mismatch (new session) or corrupted data — treat as missing
    sessionStorage.removeItem(key);
    return null;
  }
}

/**
 * Removes a value from sessionStorage.
 *
 * @param key - The sessionStorage key to remove.
 */
export function secureRemove(key: string): void {
  sessionStorage.removeItem(key);
}
