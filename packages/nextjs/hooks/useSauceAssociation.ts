import { useCallback, useEffect, useState } from "react";
import { readSauceAssociation } from "~~/lib/saucer/association";

type AssociationResult = { address: string; associated: boolean };
type AssociationFailure = { address: string; message: string };

export function useSauceAssociation(address: string | undefined) {
  const [result, setResult] = useState<AssociationResult | null>(null);
  const [failure, setFailure] = useState<AssociationFailure | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAssociation = useCallback(() => setRefreshKey(current => current + 1), []);

  useEffect(() => {
    let current = true;
    setResult(null);
    setFailure(null);
    if (!address) {
      return () => {
        current = false;
      };
    }
    const verifiedAddress = address;
    async function verify() {
      try {
        const associated = await readSauceAssociation(verifiedAddress);
        if (current) setResult({ address: verifiedAddress, associated });
      } catch {
        if (current)
          setFailure({
            address: verifiedAddress,
            message: "Association could not be verified; execution stays disabled.",
          });
      }
    }
    void verify();
    return () => {
      current = false;
    };
  }, [address, refreshKey]);

  return {
    associated: result && result.address === address ? result.associated : null,
    associationError: failure && failure.address === address ? failure.message : "",
    refreshAssociation,
  };
}
