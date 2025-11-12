import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface VerifyAccountRequest {
  bankCode: string;
  accountNo: string;
  birthdateOrSSN: string;
  callbackId?: string;
  callbackResponse?: string;
}

interface VerifyAccountResponse {
  success: boolean;
  verified?: boolean;
  callbackId?: string;
  callbackType?: string;
  timeout?: number;
  authText?: string;
  message?: string;
  error?: string;
}

export function useMyDataHubVerification() {
  const [callbackId, setCallbackId] = useState<string | null>(null);

  const initiateVerification = useMutation({
    mutationFn: async (data: {
      bankCode: string;
      accountNo: string;
      birthdateOrSSN: string;
      authText?: string;
    }): Promise<VerifyAccountResponse> => {
      const response = await fetch("/api/mydatahub/verify-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        const helpText = errorData.help || errorData.details;
        throw new Error(helpText ? `${errorMessage}. ${helpText}` : errorMessage);
      }

      const result = await response.json();
      if (result.callbackId) {
        setCallbackId(result.callbackId);
      }
      return result;
    },
  });

  const completeVerification = useMutation({
    mutationFn: async (data: {
      callbackId: string;
      callbackResponse: string;
    }): Promise<VerifyAccountResponse> => {
      const response = await fetch("/api/mydatahub/verify-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankCode: "",
          accountNo: "",
          birthdateOrSSN: "",
          callbackId: data.callbackId,
          callbackResponse: data.callbackResponse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        const helpText = errorData.help || errorData.details;
        throw new Error(helpText ? `${errorMessage}. ${helpText}` : errorMessage);
      }

      const result = await response.json();
      if (result.verified) {
        setCallbackId(null);
      }
      return result;
    },
  });

  return {
    initiateVerification,
    completeVerification,
    callbackId,
    resetCallbackId: () => setCallbackId(null),
  };
}

