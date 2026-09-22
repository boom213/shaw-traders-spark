import { queryOptions } from "@tanstack/react-query";
import {
  getCategory,
  getProduct,
  homeFeed,
  listCategories,
  listFacets,
  listProducts,
  productsByIds,
  type ProductFilters,
} from "@/lib/catalog.functions";

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => listCategories(), staleTime: 5 * 60_000 });

export const categoryQuery = (slug: string) =>
  queryOptions({ queryKey: ["category", slug], queryFn: () => getCategory({ data: { slug } }), staleTime: 5 * 60_000 });

export const productsQuery = (filters: ProductFilters) =>
  queryOptions({
    queryKey: ["products", filters],
    queryFn: () => listProducts({ data: filters }),
    staleTime: 60_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => getProduct({ data: { slug } }), staleTime: 60_000 });

export const facetsQuery = () =>
  queryOptions({ queryKey: ["facets"], queryFn: () => listFacets(), staleTime: 10 * 60_000 });

export const homeQuery = () =>
  queryOptions({ queryKey: ["home"], queryFn: () => homeFeed(), staleTime: 60_000 });

export const productsByIdsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["products-by-ids", [...ids].sort()],
    queryFn: () => productsByIds({ data: { ids } }),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
