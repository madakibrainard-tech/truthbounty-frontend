'use client';

export {
  useRewardsClaim,
  default as useRewardsDefault,
  type UseRewardsClaimResult,
} from './useRewardsClaim';
import { useRewardsClaim } from './useRewardsClaim';

export function useRewards() {
  return useRewardsClaim();
}

export default useRewards;
export type { ClaimableRewardItem } from '@/lib/rewards-claim';
export type { RewardsClaimStatus as ClaimStatus } from '@/lib/rewards-claim';
