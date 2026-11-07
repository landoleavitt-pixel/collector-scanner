# Draft: email to YGOPRODeck, asking for a written OK

*Draft only, 2026-11-07. **Nothing has been sent and nobody has been contacted.** This is for Landon to read, change and send himself.*

## Why this email

YGOPRODeck's API guide says the API "is and always will be completely free to use". It doesn't say whether that includes an app or site that later charges for part of it, and I couldn't find any terms of use, API licence or commercial-use page (the terms page I tried returned "not found"; the site footer has no terms or privacy link). A short written yes protects Foils & Fables before alerts become paid. (Background: research/catalogs-phase-2.md, "Yu-Gi-Oh! via YGOPRODeck API".)

## Before you send (Landon's checklist)

1. **Pick the way to reach them.** YGOPRODeck's Help page (https://ygoprodeck.com/help/) says the owner can be reached by email, and that "the best way to reach me is on either the YGOPRODeck Discord server or on the Forum". The email address is hidden from automatic readers, so open the Help page in your own browser to see it. Discord invite: https://discord.gg/nx24PSBGFE. **I did not use any of them.**
2. **Check the facts in the email are still true.** Items marked **[Landon: check]** below.
3. **Don't attach anything or share any member information.** The email should say nothing about individual members.
4. **Send it from an address you're happy to be public.**
5. **When they reply,** forward the reply to the Boss so it's logged in DECISIONS.md and kept with research/catalogs-phase-2.md. A reply like "sure, go ahead" is enough; keep the email.
6. **Silence isn't a yes.** If you hear nothing in two weeks, send one short follow-up. If there's still no reply, ask the Boss; I'd keep using the data for the free version lists (the guide asks people to store it locally) and not charge for anything that depends on it until there's an answer.

## Version 1: the email (recommended)

**Subject:** Question about using your Yu-Gi-Oh! API in a free card-finder app

Hi,

My name is Landon Leavitt. I'm building a small, independent website and iPhone app called Foils & Fables (part of Floors & Fables) **[Landon: check names, and that you're happy to give them; the domain names aren't live yet]**. It helps collectors find cards for sale on eBay. For Yu-Gi-Oh!, I'd like to use your API to show people every printing of a card (set, set code and rarity) so they can find a particular version and tick off the ones they own.

I wanted to ask permission first, because your API guide says the API is free, but it doesn't say whether that covers an app that charges for part of its service later.

**How I'd use it:**
- Card names, set names, set codes and rarities from the `card_sets` information, stored on my own server and refreshed about once a week, well under your limit of 20 requests per second.
- Possibly the page-view counts, only to build a short "popular cards" list.
- No card pictures. I won't hotlink or copy your images. Listings show the eBay seller's own photo.
- A credit on the card-list screens: "Card data: YGOPRODeck".
- A line saying we are not affiliated with YGOPRODeck, Konami or eBay.

**The part I'd like your OK on:** the card lists and "I own this" checklists will always be free to view. Later I plan to charge a small monthly fee for **alerts** (a message when a new listing of a card you're missing appears). I would not charge for the card data itself.

**My questions:**
1. Is it OK to use the API data this way, including in a service that has paid alerts?
2. Is there a credit line or link you'd like me to use?
3. Any limits I should know about (how often, how much I can store, anything I shouldn't use)?
4. If you'd prefer something else (a link to Premium, a sponsor mention, a small fee), I'm happy to talk about it.

A short reply is plenty. I'll keep it with my records. Thank you for building something so useful to the community.

Best,
Landon Leavitt
**[Landon: add your email, and the website once it's live]**

## Version 2: Discord message (shorter, if you'd rather use Discord)

> Hi, I'm Landon. I'm building a small independent app (Foils & Fables) that helps collectors find cards for sale on eBay. I'd like to use your API for card names, set codes and rarities so people can find a specific printing of a card. I'd store the data on my own server, refresh weekly, stay well under 20 requests per second, never use your images, and credit YGOPRODeck. The card lists will always be free to view; later I plan to charge a small fee for alerts only. Is that OK with you, and is there a credit line you'd like? Thank you!

## What the email deliberately does and doesn't say

- **Says what we really do.** It matches the data we use (names, sets, set codes, rarities, optional view counts), the habits YGOPRODeck asks for (store locally, no hotlinked images, under 20 requests a second), and our own rule that card lists stay free and only alerts are paid (DECISIONS, 2026-10-31).
- **Doesn't promise money, a sponsorship or a link.** It only says you're happy to talk. Any payment is a Landon and CFO decision.
- **Doesn't ask them about Konami.** YGOPRODeck is not Konami. The card text and artwork belong to Konami, and I couldn't find a Konami policy for apps. We use only names and set information, no card text or images, and keep the "not affiliated" line. Their reply covers *their* data only.
- **Doesn't mention member data.** Nothing about our users or numbers goes to them.
- **Doesn't claim a launch date.** The domain names (foilsandfables.com, floorsandfables.com) were still unregistered when last checked on 2026-11-06 (research/name-check-floors-and-fables.md).

## Facts behind each line (so you can check them)

| Statement in the email | Source |
|---|---|
| "free to use", Premium exists | https://ygoprodeck.com/api-guide/ ("completely free to use"; Premium subscription to support the API) |
| 20 requests per second; store data locally; don't hotlink images | https://ygoprodeck.com/api-guide/ ("20 requests per 1 second"; "download and store all data pulled from this API locally"; "Do not continually hotlink images") |
| `card_sets` has set name, set code, rarity | https://ygoprodeck.com/api-guide/ (`set_name`, `set_code`, `set_rarity`) |
| View counts exist | The API's `misc=yes` information includes `views` and `viewsweek` (used for research/popular-card-lists.md) |
| No terms or commercial-use page found | The terms page I tried returned "not found"; the site footer shows no terms or privacy link (https://ygoprodeck.com/) |
| Contact routes | https://ygoprodeck.com/help/ (email hidden from automatic readers; Discord; forum) |
| Card lists free, alerts paid | DECISIONS.md, 2026-10-31 |
