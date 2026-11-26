# Keep the database awake with a regular ping

## What you get
A ping every 10 minutes that does one tiny read, so the database never goes to sleep and the first visitor after a quiet night never waits on it. The site already stays up when the database is slow (last fix), so this mainly removes the slow first load.

## Cost (please read)
- 144 pings a day.
- An awake database is billed for every hour it runs. Today it sleeps on quiet nights and days, and this stops that, so your Cloud usage goes up, roughly to the cost of running all day, every day.
- This replaces your earlier "no scheduled jobs" rule just for this ping.

## Steps
1. Add a private ping address on the site that only the platform's scheduler can call (other callers are refused). It reads one category row and returns "ok".
2. Create a managed schedule: every 10 minutes, POST to that address.
3. Leave the existing public health check as it is (for an outside uptime monitor if you want alerts).
4. Update the project note that says "no scheduled jobs" to allow only this keep-alive.
5. Check: ping returns ok when called by the scheduler, is refused without credentials, and the schedule shows as active.

## Free alternative
Instead of step 2, point a free outside monitor (UptimeRobot / Better Stack) at `https://shawtradersev.com/api/public/health` every 5 minutes. It keeps the database awake the same way and also emails you if the site goes down. No code change needed. Same database running cost.

## Technical details
- New route `src/routes/api/public/keep-alive.ts`, POST, first line `authenticateCronRequest(request)` from `src/integrations/supabase/cron-auth.ts`; then `publicClient().from("categories").select("slug").limit(1)`; returns 503 on error, `Cache-Control: no-store`.
- `supabase--create_http_schedule` name `keep-alive`, schedule `*/10 * * * *`, target `/api/public/keep-alive`, body `{"kind":"keep-alive"}`.
- AGENTS.md / project rule: cron allowed only for keep-alive, with cron-auth.
