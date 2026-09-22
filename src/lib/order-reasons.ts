/** Reasons the shop accepts for cancellations and returns. */
export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Bought the part elsewhere",
  "Need a different part or size",
  "Delivery is taking too long",
  "Changed my mind",
  "Other reason",
];

export const RETURN_REASONS = [
  "Wrong item received",
  "Item arrived damaged",
  "Item is faulty or not working",
  "Part does not fit my vehicle",
  "Not as described on the website",
  "Other reason",
];

/** Returns can only be asked for after the order has actually arrived. */
export const RETURNABLE_STATUSES = ["delivered"];
export const CANCELLABLE_STATUSES = ["order_confirmed", "processing", "packed"];
