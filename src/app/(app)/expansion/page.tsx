import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getRevenueRecords, getExpansionOpportunities, getAllTrackedUsers, getAllTrackedAccounts } from '@/lib/db/operations';
import { aggregateRevenueRecords, mapExpansionOppToUI, mapTrackedUserToUser, mapTrackedAccountToAccount } from '@/lib/db/mappers';
import { ExpansionClient } from './expansion-client';

export default async function ExpansionPage() {
  const orgId = await resolveOrgId();
  const [dbRevenue, dbExpansion, dbUsers, dbAccounts] = await Promise.all([
    getRevenueRecords(orgId),
    getExpansionOpportunities(orgId),
    getAllTrackedUsers(orgId),
    getAllTrackedAccounts(orgId),
  ]);

  const revenueData = aggregateRevenueRecords(dbRevenue);
  const accountNameMap = new Map<string, string>();
  for (const a of dbAccounts) accountNameMap.set(a.id, a.name);
  const expansionOpportunities = dbExpansion.map((e) => mapExpansionOppToUI(e, accountNameMap.get(e.accountId)));
  const users = dbUsers.map((u) => mapTrackedUserToUser(u, u.accountId ? accountNameMap.get(u.accountId) : undefined));
  const accounts = dbAccounts.map((a) => mapTrackedAccountToAccount(a));

  return (
    <ExpansionClient
      revenueData={revenueData}
      expansionOpportunities={expansionOpportunities}
      users={users}
      accounts={accounts}
    />
  );
}
