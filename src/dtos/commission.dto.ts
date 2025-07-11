export interface Commission {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserEmail: string;
  referredUserName?: string;
  amount: number;
  commission: number;
  paymentIntentId: string;
  status: 'pending' | 'paid';
  createdAt: Date;
}

export interface ReferralStats {
  totalCommissions: number;
  totalReferrals: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export interface CreateCommissionDto {
  referrerId: string;
  referredUserId: string;
  referredUserEmail: string;
  referredUserName?: string;
  amount: number;
  commission: number;
  paymentIntentId: string;
}

export interface GetCommissionsResponseDto {
  commissions: Commission[];
  stats: ReferralStats;
}
