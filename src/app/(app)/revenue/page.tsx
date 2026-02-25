import { store } from '@/lib/store';
import { RevenueClient } from './revenue-client';

export default async function RevenuePage() {
  const [revenueData, revenueWaterfall, accounts] = await Promise.all([
    store.getRevenueData(),
    store.getRevenueWaterfall(),
    store.getAllAccounts(),
  ]);

  return (
    <RevenueClient
      revenueData={revenueData}
      revenueWaterfall={revenueWaterfall}
      accounts={accounts}
    />
  );
}
