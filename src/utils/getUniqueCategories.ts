import { slugifyStr } from "./slugify";
import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";
import { SITE } from "@/config";

interface Category {
  category: string;
  categoryName: string;
  count: number;
}

const getUniqueCategories = (posts: CollectionEntry<"blog">[]): Category[] => {
  const catCountMap = new Map<string, Category>();

  posts
    .filter(postFilter)
    .flatMap(post => post.data.categories || [])
    .forEach(cat => {
      const slugName = slugifyStr(cat);
      if (catCountMap.has(slugName)) {
        const existing = catCountMap.get(slugName)!;
        existing.count += 1;
      } else {
        catCountMap.set(slugName, {
          category: slugName,
          categoryName: cat,
          count: 1,
        });
      }
    });

  const categories = Array.from(catCountMap.values()).sort((catA, catB) => {
    if (SITE.categoryOrder.manual) {
      const orderList = SITE.categoryOrder.order as readonly string[];
      const indexA = orderList.indexOf(catA.categoryName);
      const indexB = orderList.indexOf(catB.categoryName);
      if (indexA === -1 && indexB === -1) {
        return catB.count - catA.count;
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }

    if (catB.count !== catA.count) return catB.count - catA.count;
    return catA.category.localeCompare(catB.category);
  });

  return categories;
};

export default getUniqueCategories;
