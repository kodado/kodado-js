export type NodeFile = {
  buffer: Buffer;
  type: string;
};

export async function toBlob(file: File | NodeFile): Promise<Blob> {
  if (isFile(file)) {
    const arrayBuffer = await file.arrayBuffer();

    return new Blob([arrayBuffer], { type: file.type });
  }

  return new Blob([file.buffer.buffer], { type: file.type });
}

export function isFile(file: any): file is File {
  return typeof File !== "undefined" && file instanceof File;
}

export function isBlob(file: any): file is Blob {
  return typeof Blob !== "undefined" && file instanceof Blob;
}
