const argon2 = require('argon2');

export async function hashPassword(password: string) {
  try {
    const hash = await argon2.hash(password);
    return hash;
  } catch (err) {
    console.error("Hashing error:", err);
    return null; 
  }
}

export async function comparePassword(password: string, hash: string) {
  try {
    const match = await argon2.verify(hash, password);
    return match;
  } catch (err) {
    console.error("Verification error:", err);
    return false;
  }
}
