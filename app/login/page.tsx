"use client";

/**
 * Twin's sign-in screen, rebuilt from its deployed markup and stylesheet.
 *
 * The structure and class names mirror twin.memorare.ai exactly (see
 * ./login.css, lifted verbatim from its production CSS), including the
 * inline custom properties it sets on `.login-page` and `.logo-section`.
 *
 * Both actions hand off to the ibl.ai Auth SPA, which is what actually
 * issues the session. Twin runs its own email-code step in front of that;
 * we don't reimplement it, so "Continue with email" carries the address
 * across and lets the SPA take it from there.
 */

import { useState } from "react";

import { redirectToAuthSpa } from "@/lib/iblai/auth-utils";

const EMAIL = /^\S+@\S+\.\S+$/;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go() {
    setBusy(true);
    void redirectToAuthSpa(undefined, undefined, false, true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    go();
  }

  return (
    <div className="min-h-screen">
      <div
        className="login-page w-full"
        style={
          {
            "--section-gap": "3.1rem",
            "--logo-h": "4rem",
            "--control-h": "3.25rem",
            "--control-font": "1.0625rem",
            "--card-pad": "1.625rem",
            "--stack-gap": "1.375rem",
            "--brand-font": "2.625rem",
          } as React.CSSProperties
        }
      >
        <main className="login-column">
          <div className="login-column__inner">
            <div
              className="logo-section logo-section--custom"
              style={
                {
                  "--logo-img-h-custom": "43.333333333333336px",
                  "--logo-img-margin-top-custom": "0px",
                  "--logo-img-margin-bottom-custom": "1.3333333333333333px",
                } as React.CSSProperties
              }
            >
              <div className="logo-section__row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="logo-section__img" alt="memorare twin" src="/images/memorare-twin-logo.png" />
                <div className="logo-section__text">
                  <span className="logo-section__line logo-section__line--top">memorare</span>
                  <span className="logo-section__line-wrap logo-section__line-wrap--bottom">
                    <span className="logo-section__line logo-section__line--bottom">twin</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="auth-main">
              <div className="hero">
                <h1 className="hero__title" id="login-title">Create Your AI Twin Video</h1>
                <p className="hero__tagline">
                  <span className="hero__tagline-line1">Generate learning videos using your AI-twin,</span>
                  <span className="hero__tagline-line2">teaching, business, or historical characters.</span>
                </p>
              </div>

              <div className="auth-card">
                <form className="auth-card__stack" noValidate onSubmit={onSubmit}>
                  <div>
                    <input
                      id="login-email"
                      className={error ? "input input--error" : "input"}
                      autoComplete="email"
                      placeholder="Enter your email"
                      required
                      type="email"
                      name="email"
                      value={email}
                      disabled={busy}
                      aria-invalid={!!error}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                    />
                    {error && <p className="field-error" role="alert">{error}</p>}
                  </div>

                  <button type="submit" className="btn btn--primary" disabled={busy}>
                    Continue with email
                  </button>

                  <div className="divider-or">OR</div>

                  <button type="button" className="btn btn--outline" disabled={busy} onClick={go}>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="auth-card__legal">
                    <a target="_blank" rel="noopener noreferrer" href="/terms">Terms of Use</a>
                    <span className="sep">|</span>
                    <a target="_blank" rel="noopener noreferrer" href="/privacy">Privacy Policy</a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
