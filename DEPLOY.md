# Going live (Vercel + GitHub)

This app now has a login (see below), so it's safe to put it on the public internet — only someone with an account can actually use it once it's deployed.

## 1. Lock down the database (do this first, before deploying)

1. Open your Supabase project → **SQL Editor** → paste in the contents of `supabase/enable_auth_policies.sql` from this repo → **Run**. This switches every table from "anyone with the app's public key can read/write" to "must be signed in."
2. Still in Supabase: **Authentication → Users → Add user**. The app logs in with a **username**, not an email — but Supabase Auth only understands "email" internally, so each account's real login email is that username plus a fake domain that never sends or receives real mail: `<username>@badminton.local`. This one dashboard-created account is just to bootstrap your own first login:
   - Email: `ced@badminton.local` (username: `ced`)
   - Password: pick a real one directly — no need for a placeholder you'd have to change later.
   - Check **Auto Confirm User** so it doesn't wait on a confirmation email (nothing is ever actually sent to that fake address).
3. Once you can sign in, add everyone else from inside the app instead — the **Accounts** icon (key icon) in the right-hand rail opens a page to add, delete, and reset passwords for accounts, so you don't need to touch the Supabase dashboard again for that. Everyone signs in with just their username (`ced`, `ron`, `tey`, …) and their own password, and can change their own password later from the Settings icon.

## 2. Push the code to GitHub

In the same terminal you've been using for `npm run dev`, from the `badminton-app` folder:

```bash
git init
git add -A
git commit -m "Ready for deployment"
```

Then on github.com, create a new **private** repository (no README/gitignore — this folder already has them), and it'll show you a couple of commands like:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Run those (copy them straight from GitHub's "push an existing repository" instructions — the exact URL will be specific to your repo).

## 3. Deploy on Vercel

1. On vercel.com, **Add New → Project**, and import the GitHub repo you just pushed.
2. Before clicking Deploy, open **Environment Variables** and add the same values from your local `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Project Settings → API — this is what powers the in-app Accounts page. Add it exactly as `SUPABASE_SERVICE_ROLE_KEY`, with no `NEXT_PUBLIC_` prefix, so it stays server-only)
3. Click **Deploy**. Vercel gives you a `https://<project>.vercel.app` link when it's done — that's what you open on your iPad/phone.
4. From now on, every `git push` to `main` auto-deploys the latest version — no extra steps.

## 4. First login

Open the Vercel link, sign in with the username/password you created in step 1 (just the username, e.g. `ced` — not the `@badminton.local` part, that's only what Supabase stores internally). You'll land on the same dashboard you're used to — it just now requires a login, and works from any device with a browser.
