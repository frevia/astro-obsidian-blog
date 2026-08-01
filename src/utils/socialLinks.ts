import type { SocialLink } from "@/types/config";

export interface ResolvedSocialLink<TIcon> {
  name: string;
  href: string;
  linkTitle?: string;
  icon: TIcon;
}

export function resolveSocialLinks<TIcon>(
  links: readonly SocialLink[],
  icons: Readonly<Record<string, TIcon>>,
  siteTitle?: string
): ResolvedSocialLink<TIcon>[] {
  return links.map(link => {
    const icon = icons[link.name.toLowerCase()];
    if (!icon) {
      throw new Error(`Unknown social icon "${link.name}"`);
    }

    return {
      name: link.name,
      href: link.url,
      linkTitle:
        link.linkTitle ??
        (siteTitle ? `${siteTitle} on ${link.name}` : undefined),
      icon,
    };
  });
}
