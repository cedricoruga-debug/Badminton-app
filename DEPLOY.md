# Going live (Vercel + GitHub)

This app now has a login (see below), so it's safe to put it on the public internet — only someone with an account can actually use it once it's deployed.

## 1. Lock down the database (do this first, before deploying)

1. Open your Supabase project → **SQL Editor** → paste in the contents of `supabase/enable_auth_policies.sql` from this repo → **Run**. This switches every table from "anyone with the app's public key can read/write" to "must be signed in."
2. Still in Supabase: **Authentication → Users → Add user**.
   - Email: `cedric.oruga@gmail.com`
   - Password: pick your own (don't use a placeholder like `123456` — since you're creating this yourself, just set the real one directly; there's no need for a temporary password you'd have to change later).
   - Check **Auto Confirm User** so it doesn't wait on a confirmation email.
3. That's your login for the deployed app. You can add more users the same way later, and everyone can change their own password from the app's Settings icon once signed in.

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
2. Before clicking Deploy, open **Environment Variables** and add the same two values from your local `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy**. Vercel gives you a `https://<project>.vercel.app` link when it's done — that's what you open on your iPad/phone.
4. From now on, every `git push` to `main` auto-deploys the latest version — no extra steps.

## 4. First login

Open the Vercel link, sign in with the email/password you created in step 1. You'll land on the same dashboard you're used to — it just now requires a login, and works from any device with a browser.
