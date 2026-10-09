# Isolated analytics verification

Owner diagnostic fixture. No automatic visitor collection. Explicit test consent is required; GPC and DNT suppress dispatch. All traffic is diagnostic/QA in the owner-controlled US PostHog project. This site is separate from the portfolio.

The project ingestion key is intentionally public and cannot read analytics. No private or admin key is included. The pinned PostHog SDK is used only for this diagnostic; it is not included in the portfolio release.

HTTPS verification annotations: adapter envelopes additionally carry qa=true, environment=diagnostic and a fixed probe_version; those three fields are test-only and are not a production schema change. Content-derived version queries cover static modules and stylesheet assets.
