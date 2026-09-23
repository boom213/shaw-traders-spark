import { queryOptions } from "@tanstack/react-query";
import {
  getCategory,
  getProduct,
  homeFeed,
  listCategories,
  listFacets,
  listProducts,
  productsByIds,
  searchSuggest,
  vehicleTree,
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

export const suggestQuery = (q: string) =>
  queryOptions({
    queryKey: ["suggest", q],
    queryFn: () => searchSuggest({ data: { q } }),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

export const vehicleTreeQuery = () =>
  queryOptions({ queryKey: ["vehicle-tree"], queryFn: () => vehicleTree(), staleTime: 10 * 60_000 });

export const facetsQuery = () =>
  queryOptions({ queryKey: ["facets"], queryFn: () => listFacets(), staleTime: 10 * 60_000 });

export const homeQuery = () =>
  queryOptions({ queryKey: ["home"], queryFn: () => homeFeed(), staleTime: 60_000 });

export const vehiclesQuery = () =>
  queryOptions({ queryKey: ["vehicles"], queryFn: () => listVehicles(), staleTime: 5 * 60_000 });

export const productsByIdsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["products-by-ids", [...ids].sort()],
    queryFn: () => productsByIds({ data: { ids } }),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
