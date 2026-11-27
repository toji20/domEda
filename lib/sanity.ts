import { cache } from "react";
import { defaults, type SiteData } from "./model";

import starterMenu from "./starter-menu.json";

export const contentTag = "sanity-content";

export function sanityConfig() {
  const projectId = process.env.SANITY_PROJECT_ID?.trim();
  const dataset = process.env.SANITY_DATASET?.trim();
  return projectId && dataset ? { projectId, dataset } : null;
}

const image = `"photo": select(defined(photo.asset) => photo{
  "url": asset->url, alt, illustrative, generated, sourceUrl, license
})`;
const query = `{
  "home": *[_id == "home"][0]{name, title, subtitle, emptyMenu, ${image}},
  "delivery": *[_id == "delivery"][0]{phone, address, hours, zone, cost, minimum, pickup, pickupDetails},
  "seo": *[_id == "seo"][0]{title, description, noIndex},
  "categories": *[_type == "category" && defined(name)] | order(coalesce(rank, 100) asc, name asc, _id asc){_id, name},
  "dishes": *[_type == "dish" && defined(name) && defined(category->name) &&
    count(portions[price > 0 && defined(unit)]) > 0]
    | order(coalesce(rank, 100) asc, name asc, _id asc) {
    _id, name, "categoryId": category._ref, "available": coalesce(available, true),
    description, ingredients, allergens, ${image},
    "portions": portions[price > 0 && defined(unit)]{_key, label, price, unit, weight}
  }
}`;

function compact<T extends object>(value: T | null) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([, field]) => field != null));
}

export const loadSite = cache(async (): Promise<SiteData> => {
  const config = sanityConfig();
  if (!config) {
    return {
      ...defaults,
      categories: starterMenu.categories,
      dishes: starterMenu.dishes.map((dish) => ({ ...dish, available: true })),
    };
  }

  const url = new URL(
    "/v2025-02-19/data/query/" + encodeURIComponent(config.dataset),
    "https://" + config.projectId + ".api.sanity.io",
  );
  url.searchParams.set("perspective", "published");
  url.searchParams.set("query", query);
  const token = process.env.SANITY_READ_TOKEN;
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: "Bearer " + token } : undefined,
      next: { tags: [contentTag], revalidate: 120 },
    });
    if (!response.ok) throw new Error("Sanity HTTP " + response.status);
    const { result } = await response.json() as { result: SiteData };
    return {
      ...result,
      home: { ...defaults.home, ...compact(result.home) },
      delivery: { ...defaults.delivery, ...compact(result.delivery) },
      seo: result.seo ?? {},
    };
  } catch (error) {
    console.error("Не удалось получить опубликованный контент Sanity", error);
    return defaults;
  }
});
