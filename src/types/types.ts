export type UserRole = 'developer' | 'admin';
export type DeveloperPlan = 'FREE' | 'PRO' | 'BUSINESS';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
export type ClientStatus = 'PENDING' | 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type ReminderType = 'UPCOMING_RENEWAL' | 'PAYMENT_FAILED' | 'MANUAL';

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Developer {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  business_name: string | null;
  logo_url: string | null;
  plan: DeveloperPlan;
  commission_rate: number;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_account_name: string | null;
  bank_verified: boolean;
  paystack_recipient_code: string | null;
  onboarding_completed: boolean;
  pending_balance: number;
  total_earned: number;
  created_at: string;
}

export interface Project {
  id: string;
  developer_id: string;
  name: string;
  description: string | null;
  currency: string;
  billing_cycle: BillingCycle;
  amount: number;
  trial_days: number;
  client_can_cancel: boolean;
  cancel_lock_months: number;
  cancel_policy: string | null;
  brand_color: string | null;
  paystack_plan_code: string | null;
  is_active: boolean;
  created_at: string;
  clients_count?: number;
}

export interface Client {
  id: string;
  project_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  paystack_customer_code: string | null;
  paystack_auth_code: string | null;
  subscription_code: string | null;
  next_billing_date: string | null;
  retry_count: number;
  payment_link_token: string;
  portal_token: string;
  accepted_terms_at: string | null;
  subscription_start_date: string | null;
  created_at: string;
  project?: Project;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  client_id: string;
  paystack_ref: string;
  gross_amount: number;
  paystack_fee: number;
  platform_fee: number;
  developer_amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  payout_id: string | null;
  created_at: string;
  client?: Client;
}

export interface Payout {
  id: string;
  developer_id: string;
  amount: number;
  currency: string;
  paystack_transfer_code: string | null;
  paystack_transfer_id: string | null;
  status: PayoutStatus;
  initiated_at: string;
  completed_at: string | null;
  failure_reason: string | null;
  developer?: Developer;
}

export interface Reminder {
  id: string;
  client_id: string;
  sent_at: string;
  type: ReminderType;
  client?: Client;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}
