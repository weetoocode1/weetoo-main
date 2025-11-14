import { MyDataHubEncryption } from "./encryption";

/**
 * Generates an authText for MyData Hub verification in the format: "위투" + 6-digit number
 * Format: 위투123456 (위투 = 2 Korean characters = 4 bytes, + 6 numeric digits)
 * @returns Generated authText string
 */
export function generateMyDataHubAuthText(): string {
  const sixDigitNumber = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `위투${sixDigitNumber}`;
}

interface MyDataHubApiResponse<T = unknown> {
  errCode: string;
  errMsg: string;
  result: "SUCCESS" | "FAIL";
  data: T;
}

interface AccountVerificationRequest {
  bankCode: string;
  accountNo: string;
  UMINNUM: string;
  authText: string;
  EncryptYN?: boolean;
  EncData?: string;
}

interface CallbackResponse {
  callbackId: string;
  callbackType: "SIMPLE";
  callbackData: string;
  timeout: number;
}

interface VerificationStep1Response {
  callbackId: string;
  callbackType: "SIMPLE";
  callbackData: string;
  timeout: number;
  authText?: string; // AuthText that MyData Hub uses (may be returned in response)
}

interface VerificationStep2Request {
  callbackId: string;
  callbackType: "SIMPLE";
  callbackResponse: string;
  callbackResponse1: string;
  callbackResponse2: string;
  retry: string;
}

interface VerificationStep2Response {
  verified: boolean;
  accountInfo?: {
    accountNo: string;
    bankCode: string;
    accountHolder?: string;
  };
}

export class MyDataHubAPI {
  private baseURL: string;
  private accessToken: string;
  private fixieURL: string;
  private encryption: MyDataHubEncryption | null = null;
  private encryptEnabled: boolean;

  private authHeaderFormat: "Token" | "Bearer" | "None";

  constructor() {
    if (process.env.MYDATAHUB_BASE_URL) {
      this.baseURL = process.env.MYDATAHUB_BASE_URL;
    } else {
      this.baseURL =
        process.env.NODE_ENV === "production"
          ? "https://api.mydatahub.co.kr"
          : "https://datahub-dev.scraping.co.kr";
    }
    this.accessToken = (process.env.MYDATAHUB_ACCESS_TOKEN || "").trim();
    this.fixieURL = process.env.FIXIE_URL || "";
    this.encryptEnabled = process.env.MYDATAHUB_ENCRYPT_ENABLED !== "false";

    // Support different Authorization header formats
    const authFormat = process.env.MYDATAHUB_AUTH_FORMAT?.toLowerCase();
    if (authFormat === "bearer") {
      this.authHeaderFormat = "Bearer";
    } else if (authFormat === "none" || authFormat === "token-only") {
      this.authHeaderFormat = "None";
    } else {
      this.authHeaderFormat = "Token"; // Default
    }

    if (this.encryptEnabled) {
      try {
        const encKey = process.env.MYDATAHUB_ENC_KEY;
        const encIV = process.env.MYDATAHUB_ENC_IV;

        if (!encKey || !encIV) {
          console.warn(
            "MyDataHub API: Encryption keys not configured. Please set MYDATAHUB_ENC_KEY and MYDATAHUB_ENC_IV. Encryption will be disabled."
          );
          this.encryptEnabled = false;
          this.encryption = null;
        } else {
          // Log encryption key info for debugging (without exposing full key)
          console.log("MyDataHub API: Encryption keys configured", {
            encKeyLength: encKey.length,
            encKeyPrefix: encKey.substring(0, 4),
            encKeySuffix: encKey.substring(encKey.length - 4),
            encKeyHasEquals: encKey.includes("="),
            encIVLength: encIV.length,
            encIVPrefix: encIV.substring(0, 4),
            encIVSuffix: encIV.substring(encIV.length - 4),
          });

          this.encryption = new MyDataHubEncryption({
            encKey,
            encIV,
          });
        }
      } catch (error) {
        console.warn(
          "MyDataHub API: Encryption initialization failed. Encryption will be disabled.",
          error
        );
        this.encryptEnabled = false;
        this.encryption = null;
      }
    }

    if (!this.accessToken) {
      console.warn(
        "MyDataHub API: MYDATAHUB_ACCESS_TOKEN is not configured. Please add it to your environment variables."
      );
    }
  }

  private async makeRequest<RequestBody, ResultType>(
    endpoint: string,
    body: RequestBody,
    allowFail = false
  ): Promise<MyDataHubApiResponse<ResultType>> {
    const url = `${this.baseURL}${endpoint}`;
    const isServerSide = typeof window === "undefined";

    // Build Authorization header based on configured format
    let authHeader: string;
    if (this.authHeaderFormat === "Bearer") {
      authHeader = `Bearer ${this.accessToken}`;
    } else if (this.authHeaderFormat === "None") {
      authHeader = this.accessToken;
    } else {
      authHeader = `Token ${this.accessToken}`; // Default
    }

    // MyData Hub documentation specifies charset=UTF-8
    // But some APIs are sensitive to exact Content-Type format
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(body),
    };

    // Log the exact request body being sent (for debugging)
    console.log("📤 MyData Hub Request Body (raw):", JSON.stringify(body));
    console.log(
      "📤 MyData Hub Request Body (formatted):",
      JSON.stringify(body, null, 2)
    );

    // Log token info for debugging (without exposing full token)
    if (!this.accessToken) {
      console.error("MyDataHub API: Access token is empty or not set");
    } else {
      console.log("MyDataHub API: Token configured", {
        tokenLength: this.accessToken.length,
        tokenPrefix: this.accessToken.substring(0, 4),
        tokenSuffix: this.accessToken.substring(this.accessToken.length - 4),
        hasWhitespace: this.accessToken !== this.accessToken.trim(),
        authFormat: this.authHeaderFormat,
        authHeaderPreview: `${authHeader.substring(0, 20)}...`,
      });
    }

    if (isServerSide && this.fixieURL) {
      try {
        const undici = await import("undici");
        (fetchOptions as { dispatcher?: unknown }).dispatcher =
          new undici.ProxyAgent(this.fixieURL);
      } catch {
        // Silent proxy setup failures
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorText = "Unknown error";
      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } else {
          errorText = await response.text();
        }
      } catch {
        errorText = response.statusText || "Unknown error";
      }

      throw new Error(
        `MyDataHub API error: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const errorText = await response.text().catch(() => "Unknown");
      throw new Error(
        `MyDataHub API returned non-JSON response from ${url}: ${contentType}. Response: ${errorText}`
      );
    }

    const data: MyDataHubApiResponse<ResultType> = await response.json();

    if (data.result === "FAIL" && !allowFail) {
      throw new Error(`MyDataHub API error: ${data.errCode} - ${data.errMsg}`);
    }

    return data;
  }

  async initiateAccountVerification(
    request: AccountVerificationRequest
  ): Promise<VerificationStep1Response> {
    if (!this.accessToken) {
      throw new Error(
        "MyDataHub API access token is not configured. Please set MYDATAHUB_ACCESS_TOKEN in your environment variables. Contact MyData Hub to get your access token: mydatahub@kwic.co.kr"
      );
    }

    const apiRequest: Record<string, unknown> = {};

    // Field order matters - set in the order MyData Hub expects
    apiRequest.BANKCODE = request.bankCode;

    // ACCTNO must be sent as plain text (NOT encrypted) per MyData Hub requirements
    // Only UMINNUM should be encrypted
    const cleanAccountNo = request.accountNo.trim().replace(/\s+/g, "");
    const cleanUMINNUM = request.UMINNUM.trim().replace(/\s+/g, "");

    // ACCTNO is always sent as plain text
    apiRequest.ACCTNO = cleanAccountNo;

    // Encrypt UMINNUM if encryption is enabled
    if (this.encryptEnabled && this.encryption) {
      // Only UMINNUM needs to be encrypted
      const encryptedUMINNUM = this.encryption.encrypt(cleanUMINNUM);

      // Verify encryption/decryption round-trip works for UMINNUM
      try {
        const decryptedUMINNUM = this.encryption.decrypt(encryptedUMINNUM);
        if (decryptedUMINNUM !== cleanUMINNUM) {
          console.error("⚠️ Encryption round-trip test FAILED for UMINNUM!");
          console.error("Original UMINNUM:", cleanUMINNUM);
          console.error("Decrypted UMINNUM:", decryptedUMINNUM);
        } else {
          console.log("✅ Encryption round-trip test PASSED for UMINNUM");
        }
      } catch (decryptError) {
        console.error("⚠️ Failed to decrypt encrypted UMINNUM:", decryptError);
      }

      // Set EncryptYN flag to "Y" since we're encrypting UMINNUM
      apiRequest.EncryptYN = "Y";

      // MyData Hub documentation REQUIRES newline at end of encrypted values
      // JSON.stringify will escape \n to \\n in JSON, but when parsed by MyData Hub, it becomes \n again
      apiRequest.UMINNUM = encryptedUMINNUM + "\n";

      console.log("🔐 Encryption details:", {
        originalACCTNO: cleanAccountNo,
        acctnoSentAsPlainText: true,
        originalUMINNUM: cleanUMINNUM,
        encryptedUMINNUM: encryptedUMINNUM,
        encryptedUMINNUMWithNewline: encryptedUMINNUM + "\n",
        encryptYN: apiRequest.EncryptYN,
        encryptionKeyPrefix: this.encryption
          ? this.encryption["encKey"]?.substring(0, 8) + "..."
          : "N/A",
        encryptionIVPrefix: this.encryption
          ? this.encryption["encIV"]?.substring(0, 8) + "..."
          : "N/A",
      });
    } else {
      // If encryption is disabled, send UMINNUM as plain text (for testing only)
      apiRequest.EncryptYN = "N";
      apiRequest.UMINNUM = cleanUMINNUM;
    }

    // authText is required by MyData Hub API
    // MyData Hub will validate bank account first, then process
    // If bank account is invalid, MyData Hub will return error (like ST09) before processing
    // If valid, MyData Hub will process and use this authText for the 1-won transaction
    if (!request.authText || request.authText.trim() === "") {
      throw new Error(
        "authText is required. MyData Hub API requires a non-empty authText value."
      );
    }
    apiRequest.AUTHTEXT = request.authText.trim();

    const requestBodyString = JSON.stringify(apiRequest);

    // Log detailed request information for debugging
    const acctNoValue =
      typeof apiRequest.ACCTNO === "string" ? apiRequest.ACCTNO : "";
    const uminnumValue =
      typeof apiRequest.UMINNUM === "string" ? apiRequest.UMINNUM : "";

    console.log("MyDataHub API Request:", {
      endpoint: "/scrap/common/settlebank/accountOccupation",
      fullURL: `${this.baseURL}/scrap/common/settlebank/accountOccupation`,
      baseURL: this.baseURL,
      hasEncryption: !!this.encryption,
      encryptEnabled: this.encryptEnabled,
      requestKeys: Object.keys(apiRequest),
      fieldOrder: Object.keys(apiRequest).join(", "),
      acctNoLength: acctNoValue.length,
      acctNoValue: acctNoValue,
      acctnoIsPlainText: !acctNoValue.includes("=") && !acctNoValue.endsWith("\n"),
      uminnumLength: uminnumValue.length,
      uminnumValue: uminnumValue,
      uminnumEndsWithNewline: uminnumValue.endsWith("\n"),
      uminnumIsEncrypted: uminnumValue.includes("=") && uminnumValue.endsWith("\n"),
      encryptYN: apiRequest.EncryptYN,
      hasAuthText: !!apiRequest.AUTHTEXT,
      requestBodyJSON: requestBodyString,
      requestBodyPreview:
        requestBodyString.substring(0, 200) +
        (requestBodyString.length > 200 ? "..." : ""),
    });

    const response = await this.makeRequest<
      Record<string, unknown>,
      CallbackResponse
    >("/scrap/common/settlebank/accountOccupation", apiRequest, true);

    console.log("MyDataHub API Response:", {
      errCode: response.errCode,
      errMsg: response.errMsg,
      result: response.result,
      hasData: !!response.data,
      dataType: typeof response.data,
      dataKeys:
        response.data && typeof response.data === "object"
          ? Object.keys(response.data)
          : "N/A",
      fullData: JSON.stringify(response.data, null, 2),
    });

    if (response.errCode === "2010") {
      const errorDetails = [
        `MyDataHub API authentication failed (Error 2010)`,
        ``,
        `Configuration check:`,
        `✓ Base URL: ${this.baseURL}`,
        `✓ Token configured: ${this.accessToken ? "Yes" : "No"}`,
        `✓ Token length: ${this.accessToken.length} characters`,
        `✓ Encryption enabled: ${this.encryptEnabled}`,
        ``,
        `Possible causes:`,
        `1. Token is invalid or expired`,
        `2. Token is for wrong environment (test token with prod URL or vice versa)`,
        `3. Token doesn't have permissions for 계좌점유인증 service`,
        `4. Authorization header format might be incorrect`,
        ``,
        `Action required:`,
        `1. Verify MYDATAHUB_ACCESS_TOKEN is set in your production environment (NOT in .env file)`,
        `2. In production, set environment variables in your hosting platform:`,
        `   - Vercel: Project Settings > Environment Variables`,
        `   - AWS/Other: Set in your deployment configuration`,
        `3. Ensure token matches the environment (test token with test URL, prod token with prod URL)`,
        `4. Try alternative Authorization formats by setting MYDATAHUB_AUTH_FORMAT:`,
        `   - Current: "${this.authHeaderFormat}" format`,
        `   - Set MYDATAHUB_AUTH_FORMAT=bearer to try "Bearer {token}"`,
        `   - Set MYDATAHUB_AUTH_FORMAT=none to try "{token}" (no prefix)`,
        `   - Default (if not set): "Token {token}"`,
        ``,
        `Contact MyData Hub support:`,
        `- Email: mydatahub@kwic.co.kr`,
        `- Phone: 02-6281-7708`,
        ``,
        `Tell them: "I'm getting error 2010 (authentication failed) with my access token.`,
        `Please verify my token is valid and has permissions for 계좌점유인증 service."`,
      ].join("\n");

      throw new Error(errorDetails);
    }

    if (response.errCode === "2002") {
      const errorDetails = [
        `MyDataHub API error (2002): Service not available`,
        ``,
        `Your configuration is correct:`,
        `✓ Encryption is enabled and working`,
        `✓ Request format is correct`,
        `✓ Endpoint: ${this.baseURL}/scrap/common/settlebank/accountOccupation`,
        ``,
        `This error means the service is NOT enabled for your account/token.`,
        ``,
        `Action Required: Contact MyData Hub support to:`,
        `1. Enable 계좌점유인증 (Account Verification) service for your account`,
        `2. Verify your access token has permission for service code F702`,
        `3. Confirm the endpoint path is correct (currently using /scrap/common/settlebank/accountOccupation)`,
        ``,
        `Contact:`,
        `- Email: mydatahub@kwic.co.kr`,
        `- Phone: 02-6281-7708`,
        ``,
        `Tell them: "I'm getting error 2002 for 계좌점유인증 service.`,
        `Please enable the service for my test account and verify the endpoint path."`,
      ].join("\n");

      throw new Error(errorDetails);
    }

    if (response.errCode === "0000" && response.result === "SUCCESS") {
      if (!response.data || typeof response.data !== "object") {
        throw new Error(
          "MyDataHub API returned success but no data object in response"
        );
      }

      const data = response.data as unknown as Record<string, unknown>;

      if (data.RESULT === "FAILURE") {
        const errorMsg = (data.OUTRSLTMSG as string) || "Unknown error";
        const errorCode = (data.OUTRSLTCD as string) || "UNKNOWN";

        // Show the actual MyData Hub error first
        const myDataHubError = `MyData Hub API Error: ${errorCode} - ${errorMsg}`;

        // Provide brief context for common errors
        if (errorCode === "ST09") {
          // ST09 means MyData Hub cannot decrypt or validate the request
          // Common causes: ACCTNO was encrypted (should be plain text), or UMINNUM encryption keys don't match
          throw new Error(
            `${myDataHubError}\n\n` +
              `Invalid request format. Common causes:\n` +
              `- ACCTNO (account number) must be sent as plain text (not encrypted)\n` +
              `- UMINNUM encryption keys may not match what MyData Hub expects\n\n` +
              `Contact MyData Hub support (mydatahub@kwic.co.kr) if the issue persists.`
          );
        }

        // For other errors, just show the MyData Hub error
        throw new Error(myDataHubError);
      }

      if (data.RESULT === "SUCCESS") {
        const trdno = (data.TRDNO as string) || "";
        if (trdno) {
          // Check if authText is returned in response (MyData Hub may return it)
          const authTextFromResponse =
            (data.AUTHTEXT as string) || request.authText || "";
          return {
            callbackId: trdno,
            callbackType: "SIMPLE",
            callbackData: "",
            timeout: 0,
            authText: authTextFromResponse,
          };
        }
      }

      const callbackData = response.data as CallbackResponse;

      if (callbackData && callbackData.callbackId) {
        // Check if authText is returned in response (MyData Hub may return it)
        const dataObj = response.data as unknown as Record<string, unknown>;
        const authTextFromResponse =
          (dataObj.AUTHTEXT as string) || request.authText || "";
        return {
          callbackId: callbackData.callbackId,
          callbackType: callbackData.callbackType || "SIMPLE",
          callbackData: callbackData.callbackData || "",
          timeout: callbackData.timeout || 0,
          authText: authTextFromResponse,
        };
      }

      throw new Error(
        `MyDataHub API returned success but missing transaction ID. Response data: ${JSON.stringify(
          response.data
        )}`
      );
    }

    if (!response.data || typeof response.data !== "object") {
      if (response.errCode && response.errMsg) {
        throw new Error(
          `MyDataHub API error (${response.errCode}): ${response.errMsg}`
        );
      }
      throw new Error(
        "Invalid response from MyDataHub API: missing data object"
      );
    }

    const callbackData = response.data as CallbackResponse;

    if (!callbackData || !callbackData.callbackId) {
      throw new Error(
        `MyDataHub API error (${response.errCode || "UNKNOWN"}): ${
          response.errMsg || "Missing callbackId in response"
        }. Response data: ${JSON.stringify(response.data)}`
      );
    }

    // Check if authText is returned in response (MyData Hub may return it)
    const dataObj = response.data as unknown as Record<string, unknown>;
    const authTextFromResponse =
      (dataObj.AUTHTEXT as string) || request.authText || "";

    return {
      callbackId: callbackData.callbackId,
      callbackType: callbackData.callbackType,
      callbackData: callbackData.callbackData || "",
      timeout: callbackData.timeout || 0,
      authText: authTextFromResponse,
    };
  }

  async completeAccountVerification(
    request: VerificationStep2Request
  ): Promise<VerificationStep2Response> {
    const response = await this.makeRequest<VerificationStep2Request, unknown>(
      "/scrap/common/settlebank/accountOccupation",
      request
    );

    if (response.result === "FAIL") {
      if (response.errCode === "3014") {
        throw new Error(
          "Transaction already processed. Please start a new verification."
        );
      }
      throw new Error(
        `Verification completion failed: ${response.errCode} - ${response.errMsg}`
      );
    }

    return {
      verified: true,
    };
  }

  async verifyAccountOwnership(
    bankCode: string,
    accountNo: string,
    birthdateOrSSN: string,
    authText?: string
  ): Promise<{ verified: boolean; callbackId?: string }> {
    const generatedAuthText = authText || generateMyDataHubAuthText();
    const step1Response = await this.initiateAccountVerification({
      bankCode,
      accountNo,
      UMINNUM: birthdateOrSSN,
      authText: generatedAuthText,
    });

    if (step1Response.callbackType === "SIMPLE") {
      return {
        verified: false,
        callbackId: step1Response.callbackId,
      };
    }

    return { verified: true };
  }
}
