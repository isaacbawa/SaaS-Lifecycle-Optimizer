import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getRevenueRecords, getAllTrackedAccounts } from '@/lib/db/operations';
import { aggregateRevenueRecords, computeRevenueWaterfall, mapTrackedAccountToAccount } from '@/lib/db/mappers';
import { RevenueClient } from './revenue-client';

export default async function RevenuePage() {
  const orgId = await resolveOrgId();
  const [dbRevenue, dbAccounts] = await Promise.all([
    getRevenueRecords(orgId),
    getAllTrackedAccounts(orgId),
  ]);
  const revenueData = aggregateRevenueRecords(dbRevenue);
  const revenueWaterfall = computeRevenueWaterfall(dbRevenue);
  const accounts = dbAccounts.map(mapTrackedAccountToAccount);
  return (
    <RevenueClient
      revenueData={revenueData}
      revenueWaterfall={revenueWaterfall}
      accounts={accounts}
    />
  );
}
