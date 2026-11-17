const PAGE_SIZE = 1000;

/**
 * Reads every row a query matches, a page at a time. A single Supabase request
 * returns at most 1,000 rows by default (the project's "Max rows" setting), so
 * an unpaged read of a growing table silently drops rows. Keeps reading until a
 * page comes back empty, which also works if that setting is lower than 1,000.
 *
 * `page` must apply a stable order (e.g. `.order("id")`) so pages neither
 * overlap nor skip rows.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[] } | { error: string }> {
  const rows: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { data: rows };
    rows.push(...data);
    from += data.length;
  }
}
