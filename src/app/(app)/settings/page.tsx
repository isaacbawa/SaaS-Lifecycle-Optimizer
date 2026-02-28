import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getOrganizationUsers, getWebhooks } from '@/lib/db/operations';
import { mapOrgUserToTeamMember, mapWebhookToUI } from '@/lib/db/mappers';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const orgId = await resolveOrgId();
  const [dbUsers, dbWebhooks] = await Promise.all([
    getOrganizationUsers(orgId),
    getWebhooks(orgId),
  ]);
  const teamMembers = dbUsers.map(mapOrgUserToTeamMember);
  const webhooks = dbWebhooks.map(mapWebhookToUI);
  return <SettingsClient teamMembers={teamMembers} webhooks={webhooks} />;
}
