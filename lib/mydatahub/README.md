# MyData Hub API Integration

## Overview

This integration implements the **MyData Hub (MDH) 1-Won Authentication API** for automatic bank account verification. Instead of manually sending a verification amount to users, this API initiates a 1-won transaction through the bank's system to verify account ownership.

## What It's Used For

- **Automatic Bank Account Verification**: Verify that a user owns a bank account without manual intervention
- **Korean Financial Services**: Specifically designed for Korean banks and financial institutions
- **Secure Authentication**: Uses bank's own authentication system (간편인증 - Simple Authentication)
- **Compliance**: Meets Korean financial regulations for account verification

## How It Works

### Two-Step Process

1. **Step 1 - Initiate Verification**: 
   - Send bank code, account number, and birthdate/SSN
   - API returns a `callbackId` that requires user authentication
   - User must complete authentication through their bank (popup, SMS, etc.)

2. **Step 2 - Complete Verification**:
   - After user completes authentication, submit the `callbackResponse`
   - API verifies the account ownership
   - Account is marked as verified

## Encryption

The MyData Hub API requires **AES-256-CBC encryption** with PKCS5Padding for sensitive fields (`accountNo` and `UMINNUM`). This is automatically handled by the implementation.

### Encryption Test

To verify your encryption implementation is correct, you can test it:

```typescript
import { MyDataHubEncryption } from "@/lib/mydatahub/encryption";

// Test encryption/decryption
const result = MyDataHubEncryption.testEncryption();
console.log(result); // Should output: ✅ AES256 encryption/decryption test passed!
```

**Test Data** (from MyData Hub):
- PlainData: `!Kwic123테스트`
- EncData: `sYywhiLgrPx/rPGBjDUKetZYMNYzTi9PCOW+2MGtu28=`
- EncKey: `wjkCCW@v@53ASqWLAAjV@wvvqLt5jtRU`
- EncIV: `9FLCCv@C5jRCSRCA`

## Setup

### 1. Environment Variables

Add to your `.env.local` or `.env`:

```bash
# MyData Hub API Configuration
MYDATAHUB_ACCESS_TOKEN=your_access_token_here

# Encryption Configuration (Required for test environment)
MYDATAHUB_ENC_KEY=wjkCCW@v@53ASqWLAAjV@wvvqLt5jtRU
MYDATAHUB_ENC_IV=9FLCCv@C5jRCSRCA
MYDATAHUB_ENCRYPT_ENABLED=true

# Optional: Proxy URL (if needed for server-side requests)
FIXIE_URL=your_fixie_url_here
```

**Important**: The encryption keys above are for the **test environment only**. Production environment will have different keys provided by MyData Hub.

### 2. Get Access Token

Contact MyData Hub to get your access token:
- Email: mydatahub@kwic.co.kr
- Tel: 02-6281-7708
- Website: https://mydatahub.co.kr

## Usage Examples

### Using the React Hook

```tsx
import { useMyDataHubVerification } from "@/hooks/use-mydatahub-verification";

function BankVerificationComponent() {
  const {
    initiateVerification,
    completeVerification,
    callbackId,
  } = useMyDataHubVerification();

  const handleStartVerification = async () => {
    try {
      const result = await initiateVerification.mutateAsync({
        bankCode: "004", // KB국민은행
        accountNo: "1234567890",
        birthdateOrSSN: "19900101", // YYYYMMDD format
      });

      if (result.callbackId) {
        // User needs to complete authentication
        console.log("Authentication required:", result.callbackId);
      }
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const handleCompleteVerification = async (callbackResponse: string) => {
    if (!callbackId) return;

    try {
      const result = await completeVerification.mutateAsync({
        callbackId,
        callbackResponse,
      });

      if (result.verified) {
        console.log("Account verified successfully!");
      }
    } catch (error) {
      console.error("Completion failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleStartVerification}>
        Start Verification
      </button>
      {callbackId && (
        <input
          placeholder="Enter authentication response"
          onBlur={(e) => handleCompleteVerification(e.target.value)}
        />
      )}
    </div>
  );
}
```

### Using the Dialog Component

```tsx
import { MyDataHubVerificationDialog } from "@/components/bank-account/mydatahub-verification-dialog";

function BankAccountPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsDialogOpen(true)}>
        Verify Account
      </button>

      <MyDataHubVerificationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onVerificationSuccess={() => {
          console.log("Account verified!");
          // Refresh account list, update UI, etc.
        }}
        bankCode="004"
        accountNo="1234567890"
      />
    </>
  );
}
```

### Using the API Service Directly

```typescript
import { MyDataHubAPI } from "@/lib/mydatahub/mydatahub-api";

const api = new MyDataHubAPI();

// Step 1: Initiate verification
const step1Result = await api.initiateAccountVerification({
  bankCode: "004",
  accountNo: "1234567890",
  UMINNUM: "19900101", // Birthdate or SSN
});

// Step 2: Complete verification (after user authentication)
const step2Result = await api.completeAccountVerification({
  callbackId: step1Result.callbackId,
  callbackType: "SIMPLE",
  callbackResponse: "user_authentication_response",
  callbackResponse1: "",
  callbackResponse2: "",
  retry: "",
});
```

## Bank Codes

Common Korean bank codes:

- `001`: 한국은행
- `004`: KB국민은행
- `011`: NH농협은행
- `020`: 우리은행
- `088`: 신한은행
- `090`: 카카오뱅크
- `092`: 토스뱅크

See `components/bank-account/mydatahub-verification-dialog.tsx` for the complete list.

## API Endpoints

### POST `/api/mydatahub/verify-account`

**Step 1 Request:**
```json
{
  "bankCode": "004",
  "accountNo": "1234567890",
  "birthdateOrSSN": "19900101"
}
```

**Step 1 Response:**
```json
{
  "success": true,
  "callbackId": "66ced80df3cd0d0001302f4f",
  "callbackType": "SIMPLE",
  "timeout": 0,
  "message": "Verification initiated..."
}
```

**Step 2 Request:**
```json
{
  "bankCode": "",
  "accountNo": "",
  "birthdateOrSSN": "",
  "callbackId": "66ced80df3cd0d0001302f4f",
  "callbackResponse": "authentication_response"
}
```

**Step 2 Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Account verification completed successfully"
}
```

## Error Handling

Common error codes:

- `0001`: 사용자 텍스트 입력 필요 (User text input required)
- `3014`: 이미 처리된 거래입니다 (Transaction already processed)
- `401`: Unauthorized (Invalid access token)
- `500`: Internal server error

## Important Notes

1. **Callback ID Expiration**: Once a `callbackId` is used, it expires. You cannot reuse it.

2. **Retry Limit**: If Step 2 is called before authentication completes, the API may return the `callbackId` up to 3 times. You cannot check the user's authentication status.

3. **Environment**: 
   - Development: `https://datahub-dev.scraping.co.kr`
   - Production: `https://api.mydatahub.co.kr`

4. **Data Format**:
   - Birthdate: `YYYYMMDD` (8 digits)
   - SSN: 13 digits (Korean format)
   - Account numbers should be encrypted/hashed before sending

5. **Security**: Never expose your `MYDATAHUB_ACCESS_TOKEN` in client-side code. All API calls should go through your Next.js API routes.

## Integration with Existing Bank Verification

This can be used as an alternative to your existing manual verification system:

```typescript
// Option 1: Use MyData Hub (automatic)
const myDataHubResult = await verifyWithMyDataHub(bankCode, accountNo, birthdate);

// Option 2: Use existing manual verification
const manualResult = await verifyManually(bankAccountId, verificationAmount);
```

## Support

- MyData Hub Support: mydatahub@kwic.co.kr
- Tel: 02-6281-7708
- Documentation: https://dataapi.co.kr/dLab/mdh_api.do

