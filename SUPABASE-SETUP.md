# Supabase setup for Flavours Business Manager

The app keeps local storage as its offline source of truth. Supabase cloud backup is optional and currently requires a Supabase Auth account. The browser uses only the project's publishable key; payment and push secrets must remain server-side.

## Set up the project

1. In Supabase, create an Auth user for the business owner under **Authentication → Users**. Keep sign-up disabled unless you want the public registration flow enabled.
2. Open **SQL Editor**, paste and run [`supabase/migrations/202611240001_flavours_cloud_and_integrations.sql`](supabase/migrations/202611240001_flavours_cloud_and_integrations.sql).
3. Deploy the app over HTTPS (or use localhost during development). The supplied project URL and publishable key are in `public/supabase-config.js`.
4. Sign in to Flavours with the existing administrator PIN, open **Settings**, sign in with the Supabase Auth email and password, then use **Upload to cloud**. On another device, sign in to the same Supabase account and use **Restore from cloud**.

The first upload is a manual backup. Restoring replaces the local business data, so download a JSON backup first. Cloud syncing does not merge concurrent edits between devices. Treat the Supabase account as the business owner account: the stored backup includes business records, staff PIN hashes, settings, and TPIN.

## Database security

The migration creates private owner-scoped RLS policies. The `anon` role cannot access backup or integration tables. Create owner accounts in Supabase Auth; do not add public table policies. Payment API keys and VAPID private keys are intentionally absent from SQL and browser configuration.

## Lipila and push notification requirements

The migration provides RLS-protected tables for payment metadata, transaction records, notification settings, device subscriptions, notifications, delivery logs, and webhook event deduplication. It does not enable real Lipila processing or Web Push by itself. Those require deployed server-side functions, merchant credentials, webhook signing secret, VAPID key pair, and tested device/provider flows. Never put a Lipila API key, webhook secret, VAPID private key, or Supabase service-role key in `app.js`, `public/supabase-config.js`, or local storage.

Lipila's current docs describe separate mobile-money and card collection endpoints. The mobile-money initiation request does not accept a network selector; the actual supported network routing and merchant capabilities must be confirmed with Lipila before enabling a particular method. Card checkout must use Lipila's hosted `cardRedirectionUrl`; Flavours must never collect card number, CVV, or PIN.
