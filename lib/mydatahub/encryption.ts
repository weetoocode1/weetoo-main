import crypto from "crypto";

interface EncryptionConfig {
  encKey: string;
  encIV: string;
  encType: string;
}

const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  encKey: process.env.MYDATAHUB_ENC_KEY || "wjkCCW@v@53ASqWLAAjV@wvvqLt5jtRU",
  encIV: process.env.MYDATAHUB_ENC_IV || "9FLCCv@C5jRCSRCA",
  encType: "AES_CBC_PKCS5PADDING/256",
};

export class MyDataHubEncryption {
  private encKey: string;
  private encIV: string;

  constructor(config?: Partial<EncryptionConfig>) {
    this.encKey = config?.encKey || DEFAULT_ENCRYPTION_CONFIG.encKey;
    this.encIV = config?.encIV || DEFAULT_ENCRYPTION_CONFIG.encIV;

    if (!this.encKey || this.encKey.length !== 32) {
      throw new Error(
        `Encryption key must be 32 characters long. Current length: ${this.encKey?.length || 0}`
      );
    }

    if (!this.encIV || this.encIV.length !== 16) {
      throw new Error(
        `Encryption IV must be 16 characters long. Current length: ${this.encIV?.length || 0}`
      );
    }
  }

  encrypt(plainText: string): string {
    try {
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(this.encKey, "utf8"),
        Buffer.from(this.encIV, "utf8")
      );

      let encrypted = cipher.update(plainText, "utf8", "base64");
      encrypted += cipher.final("base64");

      return encrypted;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(this.encKey, "utf8"),
        Buffer.from(this.encIV, "utf8")
      );

      let decrypted = decipher.update(encryptedText, "base64", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  static testEncryption(): boolean {
    try {
      const encryption = new MyDataHubEncryption();
      const plainData = "!Kwic123테스트";
      const expectedEncData = "sYywhiLgrPx/rPGBjDUKetZYMNYzTi9PCOW+2MGtu28=";

      const encrypted = encryption.encrypt(plainData);

      if (encrypted !== expectedEncData) {
        console.error(
          `Encryption test failed!\nExpected: ${expectedEncData}\nGot: ${encrypted}`
        );
        return false;
      }

      const decrypted = encryption.decrypt(encrypted);
      if (decrypted !== plainData) {
        console.error(
          `Decryption test failed!\nExpected: ${plainData}\nGot: ${decrypted}`
        );
        return false;
      }

      console.log("✅ AES256 encryption/decryption test passed!");
      return true;
    } catch (error) {
      console.error("Encryption test error:", error);
      return false;
    }
  }
}

