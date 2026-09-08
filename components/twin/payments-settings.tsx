"use client";

// The owner publishes the one plan this app sells: a price picked from the
// workspace's Stripe account, or one created here. The Stripe key is saved
// browser → platform through the SDK hooks; this app's server never sees it.

import { useEffect, useState } from "react";
import {
  useCreateIntegrationCredentialMutation,
  useGetMaskedIntegrationCredentialsQuery,
  useUpdateIntegrationCredentialMutation,
} from "@iblai/iblai-js/data-layer";

import { Alert } from "@/components/twin/alert";
import { cn } from "@/lib/utils";
import {
  PaywallRequestError,
  errorMessage,
  fetchAdminPrices,
  fetchCatalogue,
  formatAmount,
  isPublishableKey,
  markSetupDone,
  maskedKeyShort,
  paywallFetch,
  type Access,
  type AdminPriceView,
  type CatalogueView,
} from "@/lib/paywall-client";

const OPTIONS: { value: Access; title: string; detail: string }[] = [
  { value: "one_time", title: "One-time fee", detail: "Pay once, keep access." },
  { value: "monthly", title: "Monthly fee", detail: "A subscription, cancelled any time." },
];

const CREDENTIAL = "stripe";

const FIELD =
  "flex h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-[14px] leading-snug text-[var(--content-title)] shadow-sm outline-none placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50";
const LABEL = "block text-[13px] font-medium text-[var(--foreground)]";
const PRIMARY_BTN =
  "inline-flex h-9 items-center justify-center rounded-[8px] bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4fd8] disabled:pointer-events-none disabled:opacity-50";
const OUTLINE_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-normal text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50";
const CHOICE =
  "flex cursor-pointer flex-col gap-0.5 rounded-[8px] border p-3.5 text-left transition-colors";
const CHOICE_ON = "border-[#2563EB] bg-[#2563EB]/[0.06] ring-1 ring-[#2563EB]";
const CHOICE_OFF = "border-[var(--border)] hover:bg-[var(--accent)]";
const TAB =
  "rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors";

const errorStatus = (e: unknown) =>
  e && typeof e === "object" && "status" in e ? Number((e as { status: unknown }).status) : NaN;

function credentialMessage(e: unknown): string {
  const data = (e as { data?: { error?: string; detail?: string } })?.data;
  return data?.error ?? data?.detail ?? errorMessage(e);
}

function setupMessage(e: unknown): string {
  if (e instanceof PaywallRequestError) {
    if (e.status === 502)
      return "Stripe rejected the key on file. It has to be a secret key (sk_…) or a restricted key (rk_…) from the workspace's Stripe account — a publishable key (pk_…) cannot create products or checkouts. Replace it below and publish again.";
    if (e.status === 403) return "Only workspace admins can set up payments.";
    if (e.status === 400) return e.message;
  }
  return errorMessage(e);
}

type Mode = "existing" | "create";

export function PaymentsSettings({ tenantKey }: { tenantKey: string }) {
  const [catalogue, setCatalogue] = useState<CatalogueView | null>(null);
  const [existing, setExisting] = useState<AdminPriceView[] | null>(null);
  const [existingError, setExistingError] = useState("");
  const [mode, setMode] = useState<Mode>("existing");
  const [priceId, setPriceId] = useState("");
  const [access, setAccess] = useState<Access>("monthly");
  const [amount, setAmount] = useState("5");
  const [key, setKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const loadCatalogue = () =>
    fetchCatalogue()
      .then((c) => {
        setCatalogue(c);
        if (c.settings && c.settings.access !== "free") {
          setAccess(c.settings.access);
          if (c.settings.amount) setAmount(String(c.settings.amount / 100));
        }
        if (c.prices[0]?.id) setPriceId((id) => id || c.prices[0].id);
      })
      .catch((e) => setError(errorMessage(e)));

  const loadExisting = () =>
    fetchAdminPrices()
      .then((rows) => {
        setExisting(rows);
        const sellable = rows.filter((r) => r.sellable);
        if (sellable.length === 0) setMode("create");
        else setPriceId((id) => (id && sellable.some((r) => r.id === id) ? id : sellable[0].id));
      })
      .catch((e: unknown) => {
        setExisting([]);
        setMode("create");
        setExistingError(e instanceof PaywallRequestError && e.status === 502 ? "" : errorMessage(e));
      });

  useEffect(() => {
    void loadCatalogue();
    void loadExisting();
  }, []);

  const {
    data: credentials = [],
    isLoading: keyLoading,
    refetch,
  } = useGetMaskedIntegrationCredentialsQuery({ org: tenantKey }, { skip: !tenantKey });
  const [createCredential] = useCreateIntegrationCredentialMutation();
  const [updateCredential] = useUpdateIntegrationCredentialMutation();
  const stored = credentials.find((c) => c.name === CREDENTIAL);
  const storedKey = String(stored?.value?.key ?? "");
  const storedIsPublishable = !!stored && isPublishableKey(storedKey);

  const keyNeeded = !stored || storedIsPublishable || replacing;
  const cents = Math.round(Number(amount) * 100);
  const priceValid = Number.isFinite(cents) && cents > 0;
  const sellable = (existing ?? []).filter((r) => r.sellable);
  const chosen = sellable.find((r) => r.id === priceId);

  const saveKey = async () => {
    const value = key.trim();
    const requestBody = { name: CREDENTIAL, value: { key: value }, platform: tenantKey };
    try {
      await createCredential({ org: tenantKey, requestBody }).unwrap();
    } catch (e) {
      const status = errorStatus(e);
      if (status === 409 || status === 400)
        await updateCredential({ org: tenantKey, requestBody }).unwrap();
      else throw new Error(credentialMessage(e));
    }
    setKey("");
    setReplacing(false);
    void refetch();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved("");
    if (mode === "existing" && !chosen) {
      setError("Pick one of the prices, or create a new one.");
      return;
    }
    if (mode === "create" && !priceValid) {
      setError("Enter a price greater than zero.");
      return;
    }
    if (keyNeeded) {
      const value = key.trim();
      if (!value) {
        setError("Paste the Stripe secret or restricted key for this workspace's Stripe account.");
        return;
      }
      if (isPublishableKey(value)) {
        setError("That is a publishable key (pk_…). Stripe needs a secret (sk_…) or restricted (rk_…) key here.");
        return;
      }
    }
    setBusy(true);
    try {
      if (keyNeeded) await saveKey();
      await paywallFetch("/api/paywall/admin/setup", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        json: mode === "existing" ? { price_id: priceId } : { access, amount: cents },
      });
      markSetupDone();
      setSaved(
        "Published. Anyone who signs in without a membership now sees this plan and becomes a member when they pay.",
      );
      await Promise.all([loadCatalogue(), loadExisting()]);
    } catch (e) {
      setError(setupMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const live = catalogue?.paywall ? catalogue.prices[0] : null;

  return (
    <section
      id="payments"
      aria-labelledby="payments-title"
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
    >
      <div className="mb-4">
        <h2 id="payments-title" className="text-[15px] font-semibold text-[var(--content-title)]">
          Access &amp; payments
        </h2>
        <p className="mt-1 text-[13px] text-[var(--content-caption)]">
          Nobody joins without paying: a visitor signs in with ibl.ai, sees this plan, pays on the
          workspace&apos;s own Stripe account and becomes a member. The platform mints the checkout
          and records payments; this app never holds a Stripe key.
        </p>
      </div>

      {catalogue?.source === "free" && (
        <Alert className="mb-4">
          Free access is on: the platform&apos;s self-join switch is open, so anyone who signs in joins
          this workspace and nothing is sold. Close self-join on the platform to sell the plan below.
        </Alert>
      )}
      {catalogue && !catalogue.paywall && catalogue.source !== "free" && (
        <Alert className="mb-4">
          No plan is published yet, so nobody outside the workspace can join. Pick a price and
          publish it.
        </Alert>
      )}
      {live && (
        <p className="mb-4 text-[13px] text-[var(--content-title)]">
          <span className="font-medium">Live plan:</span> {live.name || "Full access"} ·{" "}
          {formatAmount(live.unitAmount, live.currency)}
          {live.interval ? ` / ${live.interval}` : " once"}{" "}
          <span className="font-mono text-[12px] text-[var(--content-caption)]">{live.id}</span>
        </p>
      )}
      {catalogue && !catalogue.serverReady && (
        <Alert className="mb-4">
          The server has no platform credential. Set IBLAI_API_KEY (a Platform API Token from
          os.ibl.ai → Integrations → APIs) or IBLAI_ADMIN_TOKEN (your own dm_token) in .env.local;
          until then a plan can be published, but buyers cannot check out.
        </Alert>
      )}
      {catalogue?.source === "env" && (
        <p className="mb-4 text-[12.5px] text-[var(--content-caption)]">
          PAYWALL_PRICE_IDS is set on the server, so it decides what is sold until it is unset.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div
          role="tablist"
          aria-label="Where the plan comes from"
          className="inline-flex gap-1 rounded-[8px] border border-[var(--border)] p-1"
        >
          {(["existing", "create"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                TAB,
                mode === m
                  ? "bg-[#2563EB] text-white"
                  : "text-[var(--content-caption)] hover:bg-[var(--accent)]",
              )}
            >
              {m === "existing" ? "Use a price from Stripe" : "Create a new price"}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <fieldset className="space-y-2">
            <legend className={cn(LABEL, "mb-2")}>
              Active prices on the workspace&apos;s Stripe account
            </legend>
            {existing === null ? (
              <p className="text-[13px] text-[var(--content-caption)]">Loading prices from Stripe…</p>
            ) : sellable.length === 0 ? (
              <p className="text-[13px] text-[var(--content-caption)]">
                {existingError
                  ? `Could not list prices: ${existingError}`
                  : "No usable price yet (USD, one-off or billed every month). Create one here, or add it in Stripe and reload."}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {sellable.map((p) => {
                  const selected = priceId === p.id;
                  return (
                    <label key={p.id} className={cn(CHOICE, selected ? CHOICE_ON : CHOICE_OFF)}>
                      <input
                        type="radio"
                        name="price_id"
                        value={p.id}
                        checked={selected}
                        onChange={() => setPriceId(p.id)}
                        className="sr-only"
                      />
                      <span className="text-[14px] font-medium text-[var(--content-title)]">
                        {p.name || "Untitled product"}
                      </span>
                      <span className="text-[12.5px] text-[var(--content-caption)]">
                        {formatAmount(p.unitAmount, p.currency)}
                        {p.interval ? ` / ${p.interval}` : " once"} ·{" "}
                        <span className="font-mono">{p.id}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {(existing ?? []).some((r) => !r.sellable) && (
              <p className="text-[12px] text-[var(--content-caption)]">
                Prices in other currencies or billed yearly/weekly are not listed; this app sells USD,
                one-off or monthly.
              </p>
            )}
          </fieldset>
        ) : (
          <>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Access</legend>
              {OPTIONS.map((option) => {
                const selected = access === option.value;
                return (
                  <label key={option.value} className={cn(CHOICE, selected ? CHOICE_ON : CHOICE_OFF)}>
                    <input
                      type="radio"
                      name="access"
                      value={option.value}
                      checked={selected}
                      onChange={() => setAccess(option.value)}
                      className="sr-only"
                    />
                    <span className="text-[14px] font-medium text-[var(--content-title)]">{option.title}</span>
                    <span className="text-[12.5px] text-[var(--content-caption)]">{option.detail}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className="space-y-1.5 sm:max-w-xs">
              <label htmlFor="payments-price" className={LABEL}>
                {access === "monthly" ? "Price per month" : "Price"} (USD)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[var(--muted-foreground)]">
                  $
                </span>
                <input
                  id="payments-price"
                  type="number"
                  min="0.5"
                  step="0.01"
                  inputMode="decimal"
                  className={cn(FIELD, "pl-7")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5 sm:max-w-md">
          <label htmlFor="payments-stripe-key" className={LABEL}>
            Stripe key
          </label>
          {stored && !replacing && !storedIsPublishable ? (
            <div className="flex h-10 items-center justify-between gap-3 rounded-[8px] border border-[var(--border)] px-3 text-[13px] text-[var(--content-caption)]">
              <span>
                On file: <span className="font-mono">{maskedKeyShort(storedKey)}</span>
              </span>
              <button
                type="button"
                className="text-[#2563EB] underline-offset-4 hover:underline"
                onClick={() => setReplacing(true)}
              >
                Replace
              </button>
            </div>
          ) : (
            <>
              {storedIsPublishable && (
                <p className="text-[12.5px] text-[#b5551a]">
                  The key on file (<span className="font-mono">{maskedKeyShort(storedKey)}</span>) is a
                  publishable key and cannot create products or checkouts. Paste the secret or
                  restricted key instead; it replaces this one.
                </p>
              )}
              <input
                id="payments-stripe-key"
                type="password"
                autoComplete="off"
                placeholder="sk_… or rk_…"
                className={FIELD}
                value={key}
                disabled={keyLoading}
                onChange={(e) => setKey(e.target.value)}
              />
            </>
          )}
          <p className="text-[12px] text-[var(--content-caption)]">
            Stripe → Developers → API keys. A restricted key needs write on Products, Prices,
            Checkout Sessions and Customers, read on Subscriptions. Stored on the platform, not in
            this app.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-[#b5551a]">
            {error}
          </p>
        )}
        {saved && (
          <p aria-live="polite" className="text-[13px] text-[#2f7a4a]">
            {saved}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || keyLoading} className={PRIMARY_BTN}>
            {busy ? "Publishing…" : live ? "Publish this plan instead" : "Publish plan"}
          </button>
          {replacing && (
            <button
              type="button"
              className={OUTLINE_BTN}
              onClick={() => {
                setReplacing(false);
                setKey("");
              }}
            >
              Keep current key
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
