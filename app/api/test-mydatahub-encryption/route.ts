import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plainData, expectedEncData } = body;

    if (!plainData || !expectedEncData) {
      return NextResponse.json(
        {
          error: "plainData and expectedEncData are required",
        },
        { status: 400 }
      );
    }

    const encKey = process.env.MYDATAHUB_ENC_KEY || "";
    const encIV = process.env.MYDATAHUB_ENC_IV || "";

    // Also test with the default test keys from the code
    const testEncKey = "wjkCCW@v@53ASqWLAAjV@wvvqLt5jtRU";
    const testEncIV = "9FLCCv@C5jRCSRCA";
    const testPlainData = "!Kwic123테스트";
    const testExpectedEncData = "sYywhiLgrPx/rPGBjDUKetZYMNYzTi9PCOW+2MGtu28=";

    // Try different encryption methods
    const methods: Record<string, string> = {};
    const testMethods: Record<string, string> = {};

    // Method 1: latin1 encoding (current)
    try {
      const keyBuffer1 = Buffer.from(encKey, "latin1");
      const ivBuffer1 = Buffer.from(encIV, "latin1");
      const cipher1 = crypto.createCipheriv(
        "aes-256-cbc",
        keyBuffer1,
        ivBuffer1
      );
      let encrypted1 = cipher1.update(plainData, "utf8", "base64");
      encrypted1 += cipher1.final("base64");
      methods["latin1"] = encrypted1;
    } catch (e) {
      methods["latin1"] = `Error: ${
        e instanceof Error ? e.message : "Unknown"
      }`;
    }

    // Method 2: utf8 encoding
    try {
      const keyBuffer2 = Buffer.from(encKey, "utf8");
      const ivBuffer2 = Buffer.from(encIV, "utf8");
      const cipher2 = crypto.createCipheriv(
        "aes-256-cbc",
        keyBuffer2,
        ivBuffer2
      );
      let encrypted2 = cipher2.update(plainData, "utf8", "base64");
      encrypted2 += cipher2.final("base64");
      methods["utf8"] = encrypted2;
    } catch (e) {
      methods["utf8"] = `Error: ${e instanceof Error ? e.message : "Unknown"}`;
    }

    // Method 3: ascii encoding
    try {
      const keyBuffer3 = Buffer.from(encKey, "ascii");
      const ivBuffer3 = Buffer.from(encIV, "ascii");
      const cipher3 = crypto.createCipheriv(
        "aes-256-cbc",
        keyBuffer3,
        ivBuffer3
      );
      let encrypted3 = cipher3.update(plainData, "utf8", "base64");
      encrypted3 += cipher3.final("base64");
      methods["ascii"] = encrypted3;
    } catch (e) {
      methods["ascii"] = `Error: ${e instanceof Error ? e.message : "Unknown"}`;
    }

    // Method 4: binary encoding
    try {
      const keyBuffer4 = Buffer.from(encKey, "binary");
      const ivBuffer4 = Buffer.from(encIV, "binary");
      const cipher4 = crypto.createCipheriv(
        "aes-256-cbc",
        keyBuffer4,
        ivBuffer4
      );
      let encrypted4 = cipher4.update(plainData, "utf8", "base64");
      encrypted4 += cipher4.final("base64");
      methods["binary"] = encrypted4;
    } catch (e) {
      methods["binary"] = `Error: ${
        e instanceof Error ? e.message : "Unknown"
      }`;
    }

    // Test with default test keys to verify encryption implementation works
    try {
      const testKeyBuffer = Buffer.from(testEncKey, "latin1");
      const testIVBuffer = Buffer.from(testEncIV, "latin1");
      const testCipher = crypto.createCipheriv(
        "aes-256-cbc",
        testKeyBuffer,
        testIVBuffer
      );
      let testEncrypted = testCipher.update(testPlainData, "utf8", "base64");
      testEncrypted += testCipher.final("base64");
      testMethods["withTestKeys"] = testEncrypted;
      testMethods["testExpected"] = testExpectedEncData;
      testMethods["testMatches"] = (
        testEncrypted === testExpectedEncData
      ).toString();
    } catch (e) {
      testMethods["withTestKeys"] = `Error: ${
        e instanceof Error ? e.message : "Unknown"
      }`;
    }

    // Check which method matches
    const matchingMethod = Object.entries(methods).find(
      ([_, value]) => value === expectedEncData
    );

    return NextResponse.json({
      success: !!matchingMethod,
      matchingMethod: matchingMethod ? matchingMethod[0] : null,
      expectedEncData,
      methods,
      testWithDefaultKeys: testMethods,
      encryptionKeys: {
        encKeyLength: encKey.length,
        encKeyPrefix: encKey.substring(0, 4),
        encKeySuffix: encKey.substring(encKey.length - 4),
        encIVLength: encIV.length,
        encIVPrefix: encIV.substring(0, 4),
        encIVSuffix: encIV.substring(encIV.length - 4),
      },
      conclusion: matchingMethod
        ? `✅ Found matching method: ${matchingMethod[0]}`
        : "❌ No method matches. The encryption keys might not match the test data, or there's a different encryption requirement.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
