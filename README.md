# FitTrack

A personal fitness tracker with login, a daily log, a day view and analytics.
It's free to run: the website is hosted on GitHub Pages and the data and login are handled by Supabase.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Login and sign-up page |
| `log.html` | Daily entry page: meals with times, weight, steps, gym, sleep, InBody |
| `foods.html` | Your food library, with nutrition saved once per food |
| `day.html` | Pick a date and see everything logged that day |
| `analytics.html` | Charts, summaries, weekly averages and CSV export |
| `config.js` | Your Supabase keys and daily targets (edit this) |
| `app.js`, `styles.css` | Shared code and styling |
| `schema.sql` | Database setup, run in Supabase (safe to run again) |

## Setup (about 15 minutes)

### 1. Create the database (Supabase)
1. Go to https://supabase.com and sign up (free, no card needed).
2. Click **New project**. Pick any name, set a database password, and choose the region closest to you (for India: **Mumbai, ap-south-1**).
3. When it's ready, open **SQL Editor → New query**, paste everything from `schema.sql`, and click **Run**. You should see "Success".
4. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
5. Paste both into `config.js`.

### 2. Put the website online (GitHub Pages)
1. Sign up at https://github.com (free).
2. Click **New repository**, name it `fittrack`, set it to **Public**, and create it.
3. Click **uploading an existing file**, drag in all the files from this folder, and click **Commit changes**.
4. Go to **Settings → Pages**. Under "Branch", choose **main** and **/ (root)**, then click **Save**.
5. After a minute your site is live at `https://YOUR-USERNAME.github.io/fittrack/`.

### 3. Connect login to your site
1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your GitHub Pages address, e.g. `https://YOUR-USERNAME.github.io/fittrack/`.
3. Add the same address under **Redirect URLs**.

### 4. Create your account
1. Open your site and tap **Create an account**.
2. Confirm the email Supabase sends you, then log in.
3. Optional but recommended: once your account exists, go to **Authentication → Sign In / Providers** in Supabase and turn off **Allow new users to sign up**, so nobody else can create accounts on your app.

Add the site to your phone's home screen (browser menu → "Add to Home screen") so it opens like an app.

## Logging meals
1. Open **Foods** once and tap **Add common foods** to load about 20 everyday items (milk, eggs, roti, dal, rice, fruits, whey and more). The values are typical averages, so edit them to match the brands you use.
2. On **Log**, tap **+ Add meal**, set the time and meal name, and type one item per line with the amount first:
   ```
   200ml milk
   55g yogabar dark chocolate protein oats
   150g guava
   1 full egg
   4 egg whites
   ```
3. A preview shows what each line matched and its calories, protein and fiber. If a food isn't in your library, tap **Add** on that row, enter the values from the pack (or use **Search packaged foods online**), and save it. Next time it's recognised automatically.
4. Tap **Save meal**. The day's calories, protein, carbs, fat and fiber update automatically and flow into the Day and Analytics pages.

Amounts can be grams (`150g`), ml (`200ml`), kg or litres, cups/tbsp/tsp for foods measured in g or ml, or a count (`2 eggs`, `1 scoop whey`, `3 roti`) for foods saved "per piece".

## Already ran the first version of schema.sql?
Run the whole updated `schema.sql` again in the SQL Editor. It only adds the new tables and keeps your existing data.

## Changing targets
Edit the `targets` section in `config.js` (calories, protein, fiber, steps, sleep, water, gym days), then upload the file to GitHub again.

## Good to know
- **Security:** the anon key in `config.js` is designed to be public. Row Level Security (set up by `schema.sql`) ensures each logged-in user can only read and change their own data.
- **Inactivity pause:** Supabase pauses free projects after 7 days with no activity. Logging daily prevents this. If it does pause, open the Supabase dashboard and click **Restore**. Your data is kept.
- **Backups:** use **Export all data (CSV)** on the Analytics page every few weeks.
- **One entry per day:** saving a date that already has data updates that day instead of duplicating it.
