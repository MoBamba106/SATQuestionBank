/**
 * CloudBase Storage helpers (web + server).
 * Used for future uploads (avatars, custom materials). Safe no-ops when unset.
 */

export function storageBucket() {
  return process.env.NEXT_PUBLIC_CLOUDBASE_STORAGE_BUCKET?.trim() || "";
}

export function isStorageConfigured() {
  return Boolean(storageBucket() && process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID?.trim());
}

/** Client-side upload via CloudBase JS SDK. */
export async function uploadBrowserFile(path: string, file: File) {
  if (!isStorageConfigured()) {
    throw new Error("CloudBase storage is not configured.");
  }
  const cloudbase = (await import("@cloudbase/js-sdk")).default;
  const app = cloudbase.init({ env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID! });
  const result = await app.uploadFile({
    cloudPath: path,
    filePath: file as unknown as string,
  });
  return result;
}
