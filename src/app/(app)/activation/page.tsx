import { store } from '@/lib/store';
import { ActivationClient } from './activation-client';

export default async function ActivationPage() {
  const [activationData, activationMilestones, users] = await Promise.all([
    store.getActivationData(),
    store.getActivationMilestones(),
    store.getAllUsers(),
  ]);

  return (
    <ActivationClient
      activationData={activationData}
      activationMilestones={activationMilestones}
      users={users}
    />
  );
}
