import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getAllTrackedUsers } from '@/lib/db/operations';
import { mapTrackedUserToUser, computeActivationData, computeActivationMilestones } from '@/lib/db/mappers';
import { ActivationClient } from './activation-client';

export default async function ActivationPage() {
  const orgId = await resolveOrgId();
  const dbUsers = await getAllTrackedUsers(orgId);
  const users = dbUsers.map((u) => mapTrackedUserToUser(u));
  const activationData = computeActivationData(dbUsers);
  const activationMilestones = computeActivationMilestones(dbUsers);
  return (
    <ActivationClient
      activationData={activationData}
      activationMilestones={activationMilestones}
      users={users}
    />
  );
}
