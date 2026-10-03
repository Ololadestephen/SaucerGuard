"use client";

import { formatUnits } from "viem";
import { GuardPreflightPanel } from "~~/components/GuardPreflightPanel";
import { useGuardedSaucerSwap } from "~~/hooks/useGuardedSaucerSwap";
import { MAX_QUOTE_AGE_SECONDS, SAUCE_DECIMALS } from "~~/lib/saucer/config";

export default function Home() {
  const {
    amount,
    amountTinybars,
    amountError,
    updateAmount,
    slippageBps,
    setSlippageBps,
    quote,
    quoteAge,
    minimumRaw,
    associated,
    associationError,
    refreshAssociation,
    loading,
    error,
    txHash,
    chainId,
    address,
    guardAddress,
    blockReason,
    getQuote,
    executeSwap,
  } = useGuardedSaucerSwap();

  return (
    <main className="grow bg-base-200 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="badge badge-primary badge-outline mb-3">Hedera testnet · SaucerSwap V1</div>
          <h1 className="text-4xl font-bold tracking-tight">SaucerGuard</h1>
          <p className="mt-3 max-w-2xl text-base-content/70">
            A starter for HBAR-to-HTS swaps that makes pool liquidity, token association, and execution policy visible
            before the wallet signs. The contract refuses stale or degraded quotes.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-5">
              <h2 className="card-title">1 · Request a live quote</h2>
              <label className="form-control">
                <span className="label-text mb-2">You pay (HBAR)</span>
                <input
                  className="input input-bordered w-full"
                  inputMode="decimal"
                  value={amount}
                  onChange={event => updateAmount(event.target.value)}
                  aria-label="HBAR amount"
                />
                <span className="mt-2 text-xs text-base-content/60">
                  On-chain cap: 10 HBAR. Eight decimal places maximum.
                </span>
              </label>
              {amountError && <p className="text-sm text-error">{amountError}</p>}
              <label className="form-control">
                <span className="label-text mb-2">Maximum slippage</span>
                <select
                  className="select select-bordered w-full"
                  value={slippageBps}
                  onChange={event => setSlippageBps(Number(event.target.value))}
                >
                  <option value={50}>0.5%</option>
                  <option value={100}>1%</option>
                  <option value={200}>2%</option>
                  <option value={300}>3% (contract maximum)</option>
                </select>
              </label>
              <button className="btn btn-primary" onClick={() => void getQuote()} disabled={loading || !amountTinybars}>
                {loading ? "Checking the pool…" : "Get live SaucerSwap quote"}
              </button>
              {quote && (
                <div className="rounded-xl border border-base-300 bg-base-200 p-4 text-sm">
                  <h3 className="font-semibold">Quote from the testnet router</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2">
                    <dt>Estimated receive</dt>
                    <dd className="text-right font-semibold">{formatUnits(quote.outputRaw, SAUCE_DECIMALS)} SAUCE</dd>
                    <dt>Minimum receive</dt>
                    <dd className="text-right">{formatUnits(minimumRaw ?? 0n, SAUCE_DECIMALS)} SAUCE</dd>
                    <dt>Price impact + fee</dt>
                    <dd className="text-right">{(quote.priceImpactBps / 100).toFixed(2)}%</dd>
                    <dt>Quote age</dt>
                    <dd className="text-right">
                      {quoteAge}s / {MAX_QUOTE_AGE_SECONDS}s
                    </dd>
                  </dl>
                  <a
                    className="link link-primary mt-3 block break-all text-xs"
                    href={`https://hashscan.io/testnet/contract/${quote.pair}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect the WHBAR/SAUCE pool
                  </a>
                </div>
              )}
              <div className="alert alert-info text-sm">
                <span>
                  {blockReason
                    ? `Execution locked: ${blockReason}`
                    : "Guard checks pass. The contract rechecks at execution."}
                </span>
              </div>
              <button
                className="btn btn-accent"
                onClick={() => void executeSwap()}
                disabled={loading || Boolean(blockReason)}
              >
                {loading ? "Working…" : "2 · Sign guarded swap"}
              </button>
              {error && (
                <div role="alert" className="alert alert-error text-sm">
                  {error}
                </div>
              )}
              {txHash && (
                <div role="status" className="alert alert-success text-sm">
                  Swap confirmed.{" "}
                  <a
                    className="link break-all"
                    href={`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction proof
                  </a>
                </div>
              )}
            </div>
          </section>
          <GuardPreflightPanel
            chainId={chainId}
            associated={associated}
            guardConfigured={Boolean(guardAddress)}
            quote={quote}
            address={address}
            associationError={associationError}
            refreshAssociation={refreshAssociation}
          />
        </div>
      </div>
    </main>
  );
}
