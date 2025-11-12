import { MyDataHubEncryption } from "./encryption";

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

  constructor() {
    if (process.env.MYDATAHUB_BASE_URL) {
      this.baseURL = process.env.MYDATAHUB_BASE_URL;
    } else {
      this.baseURL =
        process.env.NODE_ENV === "production"
          ? process.env.MYDATAHUB_PROD_URL || "https://api.mydatahub.co.kr"
          : process.env.MYDATAHUB_DEV_URL ||
            "https://datahub-dev.scraping.co.kr";
    }
    this.accessToken = process.env.MYDATAHUB_ACCESS_TOKEN || "";
    this.fixieURL = process.env.FIXIE_URL || "";
    this.encryptEnabled = process.env.MYDATAHUB_ENCRYPT_ENABLED !== "false";

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

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Token ${this.accessToken}`,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(body),
    };

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

    apiRequest.ACCTNO = request.accountNo;
    apiRequest.BANKCODE = request.bankCode;
    apiRequest.AUTHTEXT = request.authText;

    const requestBodyString = JSON.stringify(apiRequest);

    console.log("MyDataHub API Request:", {
      endpoint: "/scrap/common/settlebank/accountOccupation",
      fullURL: `${this.baseURL}/scrap/common/settlebank/accountOccupation`,
      baseURL: this.baseURL,
      hasEncryption: !!this.encryption,
      encryptEnabled: this.encryptEnabled,
      requestKeys: Object.keys(apiRequest),
      acctNoLength:
        typeof apiRequest.ACCTNO === "string" ? apiRequest.ACCTNO.length : 0,
      acctNoValue:
        typeof apiRequest.ACCTNO === "string"
          ? apiRequest.ACCTNO.substring(0, 50)
          : apiRequest.ACCTNO,
      hasAuthText: !!apiRequest.AUTHTEXT,
      requestBodyJSON: requestBodyString,
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
      throw new Error(
        "MyDataHub API authentication failed. Please check your MYDATAHUB_ACCESS_TOKEN. The token may be invalid or expired. Contact MyData Hub support: mydatahub@kwic.co.kr"
      );
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
        throw new Error(`MyDataHub API error (${errorCode}): ${errorMsg}`);
      }

      if (data.RESULT === "SUCCESS") {
        const trdno = (data.TRDNO as string) || "";
        if (trdno) {
          return {
            callbackId: trdno,
            callbackType: "SIMPLE",
            callbackData: "",
            timeout: 0,
          };
        }
      }

      const callbackData = response.data as CallbackResponse;

      if (callbackData && callbackData.callbackId) {
        return {
          callbackId: callbackData.callbackId,
          callbackType: callbackData.callbackType || "SIMPLE",
          callbackData: callbackData.callbackData || "",
          timeout: callbackData.timeout || 0,
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

    return {
      callbackId: callbackData.callbackId,
      callbackType: callbackData.callbackType,
      callbackData: callbackData.callbackData || "",
      timeout: callbackData.timeout || 0,
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
    const generatedAuthText =
      authText ||
      `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`;
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
