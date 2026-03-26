/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - unused, kept for API compatibility
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  // Keep parameter for backward compatibility with existing call sites.
  void filePath;
  const basePath = includeBase ? "/posts" : "";

  // Only use the file name as the slug, ignoring any category subdirectories
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  return [basePath, slug].join("/");
}
