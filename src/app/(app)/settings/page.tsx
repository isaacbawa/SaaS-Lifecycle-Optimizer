import { store } from '@/lib/store';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const [teamMembers, webhooks] = await Promise.all([
    store.getTeamMembers(),
    store.getWebhooks(),
  ]);

  return <SettingsClient teamMembers={teamMembers} webhooks={webhooks} />;
}
