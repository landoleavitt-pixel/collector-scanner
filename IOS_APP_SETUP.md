# iOS App: Your Setup Checklist

Claude has built the code. These steps need your accounts, so only you can do them. Go in order; each one unlocks the next.

## How the app works

- The app is a native iPhone shell that loads fieldsandfloors.com. Site updates reach the app instantly with no App Store resubmission. Only native changes (icon, plugins, permissions) need a new build.
- In the app, Base is bought with **Apple in-app purchase** through RevenueCat. Apple requires this, and Stripe isn't allowed there. The website keeps using Stripe.
- Alerts arrive as **push notifications** as well as email.
- Sign-in in the app uses Apple or email + password. Google is hidden in the app because Google blocks sign-in from inside apps.

---

## 1. Deploy the code (5 min)

1. Supabase → SQL Editor → paste and run `supabase/migrations/20261019000000_ios_app.sql`.
2. Terminal:
   ```bash
   cd ~/projects/Fields\ and\ Floors && git add -A && git commit -m "iOS app: Capacitor shell, Apple IAP, push alerts" && git push
   ```
3. `supabase functions deploy poller`

Website visitors will see the new landing page, intro and fixed plans card. Everything else new runs only inside the app.

## 2. Apple Developer Program ($99 USD/yr, can take 1–2 days)

1. Enroll at developer.apple.com/programs. Enrolling as an individual is fastest; enrolling as an organization needs a D-U-N-S number.
2. In **Certificates, IDs & Profiles → Identifiers**, register the App ID `com.fieldsandfloors.app` and tick **Push Notifications**, **Sign in with Apple** and **In-App Purchase**.
3. In **Keys**, create one key with **Apple Push Notifications service** and **Sign in with Apple** ticked. Download the `.p8` file (you only get one chance) and note the **Key ID** and your **Team ID**.

## 3. Sign in with Apple in Supabase (5 min)

Supabase → Authentication → Providers → Apple → enable. Under **Client IDs**, add `com.fieldsandfloors.app`. That's all the native app needs.

## 4. App Store Connect

1. appstoreconnect.apple.com → **Apps → +** → New App. Platform iOS, name "Fields & Floors", bundle ID `com.fieldsandfloors.app`.
2. **Agreements, Tax and Banking**: accept the Paid Apps agreement and add your bank and tax info. Purchases won't work until this is done.
3. Join the **App Store Small Business Program**, which cuts Apple's fee from 30% to 15%.
4. In the app's **Subscriptions** section, create a group "Base" with one subscription:
   - Product ID: `ff_base_monthly`
   - Duration: 1 month
   - Price: $4.99 USD (Apple sets each country's price from that)
   - Introductory offer: Free, 14 days
   - Add a second subscription in the same group: `ff_base_annual`, 1 year, $39.99 USD, same 14-day free intro offer.
5. Under **Users and Access → Integrations → In-App Purchase**, generate a key for RevenueCat.

## 5. RevenueCat (free until $2.5k/mo revenue)

1. Sign up at revenuecat.com and create a project with an **App Store** app (bundle ID `com.fieldsandfloors.app`). Upload the In-App Purchase key from step 4.5.
2. **Product catalog**:
   - Add products `ff_base_monthly` and `ff_base_annual`.
   - Create an **entitlement** with the identifier exactly `base` and attach the product.
   - Create an **offering** (mark it Current) containing a **Monthly** package (`ff_base_monthly`) and an **Annual** package (`ff_base_annual`).
3. **Integrations → Webhooks**:
   - URL: `https://fieldsandfloors.com/api/revenuecat/webhook`
   - Authorization header: a long random string you make up (reuse it below)
4. **API keys**: copy the **Apple public key** (`appl_…`) and a **secret key** (`sk_…`).

## 6. Environment variables

**Vercel** (Settings → Environment Variables, then redeploy):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | `appl_…` |
| `REVENUECAT_SECRET_KEY` | `sk_…` |
| `REVENUECAT_WEBHOOK_AUTH` | your random string from 5.3 |

**Supabase** (terminal, from the project folder):

```bash
supabase secrets set APNS_KEY_ID=XXXXXXXXXX APNS_TEAM_ID=XXXXXXXXXX APNS_BUNDLE_ID=com.fieldsandfloors.app
```

```bash
supabase secrets set APNS_PRIVATE_KEY="$(cat ~/Downloads/AuthKey_XXXXXXXXXX.p8)"
```

## 7. Run it on your iPhone

1. `npx cap open ios` opens Xcode.
2. Click **App** (blue icon, top left) → **Signing & Capabilities** → pick your **Team**.
3. Plug in your iPhone, choose it at the top, and press ▶.
4. Test sign-in with Apple, the purchase (it uses a sandbox Apple account, so no real charge), and alerts.

## 8. Submit

1. In Xcode, choose **Product → Archive → Distribute App → App Store Connect**. The build appears in TestFlight in about 15 minutes.
2. In App Store Connect, fill in screenshots (6.9" iPhone), description, keywords, privacy policy URL (`https://fieldsandfloors.com/privacy`), support URL, and the **App Privacy** questionnaire (email, purchases, device ID for push).
3. **App Review notes**: give a demo account (email + password) that already has Base, so the reviewer can see alerts. Describe the app as "subscription software using eBay's official Browse API."
4. Submit. Review usually takes 1–3 days.

---

## Known risks

- **Guideline 4.2 (minimum functionality).** Apple sometimes rejects apps that are "just a website." Native push alerts, in-app purchase and native Apple sign-in are the usual answer. If Apple pushes back anyway, more native features come next.
- **Stripe subscribers in the app.** They keep Base, but the app never shows the Stripe billing portal (Apple rule). They manage billing on the website.
- **Account deletion with an Apple subscription.** Apple subscriptions can't be cancelled by us. The delete dialog tells them to cancel in Settings.
