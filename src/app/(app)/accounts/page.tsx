import { store } from '@/lib/store';
import { AccountsClient } from './accounts-client';

export default async function AccountsPage() {
  const [accounts, users] = await Promise.all([
    store.getAllAccounts(),
    store.getAllUsers(),
  ]);

  return <AccountsClient accounts={accounts} users={users} />;
}
