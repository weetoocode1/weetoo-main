export interface BankAccount {
  id: string;
  user_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name?: string;
  is_verified: boolean;
  verification_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  kor_coins_amount: number;
  fee_percentage: number;
  fee_amount: number;
  final_amount: number;
  payout_sent?: boolean; // true when admins marked money as sent
  status:
    | "pending"
    | "verification_sent"
    | "verified"
    | "approved"
    | "completed"
    | "rejected"
    | "failed";
  admin_notes?: string;
  payout_sent_at?: string | null;
  payout_sent_by?: string | null;
  payout_reference?: string | null;
  payout_amount_won?: number | null;
  created_at: string;
  updated_at: string;

  // Joined data
  bank_account?: BankAccount;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    level?: number;
    kor_coins?: number;
  };
}

export interface CreateWithdrawalRequestData {
  bank_account_id: string;
  kor_coins_amount: number;
}

export interface CreateBankAccountData {
  account_holder_name: string;
  account_number: string;
  bank_name?: string;
}

export interface VerifyBankAccountData {
  verification_amount: number;
}

export interface UpdateWithdrawalStatusData {
  status: WithdrawalRequest["status"];
  admin_notes?: string;
}

export interface WithdrawalStats {
  totalRequests: number;
  pendingRequests: number;
  verifiedRequests: number;
  completedRequests: number;
  totalAmount: number;
}
