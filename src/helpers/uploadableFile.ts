export type UploadableFile = {
  buffer: Buffer;
  name: string;
  type: string;
  size: number;
};

export async function toUploadableFile(file: File) {
  const buffer = await file.arrayBuffer();

  return {
    buffer: Buffer.from(buffer),
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export function isBrowserFile(image: any): image is File {
  return typeof File !== "undefined" && image instanceof File;
}
