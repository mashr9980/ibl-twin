/**
 * Server-side trim for HeyGen's avatar catalogue.
 *
 * `GET /v2/avatars` is ~3.9 MB raw (1,264 avatars with every preview URL and
 * tag), and the gallery only reads a handful of fields. Trimming in the proxy
 * cuts the cold load from a multi-second download to a few hundred KB; the
 * client already keeps the same fields in sessionStorage.
 */

export type SlimAvatar = {
  avatar_id: string;
  avatar_name: string;
  gender?: string;
  preview_image_url?: string;
  type?: string;
};

export type SlimTalkingPhoto = {
  talking_photo_id: string;
  talking_photo_name: string;
  preview_image_url?: string;
};

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export type TrimOptions = {
  /**
   * HeyGen's envelope also carries every public talking photo (~8,000 rows,
   * 88% of the bytes). Nothing in the app lists them, so they're dropped
   * unless a caller opts in with `?include=talking_photos`.
   */
  includeTalkingPhotos?: boolean;
};

export function trimAvatarCatalogue(payload: unknown, opts: TrimOptions = {}): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const data = (payload as Raw).data as Raw | undefined;
  if (!data || typeof data !== "object") return payload;

  const avatars = Array.isArray(data.avatars)
    ? (data.avatars as Raw[]).flatMap((a): SlimAvatar[] => {
        const id = str(a.avatar_id), name = str(a.avatar_name);
        if (!id || !name) return [];
        const slim: SlimAvatar = { avatar_id: id, avatar_name: name };
        const gender = str(a.gender); if (gender) slim.gender = gender;
        const img = str(a.preview_image_url); if (img) slim.preview_image_url = img;
        const type = str(a.type); if (type) slim.type = type;
        return [slim];
      })
    : undefined;

  const talking_photos = opts.includeTalkingPhotos && Array.isArray(data.talking_photos)
    ? (data.talking_photos as Raw[]).flatMap((t): SlimTalkingPhoto[] => {
        const id = str(t.talking_photo_id);
        if (!id) return [];
        const slim: SlimTalkingPhoto = { talking_photo_id: id, talking_photo_name: str(t.talking_photo_name) ?? "" };
        const img = str(t.preview_image_url); if (img) slim.preview_image_url = img;
        return [slim];
      })
    : undefined;

  const { talking_photos: _dropped, ...rest } = data;
  return {
    ...(payload as Raw),
    data: {
      ...rest,
      ...(avatars ? { avatars } : {}),
      ...(talking_photos ? { talking_photos } : {}),
    },
  };
}

/** Only the catalogue listing is trimmed; every other proxied path passes through untouched. */
export const isAvatarCatalogue = (method: string, path: string) =>
  method === "GET" && /^\/?v2\/avatars\/?$/.test(path);
