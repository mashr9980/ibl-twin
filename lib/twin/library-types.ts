// What the app remembers about a member's twin and videos, beyond what HeyGen holds.

export type VideoKind = "twin" | "avatar" | "clip";

export interface LocalVideo {
  id: string;
  title: string;
  kind: VideoKind;
  orientation: "landscape" | "portrait";
  avatarName?: string;
  createdAt: number;
}

export interface LocalTwin {
  groupId: string;
  /** The look inside the group; what a video is generated from. Older records fall back to groupId. */
  lookId?: string;
  name: string;
  imageUrl?: string;
  createdAt: number;
}

export interface Library {
  twin: LocalTwin | null;
  videos: LocalVideo[];
}
