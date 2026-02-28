import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getAllTrackedAccounts, getAllTrackedUsers } from '@/lib/db/operations';
import { mapTrackedAccountToAccount, mapTrackedUserToUser } from '@/lib/db/mappers';
import { AccountsClient } from './accounts-client';

export default async function AccountsPage() {
  const orgId = await resolveOrgId();
  const [dbAccounts, dbUsers] = await Promise.all([
    getAllTrackedAccounts(orgId),
    getAllTrackedUsers(orgId),
  ]);

  // Build account name map for user→account resolution
  const accountNameMap = new Map<string, string>();
  for (const a of dbAccounts) {
    accountNameMap.set(a.id, a.name);
  }

  const accounts = dbAccounts.map((a) => mapTrackedAccountToAccount(a));
  const users = dbUsers.map((u) =>
    mapTrackedUserToUser(u, u.accountId ? accountNameMap.get(u.accountId) : undefined),
  );

  return <AccountsClient accounts={accounts} users={users} />;
}
