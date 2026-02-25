import { store } from '@/lib/store';
import { ExpansionClient } from './expansion-client';

export default async function ExpansionPage() {
  const [revenueData, expansionOpportunities, users, accounts] = await Promise.all([
    store.getRevenueData(),
    store.getExpansionOpportunities(),
    store.getAllUsers(),
    store.getAllAccounts(),
  ]);

  return (
    <ExpansionClient
      revenueData={revenueData}
      expansionOpportunities={expansionOpportunities}
      users={users}
      accounts={accounts}
    />
  );
}
