// A schema, table or column name as SQL. These come from the request, so a quote
// inside one is doubled and it stays a name.
export function quoteIdent(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}
