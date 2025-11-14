"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMyDataHubVerification } from "@/hooks/use-mydatahub-verification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MyDataHubVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess?: () => void;
  bankCode?: string;
  accountNo?: string;
}

const BANK_CODES: Record<string, string> = {
  "001": "한국은행",
  "002": "산업은행",
  "003": "기업은행",
  "004": "KB국민은행",
  "011": "NH농협은행",
  "020": "우리은행",
  "023": "SC제일은행",
  "027": "한국씨티은행",
  "032": "대구은행",
  "034": "광주은행",
  "037": "전북은행",
  "039": "경남은행",
  "045": "새마을금고",
  "048": "신협",
  "050": "상호저축은행",
  "052": "모건스탠리",
  "054": "HSBC",
  "055": "도이치은행",
  "056": "ABN암로",
  "057": "JP모건",
  "058": "미즈호은행",
  "059": "UFJ",
  "060": "BOA",
  "061": "비엔피파리바",
  "062": "중국공상은행",
  "063": "중국은행",
  "064": "산림조합",
  "065": "대화은행",
  "071": "정보통신부",
  "081": "하나은행",
  "088": "신한은행",
  "090": "카카오뱅크",
  "092": "토스뱅크",
  "102": "대신증권",
  "103": "한미증권",
  "104": "한국투자증권",
  "105": "미래에셋증권",
  "106": "대우증권",
  "107": "삼성증권",
  "108": "교보증권",
  "109": "하나증권",
  "110": "현대증권",
  "111": "SK증권",
  "112": "신한금융투자",
  "113": "NH투자증권",
  "114": "KB증권",
  "115": "유진투자증권",
  "116": "메리츠증권",
  "117": "키움증권",
  "118": "이베스트투자증권",
  "119": "카카오페이증권",
  "120": "토스증권",
  "130": "KDB산업은행",
  "131": "IBK기업은행",
  "132": "NH농협은행",
  "133": "하나은행",
  "134": "신한은행",
  "135": "KB국민은행",
  "136": "우리은행",
  "137": "SC제일은행",
  "138": "한국씨티은행",
  "139": "대구은행",
  "140": "광주은행",
  "141": "전북은행",
  "142": "경남은행",
  "143": "새마을금고",
  "144": "신협",
  "145": "상호저축은행",
  "150": "카카오뱅크",
  "152": "토스뱅크",
};

export function MyDataHubVerificationDialog({
  isOpen,
  onClose,
  onVerificationSuccess,
  bankCode: initialBankCode,
  accountNo: initialAccountNo,
}: MyDataHubVerificationDialogProps) {
  const [bankCode, setBankCode] = useState(initialBankCode || "");
  const [accountNo, setAccountNo] = useState(initialAccountNo || "");
  const [birthdateOrSSN, setBirthdateOrSSN] = useState("");
  const [authText, setAuthText] = useState("");
  const [callbackResponse, setCallbackResponse] = useState("");
  
  // Start at birthdate step if bank code and account number are provided
  const initialStep = initialBankCode && initialAccountNo ? "birthdate" : "account-info";
  const [step, setStep] = useState<
    "account-info" | "birthdate" | "auth-text" | "complete"
  >(initialStep);

  const {
    initiateVerification,
    completeVerification,
    callbackId,
    resetCallbackId,
  } = useMyDataHubVerification();

  const handleClose = () => {
    setBankCode(initialBankCode || "");
    setAccountNo(initialAccountNo || "");
    setBirthdateOrSSN("");
    setAuthText("");
    setCallbackResponse("");
    setStep(initialBankCode && initialAccountNo ? "birthdate" : "account-info");
    resetCallbackId();
    onClose();
  };

  // Update step when dialog opens with provided bank code and account number
  useEffect(() => {
    if (isOpen && initialBankCode && initialAccountNo) {
      setBankCode(initialBankCode);
      setAccountNo(initialAccountNo);
      setStep("birthdate");
    } else if (isOpen && !initialBankCode && !initialAccountNo) {
      setStep("account-info");
    }
  }, [isOpen, initialBankCode, initialAccountNo]);

  const handleAccountInfoSubmit = () => {
    if (!bankCode || !accountNo) {
      return;
    }
    setStep("birthdate");
  };

  const handleBirthdateSubmit = async () => {
    if (
      !birthdateOrSSN ||
      (birthdateOrSSN.length !== 8 && birthdateOrSSN.length !== 13)
    ) {
      return;
    }
    try {
      const result = await initiateVerification.mutateAsync({
        bankCode,
        accountNo,
        birthdateOrSSN,
      });
      if (result.authText) {
        setAuthText(result.authText);
      }
      if (result.callbackId) {
        setStep("auth-text");
      }
    } catch (_error) {
      // Error will be shown in the error banner
    }
  };

  const handleCompleteVerification = async () => {
    if (!callbackId || !callbackResponse) {
      return;
    }

    try {
      const result = await completeVerification.mutateAsync({
        callbackId,
        callbackResponse,
      });

      if (result.verified) {
        setStep("complete");
        setTimeout(() => {
          onVerificationSuccess?.();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Verification completion error:", error);
    }
  };

  const isLoading =
    initiateVerification.isPending || completeVerification.isPending;

  const bankName = BANK_CODES[bankCode] || bankCode;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Verification</DialogTitle>
          <DialogDescription>
            {step === "account-info"
              ? "Enter your account information to start verification"
              : step === "birthdate"
              ? `Verify your ${bankName} account (${accountNo}) using 1-won authentication. Enter your birthdate or SSN to continue.`
              : step === "auth-text"
              ? `Complete authentication for your ${bankName} account. Enter the authentication response code.`
              : "Verification complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "account-info" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bank-code">Bank Code</Label>
                <Input
                  id="bank-code"
                  value={bankCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 3) setBankCode(value);
                  }}
                  placeholder="e.g., 004 for KB국민은행"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground">
                  Enter 3-digit bank code (e.g., 004, 088, 020)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-no">Account Number</Label>
                <Input
                  id="account-no"
                  value={accountNo}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 20) {
                      setAccountNo(value);
                    }
                  }}
                  placeholder="Enter your account number"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your bank account number
                </p>
              </div>

              <Button
                onClick={handleAccountInfoSubmit}
                disabled={!bankCode || !accountNo}
                className="w-full"
              >
                Continue
              </Button>
            </>
          )}

          {step === "birthdate" && (
            <>
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Bank Code
                    </Label>
                    <Input value={bankCode} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Account Number
                    </Label>
                    <Input value={accountNo} disabled className="bg-muted" />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="birthdate-ssn">
                  Birthdate (8 digits) or SSN (13 digits)
                </Label>
                <Input
                  id="birthdate-ssn"
                  value={birthdateOrSSN}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 13) {
                      setBirthdateOrSSN(value);
                    }
                  }}
                  placeholder="YYYYMMDD or 13-digit SSN"
                  maxLength={13}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your 8-digit birthdate (YYYYMMDD) or 13-digit SSN
                </p>
              </div>

              <Button
                onClick={handleBirthdateSubmit}
                disabled={
                  isLoading ||
                  !birthdateOrSSN ||
                  (birthdateOrSSN.length !== 8 && birthdateOrSSN.length !== 13)
                }
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              {initiateVerification.isError && (
                <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    {initiateVerification.error instanceof Error
                      ? initiateVerification.error.message
                      : "Failed to initiate verification"}
                  </p>
                </div>
              )}
            </>
          )}

          {step === "auth-text" && (
            <>
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Bank Code
                    </Label>
                    <Input value={bankCode} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Account Number
                    </Label>
                    <Input value={accountNo} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Birthdate/SSN
                    </Label>
                    <Input
                      value={birthdateOrSSN}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>

              {authText && (
                <div className="space-y-2">
                  <Label>Authentication Text (provided)</Label>
                  <Input
                    value={authText}
                    disabled
                    className="bg-muted font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    This text appears in your bank transaction memo. Continue
                    after noting it.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="callback-response">
                  Authentication Response
                </Label>
                <Input
                  id="callback-response"
                  value={callbackResponse}
                  onChange={(e) => setCallbackResponse(e.target.value)}
                  placeholder="Enter authentication response"
                />
                <p className="text-xs text-muted-foreground">
                  After completing authentication, enter the response code here
                </p>
              </div>

              <Button
                onClick={handleCompleteVerification}
                disabled={isLoading || !callbackResponse}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Complete Verification"
                )}
              </Button>

              {completeVerification.isError && (
                <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    {completeVerification.error instanceof Error
                      ? completeVerification.error.message
                      : "Failed to complete verification"}
                  </p>
                </div>
              )}
            </>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">
                  Verification Successful!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your account has been verified successfully.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
