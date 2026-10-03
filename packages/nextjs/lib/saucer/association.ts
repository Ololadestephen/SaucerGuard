type AssociationFetch = (url: string, init: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function readSauceAssociation(address: string, fetcher: AssociationFetch = fetch): Promise<boolean> {
  const response = await fetcher(`/api/token-association?account=${address}`, { cache: "no-store" });
  const body = await response.json();
  if (
    !response.ok ||
    typeof body !== "object" ||
    body === null ||
    !("associated" in body) ||
    typeof body.associated !== "boolean"
  ) {
    throw new Error("Association response unavailable");
  }
  return body.associated;
}
