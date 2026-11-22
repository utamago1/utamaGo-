export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-z0-9_.]+$/;

export const EMAIL_MAX_LENGTH = 120;
export const NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function sanitizeDisplayName(raw: string): string {
  return raw.trim().slice(0, NAME_MAX_LENGTH);
}

export function validateUsername(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized,
      error: 'Masukkan username terlebih dahulu.',
    };
  }
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      normalized,
      error: `Username minimal ${USERNAME_MIN_LENGTH} karakter.`,
    };
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      normalized,
      error: `Username maksimal ${USERNAME_MAX_LENGTH} karakter.`,
    };
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      valid: false,
      normalized,
      error:
        'Username hanya boleh berisi huruf kecil, angka, titik (.), atau garis bawah (_).',
    };
  }
  return { valid: true, normalized };
}

export function validateEmail(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeEmail(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized,
      error: 'Masukkan alamat email terlebih dahulu.',
    };
  }
  if (normalized.length > EMAIL_MAX_LENGTH) {
    return {
      valid: false,
      normalized,
      error: `Email maksimal ${EMAIL_MAX_LENGTH} karakter.`,
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Format email tidak valid. Contoh: nama@gmail.com',
    };
  }
  return { valid: true, normalized };
}

export function validatePassword(raw: string): {
  valid: boolean;
  error?: string;
} {
  if (!raw) {
    return { valid: false, error: 'Masukkan password terlebih dahulu.' };
  }
  if (raw.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`,
    };
  }
  if (raw.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      error: `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`,
    };
  }
  return { valid: true };
}
