export function counterSaleQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

export function counterSaleShortage(quantity: number, stock: number) {
  return Math.max(0, counterSaleQuantity(quantity) - Math.max(0, Math.floor(stock)));
}