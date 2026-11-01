import { getRouteApi } from "@tanstack/react-router";

import { DEFAULT_CATEGORIES, type Brand, type Category } from "./catalog";
import { c } from "./content";

const root = getRouteApi("__root__");

export function useShop() {
  const data = root.useLoaderData();
  const brandOf = (id: string): Brand => data.brands.find((b) => b.id === id) ?? { id, name: id, origin: "", about: "", sort: 0, hidden: 0 };
  const categoryOf = (id: string): Category =>
    data.categories.find((x) => x.id === id) ?? DEFAULT_CATEGORIES.find((x) => x.id === id) ?? { ...DEFAULT_CATEGORIES[0], id, name: id };
  const t = (key: string) => c(data.settings, key);
  return { ...data, brandOf, categoryOf, t };
}
