// Every clone is labelled with the member who made it: the ElevenLabs
// account is the workspace's, the voice is the member's.
const APP = "ibl-twin";

type Labelled = { labels?: Record<string, string> | null };

export function ownerLabels(username: string): Record<string, string> {
  return { app: APP, owner: username };
}

export function isOwnedBy(voice: Labelled, username: string): boolean {
  return !!username && voice.labels?.app === APP && voice.labels?.owner === username;
}
