"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// PortOne SDK types
interface PortOneSDK {
  requestIdentityVerification: (
    options: IdentityVerificationOptions
  ) => Promise<IdentityVerificationResponse>;
}

interface IdentityVerificationOptions {
  storeId: string;
  identityVerificationId: string;
  channelKey: string;
  customer: {
    phoneNumber?: string;
  };
}

interface IdentityVerificationResponse {
  code?: string;
  message?: string;
  pgCode?: string;
  pgMessage?: string;
  transactionType?: string;
  identityVerificationId?: string;
  identityVerificationTxId?: string;
  mobileNumber?: string;
  phoneNumber?: string;
  mobile?: string;
  phone?: string;
  userData?: {
    mobileNumber?: string;
    phoneNumber?: string;
  };
}

// Verification data types
interface VerificationData {
  data?: {
    verifiedCustomer?: {
      name?: string;
      birthDate?: string;
      gender?: string;
      phoneNumber?: string;
      mobile?: string;
      phone?: string;
      tel?: string;
      hp?: string;
    };
    pgRawResponse?: string;
    channel?: {
      mobile?: string;
      phone?: string;
      contact?: string;
    };
  };
}

interface UserData {
  name: string | null;
  birthDate: string | null;
  gender: string | null;
  mobileNumber: string | null;
  isForeigner: boolean;
}

declare global {
  interface Window {
    PortOne: PortOneSDK;
  }
}

interface IdentityVerificationButtonProps {
  isFormValid: boolean;
  mobileNumber: string;
  text?: string; // Optional text prop for custom button text
  className?: string; // Optional className prop for custom styling
  storeInDatabase?: boolean; // Whether to store verification in database immediately
  onVerificationSuccess: (
    verificationData: VerificationData,
    userData: UserData
  ) => void;
  onVerificationFailure: () => void;
}

// Function to extract mobile number from pgRawResponse
// const extractMobileNumberFromPgResponse = (
//   pgRawResponse: string | undefined
// ): string | null => {
//   if (!pgRawResponse) return null;

//   const params = new URLSearchParams(pgRawResponse);

//   const mobileNumber =
//     params.get("MOBILE") ||
//     params.get("PHONE") ||
//     params.get("TEL") ||
//     params.get("CELL") ||
//     params.get("MOBILENO") ||
//     params.get("PHONENO");

//   return mobileNumber;
// };

// API function for storing verification status
const storeVerificationStatus = async (data: {
  identityVerificationId: string;
  identityVerificationTxId: string;
  verificationData: VerificationData;
}) => {
  const response = await fetch("/api/store-identity-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to store verification");
  }

  return response.json();
};

export function IdentityVerificationButton({
  isFormValid,
  mobileNumber,
  text = "Verify Identity", // Default text if not provided
  className = "", // Default empty className
  storeInDatabase = true, // Default to true for backward compatibility
  onVerificationSuccess,
  onVerificationFailure,
}: IdentityVerificationButtonProps) {
  const t = useTranslations("identityVerification");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [, setVerificationData] = useState<VerificationData | null>(null);
  const [, setUserData] = useState<UserData | null>(null);
  // const queryClient = useQueryClient();

  // Remove the mutation since we're not storing to DB yet
  // const storeVerificationMutation = useMutation({...});

  useEffect(() => {
    const checkSDK = () => {
      if (window.PortOne) {
        setIsSDKLoaded(true);
      } else {
        // Retry after a short delay
        const timeoutId = setTimeout(checkSDK, 100);
        return () => clearTimeout(timeoutId);
      }
    };
    checkSDK();
  }, []);

  const handleIdentityVerification = async () => {
    if (!isSDKLoaded) {
      toast.error(t("errors.sdkLoading"));
      return;
    }

    setIsLoading(true);
    setLoadingStep(t("steps.initializing"));

    try {
      // Generate identity verification ID
      const identityVerificationId = `identity-verification-${crypto.randomUUID()}`;
      setLoadingStep(t("steps.requesting"));

      // Request PortOne identity verification
      const response = await window.PortOne.requestIdentityVerification({
        // Actual storeId
        storeId: "store-674a4cd3-cfd1-4fa1-a9a9-cc44d9952b18",
        identityVerificationId,
        // Actual channelKey
        channelKey: "channel-key-7aa52b4d-bc75-40e8-8d29-f703908427d6",
        // Include customer data for verification (but won't be returned)
        customer: {
          phoneNumber: mobileNumber.replace(/\D/g, "") || undefined,
        },
      });

      // Error code exists if the process is not completed properly
      if (response.code !== undefined) {
        let errorMessage = t("errors.generic");

        // Add more specific error handling for user-friendly messages
        if (response.code === "USER_CANCEL") {
          errorMessage = t("errors.userCancel");
        } else if (response.code === "TIMEOUT") {
          errorMessage = t("errors.timeout");
        } else if (response.code === "NETWORK_ERROR") {
          errorMessage = t("errors.network");
        }

        console.error("Identity verification error:", {
          code: response.code,
          message: response.message,
          pgCode: response.pgCode,
          pgMessage: response.pgMessage,
        });

        toast.error(errorMessage);
        setIsVerified(false);
        onVerificationFailure();
        return;
      }

      // Log successful response for debugging
      console.log("Identity verification response:", {
        transactionType: response.transactionType,
        identityVerificationId: response.identityVerificationId,
        identityVerificationTxId: response.identityVerificationTxId,
      });

      setLoadingStep(t("steps.verifying"));

      // Verify verification result on server
      const verificationResult = await fetch("/api/identity-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityVerificationId,
        }),
      });

      // Check if response is JSON
      const contentType = verificationResult.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await verificationResult.text();
        console.error("Non-JSON response received:", errorText);
        toast.error(t("errors.invalidResponse"));
        setIsVerified(false);
        onVerificationFailure();
        return;
      }

      if (verificationResult.ok) {
        // Store verification data temporarily (not in DB yet)
        const verificationData = await verificationResult.json();

        // Debug logging to see the actual data structure
        console.log("Full verification response:", verificationData);
        console.log(
          "Verified customer data:",
          verificationData.data?.verifiedCustomer
        );
        console.log("PortOne response:", response);
        console.log("Raw pg response:", verificationData.data?.pgRawResponse);

        // Check PortOne response for mobile number
        console.log("8. PortOne response keys:", Object.keys(response));
        console.log("9. PortOne response full:", response);

        // Check all possible locations for mobile number
        console.log("=== MOBILE NUMBER SEARCH ===");
        console.log("1. pgRawResponse:", verificationData.data?.pgRawResponse);
        console.log(
          "2. verifiedCustomer:",
          verificationData.data?.verifiedCustomer
        );
        console.log("3. channel:", verificationData.data?.channel);
        console.log(
          "4. Full data object keys:",
          Object.keys(verificationData.data || {})
        );
        console.log(
          "5. verifiedCustomer keys:",
          Object.keys(verificationData.data?.verifiedCustomer || {})
        );

        // Try to find mobile number in various locations
        let foundMobileNumber = null;

        // Method 1: Parse pgRawResponse
        if (verificationData.data?.pgRawResponse) {
          const params = new URLSearchParams(
            verificationData.data.pgRawResponse
          );
          console.log(
            "6. All pgRawResponse params:",
            Array.from(params.entries())
          );

          // Check for mobile number in various possible formats
          foundMobileNumber =
            params.get("MOBILE") ||
            params.get("PHONE") ||
            params.get("TEL") ||
            params.get("CELL") ||
            params.get("MOBILENO") ||
            params.get("PHONENO") ||
            params.get("HP") || // Korean for mobile
            params.get("MOBILE_NO") ||
            params.get("PHONE_NO");
        }

        // Method 2: Check verifiedCustomer object
        if (!foundMobileNumber && verificationData.data?.verifiedCustomer) {
          foundMobileNumber =
            verificationData.data.verifiedCustomer.phoneNumber ||
            verificationData.data.verifiedCustomer.mobile ||
            verificationData.data.verifiedCustomer.phone ||
            verificationData.data.verifiedCustomer.tel ||
            verificationData.data.verifiedCustomer.hp;
        }

        // Method 3: Check channel object
        if (!foundMobileNumber && verificationData.data?.channel) {
          foundMobileNumber =
            verificationData.data.channel.mobile ||
            verificationData.data.channel.phone ||
            verificationData.data.channel.contact;
        }

        // Method 4: Check PortOne response for additional user data
        if (!foundMobileNumber && response) {
          console.log("10. Checking PortOne response for user data...");
          // Sometimes PortOne stores additional user data that's not in the verification response
          foundMobileNumber =
            response.mobileNumber ||
            response.phoneNumber ||
            response.mobile ||
            response.phone ||
            response.userData?.mobileNumber ||
            response.userData?.phoneNumber;
        }

        console.log("7. Found mobile number:", foundMobileNumber);

        // Since PortOne doesn't return mobile number, use the one from the form
        if (!foundMobileNumber && mobileNumber.trim()) {
          foundMobileNumber = mobileNumber.trim();
          console.log("8. Using mobile number from form:", foundMobileNumber);
        }

        // If still no mobile number, let's check if we need to request it separately
        if (!foundMobileNumber) {
          console.log(
            "11. No mobile number found in response. Checking if we need to request user info..."
          );
          // You might need to make an additional API call to get user details
          // This depends on your PortOne setup
        }

        // Extract user information from verification data
        const extractedUserData = {
          name: verificationData.data?.verifiedCustomer?.name || null,
          birthDate: verificationData.data?.verifiedCustomer?.birthDate || null,
          gender: verificationData.data?.verifiedCustomer?.gender || null,
          mobileNumber: foundMobileNumber || mobileNumber.trim() || null,
          isForeigner: false, // Default to false for Korean users
        };

        console.log("Extracted user data:", extractedUserData);
        console.log("Mobile number extracted:", extractedUserData.mobileNumber);
        console.log("Raw pg response:", verificationData.data?.pgRawResponse);

        // Store the verification data locally
        setVerificationData(verificationData);
        setUserData(extractedUserData);

        // Mark as verified locally
        setIsVerified(true);

        // Store verification status in database if requested
        if (storeInDatabase) {
          try {
            await storeVerificationStatus({
              identityVerificationId,
              identityVerificationTxId:
                response.identityVerificationTxId || identityVerificationId,
              verificationData,
            });

            // Pass verification data and user data to parent component
            onVerificationSuccess(verificationData, extractedUserData);

            toast.success(t("toast.success"));
          } catch (storeError) {
            console.error("Failed to store verification status:", storeError);
            toast.error(t("errors.saveFailed"));
            setIsVerified(false);
            onVerificationFailure();
            return;
          }
        } else {
          // Just pass the data to parent component without storing in database
          onVerificationSuccess(verificationData, extractedUserData);
          toast.success(t("toast.success"));
        }
      } else {
        // Only show error if verification failed, don't duplicate error messages
        const verificationData = await verificationResult.json();
        console.error("Verification failed:", verificationData);
        setIsVerified(false);
        onVerificationFailure();
        // Don't show toast here since onVerificationFailure will handle it
      }
    } catch (error) {
      console.error("Error during identity verification:", error);
      // Don't show toast here since onVerificationFailure will handle it
      setIsVerified(false);
      onVerificationFailure();
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <Button
      onClick={handleIdentityVerification}
      disabled={!isFormValid || isLoading || !isSDKLoaded}
      className={cn(
        "w-full h-12 mb-2",
        text === "Verification Needed",
        className
      )}
    >
      {!isSDKLoaded ? (
        t("button.loadingSdk")
      ) : !isFormValid ? (
        t("button.fillForm")
      ) : isLoading ? (
        loadingStep
      ) : isVerified ? (
        t("button.verified")
      ) : text === "Verification Needed" ? (
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t("button.verificationNeeded")}
          </span>
        </div>
      ) : (
        text
      )}
    </Button>
  );
}
