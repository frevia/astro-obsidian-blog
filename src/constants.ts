import type { Props } from "astro";
import { SITE } from "./config";
import IconBili from "@/assets/icons/IconBilibili.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconMail from "@/assets/icons/IconMail.svg";
import IconPinterest from "@/assets/icons/IconPinterest.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconWhatsapp from "@/assets/icons/IconWhatsapp.svg";
import IconZhihu from "@/assets/icons/IconZhihu.svg";
import { resolveSocialLinks } from "@/utils/socialLinks";

interface Social {
  name: string;
  href: string;
  linkTitle?: string;
  icon: (_props: Props) => Element;
}

const SOCIAL_ICON_REGISTRY = {
  bilibili: IconBili,
  facebook: IconFacebook,
  github: IconGitHub,
  linkedin: IconLinkedin,
  mail: IconMail,
  pinterest: IconPinterest,
  telegram: IconTelegram,
  twitter: IconBrandX,
  whatsapp: IconWhatsapp,
  x: IconBrandX,
  zhihu: IconZhihu,
} satisfies Record<string, Social["icon"]>;

export const SOCIALS: readonly Social[] = resolveSocialLinks(
  SITE.socials,
  SOCIAL_ICON_REGISTRY,
  SITE.title
);

export const SHARE_LINKS: readonly Social[] = resolveSocialLinks(
  SITE.shareLinks,
  SOCIAL_ICON_REGISTRY
);
