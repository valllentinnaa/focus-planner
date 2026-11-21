// The week's shopping list (Food tab) as one line in Week → Personal life.
type Item = { id: string; list: string; done: boolean; text: string };

export function shoppingSummary(items: readonly Item[]) {
  const rows = items.filter((i) => i.list === "shopping" && i.text.trim() !== "");
  const done = rows.filter((i) => i.done).length;
  return { total: rows.length, done, allDone: rows.length > 0 && done === rows.length };
}

/** Ticking the Shopping line marks every item done; unticking it marks every item not done. */
export function shoppingChanges(items: readonly Item[], done: boolean) {
  return items.filter((i) => i.list === "shopping" && i.done !== done).map((i) => ({ id: i.id, done }));
}
