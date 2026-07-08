import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// ML_ENCRYPTION_KEY deve ser uma string hex de 64 caracteres (32 bytes)
function getKey(): Buffer {
  const key = process.env.ML_ENCRYPTION_KEY;
  if (!key) throw new Error("ML_ENCRYPTION_KEY não configurada");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("ML_ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex)");
  }
  return buf;
}

// Formato armazenado: iv:authTag:ciphertext (tudo em hex)
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
  const [ivHex, authTagHex, encryptedHex] = text.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Formato de texto criptografado inválido");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
