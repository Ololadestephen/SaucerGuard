import { SAUCE_ID, TESTNET_CHAIN_ID } from "~~/lib/saucer/config";
import type { SwapQuote } from "~~/lib/saucer/guard";

type Props = {
  chainId: number | undefined;
  associated: boolean | null;
  guardConfigured: boolean;
  quote: SwapQuote | null;
  address: string | undefined;
  associationError: string;
  refreshAssociation: () => void;
  associateSauce: () => Promise<void>;
  associationHash: `0x${string}` | null;
  loading: boolean;
};

export function GuardPreflightPanel({
  chainId,
  associated,
  guardConfigured,
  quote,
  address,
  associationError,
  refreshAssociation,
  associateSauce,
  associationHash,
  loading,
}: Props) {
  return (
    <aside className="space-y-5">
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title text-lg">Preflight checks</h2>
          <ul className="space-y-3 text-sm">
            <li>
              Network:{" "}
              <strong>{chainId === TESTNET_CHAIN_ID ? "Hedera testnet ✓" : "connect / switch to testnet"}</strong>
            </li>
            <li>
              SAUCE association:{" "}
              <strong>
                {associated === true ? "verified ✓" : associated === false ? "not associated" : "unverified"}
              </strong>
            </li>
            <li>
              Guard deployment: <strong>{guardConfigured ? "configured ✓" : "not configured"}</strong>
            </li>
            <li>
              Price impact:{" "}
              <strong>{quote ? `${(quote.priceImpactBps / 100).toFixed(2)}% / 3% cap` : "awaiting quote"}</strong>
            </li>
          </ul>
          {associated === false && (
            <button
              className="btn btn-sm btn-primary mt-3"
              onClick={() => void associateSauce()}
              disabled={loading || !address || chainId !== TESTNET_CHAIN_ID}
            >
              Associate SAUCE with your wallet
            </button>
          )}
          <button
            className="btn btn-sm btn-outline mt-3"
            onClick={() => void refreshAssociation()}
            disabled={loading || !address}
          >
            Recheck token association
          </button>
          {associationHash && (
            <p role="status" className="mt-2 text-xs">
              Association transaction confirmed. Recheck if the mirror node is still indexing it.{" "}
              <a
                className="link link-primary"
                href={`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${associationHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View association proof
              </a>
            </p>
          )}
          {associationError && <p className="mt-2 text-xs text-warning">{associationError}</p>}
          <a
            className="link link-primary mt-2 text-xs"
            href={`https://hashscan.io/testnet/token/${SAUCE_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Testnet SAUCE token · {SAUCE_ID}
          </a>
        </div>
      </section>
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body text-sm">
          <h2 className="card-title text-lg">What the guard enforces</h2>
          <p>
            Fixed SaucerSwap router and WHBAR→SAUCE path, 10 HBAR input cap, 30-second quote age, 1% quote-drift cap, 3%
            maximum slippage, and a five-minute deadline ceiling.
          </p>
          <p className="text-base-content/60">
            A quote is not a fill guarantee. Pool state can change before confirmation; a failed transaction reverts
            instead of silently accepting worse terms.
          </p>
        </div>
      </section>
    </aside>
  );
}
