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
- Tracking records funnel steps only, **not search words or which players people look at**. (2026-10-21)

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
- Signed-in users get a **simpler home**: search first, their recent hunts, then what's new since their last visit, with no sales pitch, especially in the app. A mockup is coming before the build. (2026-10-21)
- The home page is **too wordy**. Redo it as show, don't tell: about 25 words above the fold, the eBay comparison shown with real cards instead of a text table, How it works as icons plus 3–4 words, Plans as a price plus one line. Mockup first. (2026-10-21)
- eBay comparison, row 1: eBay *can* search several print runs, but only with a boolean search, so we say we let you **easily** pick them. (2026-10-21)
- Signed-out headline direction: something like **"The Grail Hunter. Just try it."** (2026-10-21)
- Comparing ourselves to eBay is fine, but only with claims we can back up (e.g. eBay's saved-search emails are once a day). No overstated claims. (2026-10-21)

- The site must clearly say **we're a search tool only**: we don't sell, inspect or guarantee cards (authenticity, condition, the right card arriving), and our labels come from listing titles and can be wrong. This appears in full in the Terms, **in formal legal wording**, and as short plain lines on the card popup and in the footer. (2026-10-21)

## Search
- Spelling suggestions cover pro players **and college players**. The roster refresh is run by hand once a quarter. (2026-10-20, 2026-10-21)
- Card company filter, including Leaf and the listed product lines. (2026-10-20)
- Lots, repacks and sealed product are hidden by default. The Auto filter drops "non-auto" titles. (2026-10-21)
- Team search: whole-team search plus a Team filter, **college teams included**, 8 teams shown then "+ more". **Same-name teams (Rangers, Kings, Giants…) with no city or sport in the title are left out.** (2026-10-21; Landon's final answer)

## Tours
- Web and app tours are approved. Step 3 shows tier colours using example search results. (2026-10-20)

## How we work
- All questions go through the boss and are asked **once**. (2026-10-20, 2026-10-21)
- Once Landon approves, the boss pushes and deploys the poller. Landon pastes SQL into the Supabase SQL Editor himself. (2026-10-20)
- Every privacy or security risk is stated plainly before Landon is asked to do anything. (2026-10-20)
