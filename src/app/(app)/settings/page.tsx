import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getOrganizationUsers, getWebhooks, getApiKeysByOrg } from '@/lib/db/operations';
import { mapOrgUserToTeamMember, mapWebhookToUI } from '@/lib/db/mappers';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const orgId = await resolveOrgId();
  const [dbUsers, dbWebhooks, dbApiKeys] = await Promise.all([
    getOrganizationUsers(orgId),
    getWebhooks(orgId),
    getApiKeysByOrg(orgId),
  ]);
  const teamMembers = dbUsers.map(mapOrgUserToTeamMember);
  const webhooks = dbWebhooks.map(mapWebhookToUI);
  const apiKeys = dbApiKeys.map(k => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    environment: k.environment,
    scopes: k.scopes as string[],
    createdAt: k.createdAt?.toISOString() ?? new Date().toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  }));
  return <SettingsClient teamMembers={teamMembers} webhooks={webhooks} apiKeys={apiKeys} />;
}
