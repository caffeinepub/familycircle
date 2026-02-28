import { MediaType } from "../backend";
import { ExternalBlob } from "../backend";

/**
 * Determine MediaType from a File's MIME type
 */
export function getMediaType(file: File): MediaType {
  if (file.type.startsWith("video/")) return MediaType.video;
  return MediaType.photo;
}

/**
 * Convert a File to Uint8Array
 */
export async function fileToUint8Array(
  file: File,
): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer) as Uint8Array<ArrayBuffer>;
}

/**
 * Convert a File to ExternalBlob
 */
export async function fileToExternalBlob(file: File): Promise<ExternalBlob> {
  const bytes = await fileToUint8Array(file);
  return ExternalBlob.fromBytes(bytes);
}

/**
 * Get initials from a username
 */
export function getInitials(username: string): string {
  return (
    username
      .split(/[\s_-]/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || username.slice(0, 2).toUpperCase()
  );
}
