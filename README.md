# Collector Scanner

eBay marketplace search built for trading card collectors. Filter by autograph, print run, and price simultaneously. Pulls live data from eBay's Browse API.

---

## Before you start

You need three things installed. If you already have them, skip ahead.

| Tool | Why | Check it's installed | If missing |
|------|-----|---------------------|------------|
| **Node.js 18+** | Runs the app | `node -v` | Download from [nodejs.org](https://nodejs.org) — pick the LTS version |
| **Git** | Pushes code to GitHub | `git --version` | Download from [git-scm.com](https://git-scm.com) |
| **A code editor** | Opens `.env.local` to paste keys | — | [VS Code](https://code.visualstudio.com) is the standard |

You also need:
- **An eBay developer account** with **Production** keys (App ID + Cert ID) — get them at [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys)
- **A GitHub account** ([github.com/signup](https://github.com/signup))
- **A Vercel account** ([vercel.com/signup](https://vercel.com/signup)) — sign in with GitHub for the smoothest setup

---

## Part 1 — Run it on your computer (5 minutes)

This step proves everything works before you put it on the public internet.

### Step 1.1 — Unzip and open the folder

Unzip `collector-scanner.zip`. You'll get a folder called `collector-scanner`. Open a terminal and `cd` into it:

```bash
cd path/to/collector-scanner
```

> **Don't know how to open a terminal?**
> - **Mac:** Press `⌘ + Space`, type "Terminal", hit Enter
> - **Windows:** Press `Win + R`, type `powershell`, hit Enter

### Step 1.2 — Install dependencies

```bash
npm install
```

This downloads everything the app needs. Takes 30–60 seconds. Ignore any `npm warn` messages — they're harmless.

### Step 1.3 — Add your eBay keys

Copy the example env file into a real one:

**Mac/Linux:**
```bash
cp .env.local.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.local.example .env.local
```

Now open `.env.local` in your code editor and replace the placeholder text with your real keys:

```
EBAY_APP_ID=ActualAppIdFromEbay-PRD-1234567890-abcdef
EBAY_CERT_ID=PRD-abcdef1234567890-abcd-efgh-ijkl
```

> ⚠️ **Critical:** Use your **Production** keys, not Sandbox. The toggle is at the top of [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys). Sandbox keys return empty data — the app will look broken even though it isn't.

### Step 1.4 — Start the app

```bash
npm run dev
```

You'll see something like:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
✓ Ready in 2.1s
```

Open **http://localhost:3000** in your browser.

### Step 1.5 — Test it

Type **`Mahomes auto`** in the search box and hit Enter. You should see real eBay listings with prices, images, and "View on eBay" links.

If it works, you're done with Part 1. Stop the server with `Ctrl + C` in the terminal and continue to Part 2.

> If it doesn't work, jump to [Troubleshooting](#troubleshooting) at the bottom.

---

## Part 2 — Deploy it to the internet (10 minutes)

### Step 2.1 — Put the code on GitHub

In your terminal, still inside the `collector-scanner` folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

Now create a new repo on GitHub:
1. Go to [github.com/new](https://github.com/new)
2. Name it `collector-scanner` (or anything you want)
3. Leave it **Private** if you don't want others reading your code
4. **Don't** check "Add a README" — your folder already has one
5. Click **Create repository**

GitHub will show you a few commands. Copy the ones under **"...or push an existing repository from the command line"** and run them in your terminal. They'll look like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/collector-scanner.git
git branch -M main
git push -u origin main
```

### Step 2.2 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Find your `collector-scanner` repo in the list and click **Import**
3. On the configuration screen, expand **Environment Variables** and add all four:

   | Name | Value |
   |------|-------|
   | `EBAY_APP_ID` | (paste your App ID) |
   | `EBAY_CERT_ID` | (paste your Cert ID) |
   | `RESEND_API_KEY` | (paste your Resend API key — see below) |
   | `RESEND_AUDIENCE_ID` | (paste your Resend Audience ID — see below) |

4. Click **Deploy**

Wait ~60 seconds. Vercel will give you a live URL like `collector-scanner-abc123.vercel.app`. Open it and run the same test search.

**You're live.** 🚀

> **Don't have Resend keys yet?** That's fine — leave those two env vars blank and the site still works. The Alerts waitlist form will return a friendly error in production until you add them. To set them up: create a free account at [resend.com](https://resend.com), create an Audience (Audiences → Create Audience → name it "Fields & Floors waitlist"), then grab the API key from API Keys and the Audience ID from the audience's settings page.

---

## What's in the project

```
collector-scanner/
├── app/
│   ├── api/
│   │   ├── search/route.js     ← eBay OAuth + Browse API call (the backend)
│   │   └── waitlist/route.js   ← Resend Audiences signup for /alerts
│   ├── components/             ← Shared Header, Footer, Seal, PageShell
│   ├── how-it-works/           ← Editorial subpages
│   ├── filters/
│   ├── alerts/                 ← Waitlist form + page
│   ├── reading-list/
│   ├── glossary/
│   ├── contact/
│   ├── page.js                 ← The main search UI
│   ├── layout.js               ← Wraps every route with Header + Footer
│   └── globals.css             ← Colors, fonts, texture, prose styling
├── package.json                ← Lists dependencies
├── next.config.js              ← Allows eBay image domains
├── tailwind.config.js          ← Tailwind setup
├── postcss.config.js           ← CSS processor
├── .env.local.example          ← Template for your keys
├── .gitignore                  ← What Git ignores
└── README.md                   ← This file
```

One Next.js app, one deploy. No separate backend server.

---

## How it actually works

When someone searches:

1. User types a query and clicks Search
2. Browser sends a POST to `/api/search` with the query + filters
3. Server gets an OAuth access token from eBay (cached in memory for ~2 hours)
4. Server calls eBay's Browse API with the token
5. Server reshapes the response and returns only what the UI needs
6. Browser renders the results

**Your eBay keys never leave the server.** Visitors can't see them in the browser.

---

## Costs

| | Cost | Limit |
|---|---|---|
| Vercel (Hobby plan) | **Free** | 100 GB bandwidth/month |
| eBay Browse API | **Free** | 5,000 calls/day default |
| **Total** | **$0** | Until real traffic arrives |

---

## What's NOT in v1 (and why)

Cut intentionally to ship something that works *today* instead of something half-built:

- **Notifications & price alerts** — need a database + scheduled background jobs. Coming in v2.
- **User accounts** — unnecessary until alerts ship.
- **eBay Partner Network affiliate links** — require an approved site with traffic. Apply once you have users.
- **Google AdSense** — same. Apply once the site is established.

---

## Troubleshooting

**`npm: command not found`**
Node.js isn't installed. Install from [nodejs.org](https://nodejs.org), then close and reopen your terminal.

**`Error: eBay OAuth failed (401)`**
Your App ID or Cert ID is wrong, or you're using Sandbox keys. Double-check `.env.local` and confirm you're on the **Production** tab at [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys).

**`Error: eBay credentials missing`**
You haven't created `.env.local`, or you saved it with the wrong name (e.g. `.env` instead of `.env.local`). Re-do Step 1.3.

**Search returns empty results, no error**
Either the search term is too obscure or you're on Sandbox keys. Try `Mahomes` (broad term) on Production keys.

**Page loads unstyled / no fonts**
Hard refresh: `⌘ + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows). If still broken, stop the dev server, delete the `.next` folder, and run `npm run dev` again.

**Vercel build fails**
Open the build log on Vercel and read the error. Most common cause: missing environment variables. Go to your Vercel project → Settings → Environment Variables and confirm both keys are set.

**Something else**
Copy the exact error message and ask Claude — we'll fix it together.

---

## What to do after you deploy

1. **Test 5–10 real searches** on the live URL. Try different card types.
2. **Watch your eBay developer console** for API errors or rate-limit warnings.
3. **Get the URL in front of 10 real collectors** — Reddit (r/baseballcards, r/basketballcards), Discord servers, Twitter/X. Watch what they do.
4. **Don't build v2 features yet.** Wait for feedback. What you *think* matters and what users *actually* use are usually different.

## Refreshing the player list (every quarter)

The search box suggests player names as you type and offers "Did you mean…?" for typos. It runs in the browser with no API and no cost. The list has two parts:

- **`lib/athletes-rosters.json`**: every current NBA, WNBA, NFL, MLB and NHL roster player, plus college football and basketball players in the ACC, Big 12, Big East, Big Ten and SEC. Refreshed by a script.
- **`lib/teams.json`**: every NBA, WNBA, NFL, MLB and NHL team plus about 80 major-conference colleges, for team search. Refreshed by the same script. Nicknames and old city names ("Sixers", "Oakland Raiders") are kept by hand in `lib/teams.js`.
- **`lib/playerTeams.json`**: which teams each player has been on, by season, so a team search finds cards that name the player but not the team ("2024 Topps Chrome Paul Skenes"). Kept up to date by the same script; matching is in `lib/playerTeams.js`.
- **`lib/athletes.js`**: kept by hand. Stars (shown first), legends, college players and prospects not yet on a pro roster, and nicknames like "Wemby".

Once a quarter (January, April, July, October):

1. In the project folder, run `node scripts/update-athletes.mjs`. It takes about 20 seconds and needs internet. It reads ESPN's free public roster pages. No account or key, and nothing about you or your users is sent. If one league fails, that league keeps last quarter's names.
2. Open `lib/athletes.js` and update it by hand: add new draft picks and hot prospects to `PROSPECTS`, and move breakout players into `STARS`.
3. Commit the changed files and deploy as usual.

The quarterly run moves players to their new teams in `lib/playerTeams.json` without extra requests. To rebuild the player history from scratch (10 pro seasons, 5 college), run `node scripts/update-athletes.mjs --history`. It makes about 2,200 extra requests and takes about 30 minutes, so only do it if the file is lost or badly out of date.

## Adding a set each quarter (rarity colour lists)

The card popup's colour ladder comes from `lib/parallelData.js`. Most sets are generated from `scripts/parallel-sets.json` into `lib/parallelDataExtra.js`. Don't edit the generated file by hand.

1. Find the set's page on checklistinsider.com (for example `2026-topps-chrome-football`). Run `node scripts/checklist-parallels.mjs https://www.checklistinsider.com/<page>` to list its sections, and note the exact heading of the base list (often "Base Checklist") and of the main autograph line ("Chrome Prospect Autographs Checklist", "Rookie Autographs Checklist"...).
2. Add one entry to `scripts/parallel-sets.json` for the base list, and one with `"kind": "auto"` for each autograph list, copying a similar set (same `brand` for the same product). Set `"pulled"` to today's date. A new product name (a brand the parser doesn't know yet) also needs a rule in `BRANDS` in `lib/parseSetFromTitle.js`.
3. Run `node scripts/build-parallel-data.mjs --check` and read the summary: names and print runs should match the checklist page. Then run it without `--check` to write the file. It makes one request per page, a second apart.
4. Add a few real listing titles for the new set to `mockups/parser-test-cases.json` (including one that should stay unmatched, like an insert), then run `node scripts/test-parser.mjs`. Every row must pass; it rewrites `mockups/parser-test-results.md`.
5. Commit and deploy as usual.

Facts only: names, print runs, pack odds and box exclusives, with the source page linked in the popup. No descriptions are copied, and the lists aren't offered for download.
