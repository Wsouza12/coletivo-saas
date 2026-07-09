const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Crypto functions from lib/crypto.ts
const algorithm = 'aes-256-cbc';
const getSecretKey = () => {
  const keyHex = process.env.ML_ENCRYPTION_KEY;
  if (!keyHex) throw new Error("ML_ENCRYPTION_KEY is not defined");
  if (keyHex.length !== 64) throw new Error("ML_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  return Buffer.from(keyHex, 'hex');
};

function decrypt(text) {
  const textParts = text.split(':');
  const ivStr = textParts.shift();
  if (!ivStr) throw new Error("Invalid encrypted text format");
  const iv = Buffer.from(ivStr, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, getSecretKey(), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function main() {
  try {
    const keys = ["EVOLUTION_API_URL", "EVOLUTION_INSTANCE", "EVOLUTION_API_KEY"];
    const rows = await prisma.configApp.findMany({ where: { chave: { in: keys } } });
    const config = {};
    for (const row of rows) {
      config[row.chave] = decrypt(row.valor);
    }
    
    console.log("Config loaded:", config);

    const baseUrl = config.EVOLUTION_API_URL.replace(/\/$/, "");
    const instance = config.EVOLUTION_INSTANCE;
    const apiKey = config.EVOLUTION_API_KEY;

    console.log(`Fetching from: ${baseUrl}/instance/connectionState/${instance}`);
    const res = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
