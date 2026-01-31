const crypto = require("crypto");

const algorithm = "aes-256-cbc";
const secretKey = Buffer.from(process.env.ENCRYPTION_KEY);
const ivLength = 16;

// Encrypt function
function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

// Decrypt function
function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { encrypt, decrypt };
