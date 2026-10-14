export const FLOOR_PLAN_BUCKET = "floor-plans";
export const MAX_FLOOR_PLAN_BYTES = 10 * 1024 * 1024;
export const FLOOR_PLAN_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function validateFloorPlanFile(file: File): Promise<string> {
  if (!file.size) throw new Error("Filen er tom. Vælg en plantegning som PNG, JPG eller WebP.");
  if (file.size > MAX_FLOOR_PLAN_BYTES) throw new Error("Plantegningen må højst fylde 10 MB.");
  const extension = FLOOR_PLAN_TYPES[file.type];
  if (!extension) throw new Error("Vælg et billede som PNG, JPG eller WebP. PDF understøttes ikke endnu.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(file.type === "image/png" ? png : file.type === "image/jpeg" ? jpg : webp)) {
    throw new Error("Filens indhold passer ikke til billedtypen. Eksportér tegningen som PNG eller JPG, og prøv igen.");
  }
  return extension;
}
