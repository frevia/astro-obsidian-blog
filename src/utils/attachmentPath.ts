export function attachmentRelativePath(inputPath: string): string {
  const normalizedPath = inputPath.replace(/\\/g, "/");
  const match = normalizedPath.match(/(?:^|\/)attachments?(?:\/media)?\/(.+)$/);

  return match?.[1] ?? normalizedPath.split("/").pop() ?? normalizedPath;
}
