/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - unused, kept for API compatibility
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
import { withBase } from "./withBase";

export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true,
  base?: string
) {
  // Keep parameter for backward compatibility with existing call sites.
  void filePath;
  const basePath = includeBase ? "/posts" : "";

  // Only use the file name as the slug, ignoring any category subdirectories
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  const path = [basePath, slug].join("/");
  return includeBase ? withBase(path, base) : path;
}
