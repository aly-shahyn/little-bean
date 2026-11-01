import { createServerFn } from "@tanstack/react-start";

import { frequentlyBought, listBrands, listBundles, listCategories, listPublicProducts, publicSettings } from "./shop.server";

export const getShop = createServerFn({ method: "GET" }).handler(async () => {
  const [products, brands, categories, settings, bundles, pairs] = await Promise.all([listPublicProducts(), listBrands(), listCategories(), publicSettings(), listBundles(), frequentlyBought()]);
  return { products, brands, categories, settings, bundles, pairs };
});
