# Decisions Log

Everything Landon has decided, so no agent ever asks him the same thing twice. Only the boss session edits this file. **Agents: read this before asking any question. If it's answered here, don't ask. If it isn't, send the question to the boss, never to Landon directly.**

## Prices and plans
- Base costs **$6.99 CAD a month or $59 CAD a year**, with a **14-day free trial**. The website and iOS app must match. App Store prices use Canada as the base country. (2026-10-19, 2026-10-21)
- Plans: **Free** (unlimited searches and saved searches, watchlist, **1 alert**) · **Base** (alerts on **up to 5** saved searches, bid reminders) · **Premium** (coming soon). (2026-10-20)
- Yearly price wording: "or $59/yr, over 3 months free". (2026-10-21)
- Prices are shown as **plus applicable taxes**. (2026-10-21)
- Annual on the web shows "coming soon" until Landon creates the yearly Stripe price. (2026-10-20)
- Inside the iOS app: Apple in-app purchase only. No Stripe, no web prices, no hard-coded prices. (2026-10-19)

## Money and partners
- Join the **eBay Partner Network**. Affiliate copy and links switch on only once Landon has a Campaign ID. (2026-10-20)
- **Hold** the eBay quota increase request until daily usage is regularly above ~3,000 calls. (2026-10-20)
- Funnel tracking goes in **our own Supabase table**, not Vercel paid events. (2026-10-21)
- Funnel numbers **leave out Landon's and the agents' browsers** (admin sign-in, or fieldsandfloors.com/?internal=1). (2026-10-23)
- Tracking records funnel steps only, **not search words or which players people look at**. (2026-10-21)

- **Price history: on hold.** No sold-prices button and no price history of our own (eBay's license likely forbids storing or aggregating their data for this). Revisit only with eBay's sold-data (Marketplace Insights) approval or another legitimate source. (2026-10-22)

- **eBay only** for listings. No scraping other marketplaces; their terms forbid it. Other sites only through an official partnership, and that's not on the list for now. (2026-10-23)

## Look and feel
- Landing page is **direction A**: the live featured card as the hero object. (2026-10-19)
- The **intro plays once each time someone opens the site** (not first visit only) and lasts under 1 second. (2026-10-21)
- Text is never smaller than **11px**, except 10px for small uppercase mono labels. Corner radii are **4 / 8 / 12 / full**. (2026-10-20)
- Main buttons are **solid gold-bright**. The gold gradient is only for the Grail tier chip. (2026-10-20)
- Tier colours: Grail gold /1–25, Ultra platinum /26–99, Rare bronze /100–249, Scarce steel /250+. (2026-10-19)
- Rarity view uses **rungs** with the real card on its row, not the v2 ladder. (2026-10-20)
- iOS app gets a **floating pill tab bar**: Search · Watchlist · Alerts · Account. (2026-10-20)
- All 7 items from the landing conversion review are approved, and done in parallel rather than week by week. (2026-10-21)
- The proof strip only ever shows **real numbers**. With no honest number, ship no strip. (2026-10-21)

- The site and app must look **professionally made, not AI-generated**: real data and photos, consistent icons, restrained effects, specific (not template) copy. (2026-10-21)
- Professional-polish audit (mockups/professional-polish.html) **approved, except the hero motion, which stays as it is** (float, shimmer, glow, live dot). (2026-10-21)
- Premium plan card says "Coming soon. Tell us what you'd want in it.", with no invented features. (2026-10-21)
- Signed-in home **approved as mocked** (mockups/signed-in-home.html A and B): search first, saved and recent searches as chips, "Since you were last here" (new matches, price drops, ending soon), 5 live cards, and one upgrade line for free members. Leaner in the app. (2026-10-21)
- On the signed-in home, **"Live right now" shows live cards from the member's own saved searches and recently searched players**, rarest first. It falls back to featured Grail cards when they have none. (2026-10-22)
- Signed-out How it works is **3 icons** ("Pick print runs" · "Star cards" · "Get alerted"). Plans are a **price plus one line each**. (2026-10-21)
- The home page is **too wordy**. Redo it as show, don't tell: about 25 words above the fold, the eBay comparison shown with real cards instead of a text table, How it works as icons plus 3–4 words, Plans as a price plus one line. Mockup first. (2026-10-21)
- eBay comparison, row 1: eBay *can* search several print runs, but only through Advanced Search or a boolean search, so we say we let you **easily** pick them. Landon asked for this to be strictly accurate. (2026-10-21)
- Signed-out home is **Option A**: "The Grail Hunter." with "Just try it." above the search, and a real-card strip "One search. Rarest first." (2026-10-21)
- Comparing ourselves to eBay is fine, but only with claims we can back up (e.g. eBay's saved-search emails are once a day). No overstated claims. (2026-10-21)

- The site must clearly say **we're a search tool only**: we don't sell, inspect or guarantee cards (authenticity, condition, the right card arriving), and our labels come from listing titles and can be wrong. This appears in full in the Terms, **in formal legal wording**, and as short plain lines on the card popup and in the footer. (2026-10-21)

- Price filter is **quick picks plus typeable min and max boxes** (Landon changed from the slider to option A). Quick picks only fill in the max: Under $50 · Under $100 · Under $250 · Under $500 · Under $1,000 · No max. Users type a min if they want one. No $5,000 cap, and min/max swap if reversed. (2026-10-23)
- Signed-in home gets the **bold layout** (big centred search, larger chips, panels and cards). Its heading reuses approved lines: **"The Grail Hunter." with "One search. Rarest first."** Memorable, and it says what the search is for. Don't invent new headings. (2026-10-23)
- Searches start at **any price** (no max), not "Under $1,000", so grail cards aren't hidden. (2026-10-23)

- Auction reminders: members pick **any mix of 3 hours, 1 hour, 30, 15 or 5 minutes** before the end, each sent once, still with the optional "only if the bid is under $X". A reminder-only check runs **every 5 minutes**. (2026-10-23)
- Option for later (**not decided**): free alerts as a daily summary, Base hourly. Revisit after ~30 days of funnel data. (2026-10-23, CFO)

- Rarity colour lists grow to **~25 most-hunted sets from the last two seasons, including autograph colour lists**, with new releases added quarterly. Facts only from checklist sources. (2026-10-23)

## Search
- Spelling suggestions cover pro players **and college players**. The roster refresh is run by hand once a quarter. (2026-10-20, 2026-10-21)
- Card company filter, including Leaf and the listed product lines. (2026-10-20)
- Lots, repacks and sealed product are hidden by default. The Auto filter drops "non-auto" titles. (2026-10-21)
- Team search: whole-team search plus a Team filter, **college teams included**, 8 teams shown then "+ more". **Same-name teams (Rangers, Kings, Giants…) with no city or sport in the title are left out.** (2026-10-21; Landon's final answer) A title naming a player who clearly played for one of them (e.g. deGrom + Rangers) isn't unclear, so it counts. "NY" and "LA" count as city names. (2026-10-22)
- Team search also finds cards that **name only the player**, using a player-to-team history matched by card year. (2026-10-22)

## Tours
- Web and app tours are approved. Step 3 shows tier colours using example search results. (2026-10-20)

## How we work
- All questions go through the boss and are asked **once**. (2026-10-20, 2026-10-21)
- Once Landon approves, the boss pushes and deploys the poller. Landon pastes SQL into the Supabase SQL Editor himself. (2026-10-20)
- Every privacy or security risk is stated plainly before Landon is asked to do anything. (2026-10-20)
