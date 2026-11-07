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
- **Proof-of-concept / early access: no payments on the site or app for now.** Plans, pricing and checkout are hidden behind one switch (NEXT_PUBLIC_PAYMENTS_LIVE). A small note says "Free during early access", and **everyone gets alerts on up to 5 saved searches plus bid reminders**. On launch day: Vercel Pro, live Stripe keys and the switch go on together. Don't run real payments on Vercel's free plan. (2026-10-26)
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
- In the iOS app the website footer shrinks to **one compact legal line** (© · Support · Privacy · Terms · "A search tool only…" · not affiliated with eBay). The logo and link columns are hidden. It stays visible because signed-out app visitors have no Account menu, and App Review needs Privacy and Terms reachable. (2026-10-25)
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

- Cards with no colour list show the **"Common print runs"** view: "We don't have this set's colours yet. Common print runs show where N copies sit across the hobby." (2026-10-26, Landon's wording)

- Signed-out visitors see a **"why sign up" prompt when they search for a card**, listing the account benefits, with "Not now" to keep searching without an account. **Option B approved**: a card inside the results after the 4th card, on each search until "Not now" for that visit. The sign-up page benefits are approved as mocked (mockups/signup-benefits.html). (2026-10-26, 2026-10-29)

## Non-sports sister site (2026-10-30)
- A **sister site for non-sports collector cards** (Pokémon, Magic: The Gathering and the other biggest games). It copies most of the F&F format but has its **own, more magical look and colours**: it complements F&F but is clearly distinct.
- A **button at the top switches** between the two sites. **One account**: saved searches and starred cards from both sides show together.
- The **iPhone app is called "Fields & Fables"** and has both sides inside it (picked 2026-10-31 over "Rarest First: Card Finder" and "Card Lantern"). The 5 free alerts are **shared across both sides** (one account, one limit).
- Sister look is **A · Night foil** (mockups/sister-site.html): midnight blue-black, moonlight text, Fraunces headlines, holo foil used sparingly (edges, the top rarity chip, one headline word). Landon: "Beautiful mock ups. I like Night foil." (2026-10-30)
- App: **choose a side on launch, then a switch at the top**. Every cold launch opens a Sports / [Sister name] chooser showing both sides equally, with **no last-used highlight**; either side is one tap (Landon: "don't worry about highlighting one. Just make it one tap anyways."). It's skipped when returning from the background and when opening from an alert (which goes straight to the right side). Inside the app, the switch pill sits at the top and there's one shared tab bar. Landon: "I want both. I like the Choose on launch, but once you launch you have the switch at the top." (2026-10-30)
- Name: **Foils & Fables**. Hold off on buying foilsandfables.com for now. **No trademark lawyer** before launch (Landon's call, made knowing the name check was only a quick first look). (2026-10-30)
- Launch games: **Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Disney Lorcana**. Later: Dragon Ball Super, Star Wars Unlimited, Weiss Schwarz, Flesh and Blood, Riftbound. Non-sport Topps/Marvel sets are skipped for now. (Boss default, 2026-10-30)
- Filters and rarest-first order as in research/non-sports-filters.md: serial /N first, then each game's official rarity ladder, then grade. Copy says **"ranked by the rarity printed on the card"** (no print runs are published). (2026-10-30)
- **"Find every version of a card" is the main idea of Foils & Fables** (research section 0). It's added game by game on top of the 5-game launch: Magic (Scryfall) and English Pokémon (TCGdex) first, then Yu-Gi-Oh! (YGOPRODeck) and Lorcana. One Piece stays on filters only. Show seller photos, not catalog art, and a "why it matched" label. No "not seen in months" or price-over-time features (price-history hold). (2026-10-31)
- No email to Scryfall for now (Landon skipped it). Card lists stay free and anonymous anyway. Revisit before charging for anything Magic-related. 15-minute alerts are deferred until payments go live. (2026-10-31)
- **Foils & Fables works like Fields & Floors.** Same interactions everywhere, e.g. the "refresh results" popup after changing filters and spelling suggestions while typing. Only colours, fonts and game-specific filters differ. (2026-10-31, Landon)
- **Card checklist view (both sides):** search a Pokémon/character (or later an athlete on Fields & Floors) and see **every card of them in a very organized, good-looking list**: by set, then card number, then each version (rarity, parallel colour, holo…). Members can **mark which ones they own**: pick the card (e.g. No. 44), then choose the version from a dropdown (Gold / Red / Holo…). Mockup first. This is a light "what I own" list, not a portfolio or value tracker. (2026-10-31, Landon)
- **Checklist must be much simpler:** first mockup had too many words and was hard to follow. Bar: a grandparent new to collecting can use it without feeling overwhelmed. Fewer words, one clear action, extras hidden. (2026-11-01, Landon)
- **Checklist shows the eBay seller's photo** of a card when it's for sale, so the list has pictures; a plain placeholder otherwise. (2026-11-01, Landon)
- **Simpler checklist mockup approved** (mockups/card-checklist.html as of a51566d): photo · name · have-it circle per row, one job per screen, plain version names. Build Pokémon (English) first, then Magic, then sports when the makers' checklists land. (2026-11-01, Landon)
- **Checklist rows say only the name and "No. 11 · 2 versions"** (just "No. 11" for one version). No "You have 1 of 2" or "You need 2" on rows; Landon read it as owning duplicates. (2026-11-01, Landon)
- **Tap a missing version to find it on eBay:** a "Find it" button per missing version opens our results with just that version's live listings; with none for sale, "None for sale right now" plus Alert me. (2026-11-01, Landon)
- ~~**Star a missing version to add it to favorites** (same star as elsewhere, shared list); tapping it there opens its Find it results. (2026-11-01, Landon)~~ **Skipped** after seeing the mockup: too busy, and Find it + Alert me cover it. (2026-11-01, Landon)
- **Sports player checklists come from the card makers' own free checklists** (Topps, Panini, Upper Deck). Landon downloads the files himself, since their sites block bots, and we never try to get past those checks. An agent imports them. Not CardSight, SportsCardsPro, Beckett or TCDB. **"I own this" marks are private by default.** (2026-10-31)
- **When we charge: card version lists and "I own this" checklists stay free to view; only alerts are paid.** This keeps us within Scryfall, TCGdex and Lorcast rules. (2026-10-31)
- Japanese Pokémon versions only for sets TCGdex covers fully; other Japanese copies say "Japanese printing, version not named". No Scrydex trial. **We won't fill TCGdex gaps ourselves**: TCGdex rejects AI-made data, and there's no legal source. Instead, for sets that aren't full, label from the seller's own title: "Japanese · <set> (<code>) · #048/069, as listed by seller". (2026-10-31)
- **All languages shown by default**, with a Language filter. Sealed, lots and proxies are hidden by default, same as sports; a sealed-box mode may come later. (2026-10-30)
- No game names, logos or mascots in our brand, domain or app name, subtitle or keywords. Game names appear only as plain text in filters and copy, with a "Not affiliated with eBay or any game publisher" line. (2026-10-30)

- **Select:** rank by the /N in the title, and show a colour name only when it means the same print run in every tier (option A in research/select-tiers.md). Measure how often titles name the tier before adding tier-aware ladders. (2026-10-31)
- Insert colour lists stay out of the UI until checked against the makers' own checklists. (2026-10-31, Boss)

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
- Agents share one folder, so **commit only your own files with `git commit -- <your paths>`**. Never run `git add -A` or a plain `git commit` with other agents' changes staged. Never rewrite history. (2026-10-31)

## Umbrella brand (2026-11-01)
- **The website is "Floors & Fables"** and splits into two sides: **Fields & Floors** (sports) and **Foils & Fables** (card games). (2026-11-01, Landon) floorsandfables.com and .ca were unregistered on 2026-11-01; fieldsandfables.com is taken. Plan approved (2026-11-01, Landon): Landon buys floorsandfables.com and .ca; floorsandfables.com opens on a simple two-side chooser (Fields & Floors / Foils & Fables); fieldsandfloors.com keeps working and goes straight to the sports side; the iPhone app is named **"Floors & Fables"** (replaces "Fields & Fables"; CardAtlas and Rarest First dropped).
- **Update (2026-11-01, Landon):** the **app is "Floors & Fables"** from day one. **The website uses one domain per side**: fieldsandfloors.com (sports) and a Foils & Fables domain (foilsandfables.com and .ca were unregistered on 2026-11-01). Favorites and saved searches must be shared between the two sites (one account). Whether floorsandfables.com and its chooser are still wanted is pending Landon's answer; the chooser build is on hold.
- **floorsandfables.com keeps the chooser page** as mocked (mockups/floors-and-fables-chooser.html). Under "Sports cards": sport names in plain text (Hockey, Basketball, Baseball, Football…), not league names, which are trademarks and add nothing. Under "Trading card games": game names in plain text (Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Lorcana), no logos, plus the existing "Not affiliated with eBay or any game publisher" line. This fits the 2026-10-30 rule (game names only as plain text in copy). Domains to buy: foilsandfables.com (card-game side) and floorsandfables.com (chooser); .ca optional. (2026-11-01, Landon + Boss)
- **Rarity comes from the card lists when we can match the card:** when a listing matches one printing in the catalog (Magic, English Pokémon), its rarity group comes from the catalog, not the seller's title; the title is the fallback. (2026-11-01, Landon)
- **Five new Foils & Fables filters approved** (research/fables-filters-2.md): foil/holo type, condition for raw cards (eBay's own Card Condition field), special art, promos (show/hide/only), and shipping and offers (also on the sports side). New ones sit behind "More filters". Set filter and card type come later; signed and error filters are skipped. (2026-11-01, Landon)
- **Rarity groups must reflect how rare cards really are** (pull rates from published sources), in one clean, simple set of about 5 plain-English tiers across all games, so newcomers can find what they want. Research first (research/fables-rarity-tiers.md), then a mockup for Landon. (2026-11-01, Landon)
- **Find what makes Foils & Fables worth using, then make that excellent: clean, simple, elegant.** Boss working answer: "Tell us the card you want. We show every version for sale, grouped by how rare it really is, junk hidden, and alert you only for the ones you're missing." Being checked in research/fables-why.md, then a focused design pass. (2026-11-01, Landon)
- **Rarity groups approved** (research/fables-rarity-tiers.md): Common · Uncommon · Rare · Very rare · Extremely rare, the same words in every game, placed by pack odds. The game's own rarity name shows small beside the group ("Extremely rare · Hyper Rare"). Promos and vintage cards get a "Promo" / "Vintage" label instead of a group. Replaces the Grail/Relic/Treasure/Charm placeholders. Mockup next. (2026-11-01, Landon)
- Positioning from research/fables-why.md: lead with (1) every version for sale from one search, (2) only the real card, (3) alerts only for versions you don't own. Rarity is a helper, not the headline. (2026-11-01, Boss)
- **The checklist shows how rare each card is**, using the five rarity groups: a small group label per row (rarest version) and per version in the picker. No prices. In the rarity groups mockup. (2026-11-01, Landon)
- **Rarity groups mockup approved** (mockups/fables-rarity-groups.html as of d57d4d4), plus: in the checklist picker, when a version has a live eBay photo, show that card's photo large in the space at the top of the picker. (2026-11-01, Landon)
- **Foils & Fables home and search mockup approved** (mockups/fables-home-story.html as of aafd402): headline "Every version of a card. One search." replaces "Chase the shine."; search opens on versions first for games with card lists (Pokémon, Magic), other games keep the list, and "See all listings" stays one tap away; keep "Only the real card" with what we hid and what we're unsure of shown on screen, and "Labels can be wrong" in the popup. (2026-11-06, Landon)
- **Continue signed in between the two sites approved** (mockups/continue-signed-in.html, research/cross-domain-signin.md): runs only on tapping the side switch; the iPhone app stays on one domain with no hand-off; if it slips past launch, people sign in once on each site; sign-out signs out of the current site, with a quieter "Sign out of both sites". The session-start step must be proven before we rely on it. (2026-11-06, Landon)
- **One login across both sites** (replaces parts of the 2026-11-06 "continue signed in" entry). Log in once and you're signed in on both, however you arrive: the first page of a visit to the other site does a quick check with the first site, in addition to the switch. **Sign out once and you're out of both**; no current-site-only option. Bots skip the check. Same one-time code; only signs in if already signed in on the other site in the same browser. App stays on one domain. Fallback if the session step can't be proven: sign in once per site. (2026-11-06, Landon)
- **One login details** (research/cross-domain-signin.md): a brief pause once per visit is fine (estimated 0.1–0.4s signed out, about 1s when signed in elsewhere; unmeasured); sign-out covers both websites in that browser but not other devices or the app; add one Privacy line saying sign-in is linked between our two sites; fallback stays: sign in once per site if the session step or Safari gets in the way. Needs real iPhone testing. (2026-11-06, Landon)
- **Foils & Fables card lists go front and center**, and a first-time visitor must see the purpose at once (find any card and see every version; keep track of the ones you have). Direction: a "Card lists" item in the Fables header and app tab bar, popular lists right under the home search box, and a page to browse every list by game and A–Z. Mockup first. (2026-11-07, Landon)
- **Card lists mockup approved** (mockups/fables-card-lists.html): headline "Find any card. See every version." with "Then keep track of the ones you have." (replaces "Every version of a card. One search."); popular card lists under the box; "Card lists" in the header; /fables/lists browse page; a fifth "Lists" tab in the app on the Fables side only; popular tiles use live seller photos (about one eBay search per tile, cached about an hour), or a plain card shape when there's no listing. (2026-11-07, Landon)
