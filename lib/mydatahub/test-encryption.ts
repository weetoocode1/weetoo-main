import { MyDataHubEncryption } from "./encryption";

console.log("Testing MyData Hub AES256 Encryption...\n");

const testResult = MyDataHubEncryption.testEncryption();

if (testResult) {
  console.log("\n✅ All encryption tests passed!");
  process.exit(0);
} else {
  console.log("\n❌ Encryption tests failed!");
  process.exit(1);
}

