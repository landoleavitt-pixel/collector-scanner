import PageShell, { SectionHeading, Prose } from '../components/PageShell';
import UsageStatsToggle from '../components/UsageStatsToggle';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Fields & Floors, Foils & Fables and the Floors & Fables app collect, use, and protect your information.',
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy."
      lede="What we collect, why we collect it, and who we share it with. Covers Fields & Floors, Foils & Fables and the Floors & Fables app. Last updated October 2026."
    >
      <Prose>
        <p>
          Fields &amp; Floors Collectors ("Fields &amp; Floors," "we," "us") operates
          the website at fieldsandfloors.com, including Fields &amp; Floors (sports
          cards) and Foils &amp; Fables (trading card games), any other website we
          operate for either of them, and the Floors &amp; Fables iPhone app
          (together, the "service"). They are one service with one account, and this
          policy applies to all of it. Fields &amp; Floors Collectors is responsible
          for (the controller of) the personal information described here. This
          policy explains what information we handle when you use the service and the
          choices you have. We've tried to write it plainly rather than in legalese.
        </p>
      </Prose>

      <SectionHeading number="01" label="What we collect">
        Information you give us, and a little we observe.
      </SectionHeading>
      <Prose>
        <p>When you create an account or use the service, on either side, we may handle:</p>
        <ul>
          <li><strong>Account information</strong>: your email address, and (if you sign in with Google) your name and profile photo as provided by Google. If you use Sign in with Apple, we receive the email address Apple gives us, which may be Apple's private relay address.</li>
          <li><strong>Plan and billing status</strong>: which plan you're on, whether you're in a free trial, when your subscription renews or ends, and whether you pay through our website or the App Store. We don't store card numbers.</li>
          <li><strong>Saved searches</strong>: the search terms and filters you save so we can notify you of new matching cards.</li>
          <li><strong>Watchlist</strong>: the listings you star. We save a copy of each listing's title, price, photo link, and eBay link so your watchlist loads quickly, and we refresh the price and status while you're watching it.</li>
          <li><strong>Last visit and starred prices</strong>: when you last opened your signed-in home page, and each starred card's price at the moment you starred it. We use these only to show what changed since your last visit, such as new matches and price drops.</li>
          <li><strong>Card collection lists (when this feature launches)</strong>: the cards and versions you mark as &ldquo;I own this&rdquo; on a card checklist. See &ldquo;Your card collection lists&rdquo; below.</li>
          <li><strong>Notification history</strong>: a record of which listings we've already alerted you about, so you never get the same one twice.</li>
          <li><strong>Push notification token (iOS app)</strong>: if you turn on notifications in the app, we store a code that Apple gives your device so we can send alerts to it. It is deleted when you sign out or delete your account.</li>
          <li><strong>Sign in with Apple token (iOS app)</strong>: if you sign in with Apple in the app, Apple gives our server a token that proves the sign-in. We keep it, in a private place that only our server can read, for one reason: when you delete your account, we use it to tell Apple to cut the link between your Apple ID and our app, as Apple requires. It is never used to sign in as you or to read anything from your Apple account, and it is deleted when you delete your account.</li>
          <li><strong>Technical &amp; log data</strong>: information automatically recorded by our hosting and infrastructure providers, such as your IP address, browser and device type, access times, and error and security logs. This is used to operate, secure, and debug the service.</li>
          <li><strong>Usage analytics</strong>: aggregate, non-personal information about how pages are used (such as page views), collected through privacy-friendly analytics. It is usage-based only and does not identify you personally.</li>
          <li><strong>Anonymous usage events</strong>: which steps of the service are used (such as visiting, running a search, or opening a card), stored in our own database under a random ID kept on your device, with no name, email, or search words. No ads and no third-party tracking. You can turn these off at any time with the &ldquo;Share anonymous usage stats&rdquo; switch under <a href="#usage-stats">Your choices</a>; when it&rsquo;s off, your device sends none of them and forgets its random ID. We also skip them if your browser sends a Do Not Track or Global Privacy Control signal.</li>
          <li><strong>Account events</strong>: when you create an account, and when you start a trial, our server records that event against your account so we can count sign-ups and trials correctly. These are part of running your account, not usage stats, so the switch above doesn&rsquo;t turn them off. If you delete your account, they stay only as anonymous counts, no longer linked to you.</li>
        </ul>
        <p>
          We do not collect payment card details directly. We do not sell your
          personal information to anyone.
        </p>
        <p>
          <strong>Your card collection lists (when this feature launches).</strong>{' '}
          If you mark cards or versions as &ldquo;I own this&rdquo;, that list is
          stored against your account and is private to you by default. Other
          members and visitors can&rsquo;t see it. You can remove any entry, or
          delete the whole list, at any time, and it is deleted with your account.
          We use it only to show you your own list. We never sell it, never share
          it with anyone else, and never use it for advertising.
        </p>
      </Prose>

      <SectionHeading number="02" label="How we use it">
        To run the service you asked for.
      </SectionHeading>
      <Prose>
        <p>We use your information to:</p>
        <ul>
          <li>Create and secure your account.</li>
          <li>Run your saved searches and send you notification emails when new matching cards appear.</li>
          <li>Show and manage your watchlist, and send push notifications in the iOS app.</li>
          <li>Process your subscription and confirm what you're entitled to.</li>
          <li>Operate, debug, secure, and improve the service.</li>
          <li>Understand, in aggregate, how the site is used.</li>
        </ul>
        <p>
          We send notification and account emails related to the features you use.
          You can turn off saved-search notifications at any time from your account (and turn off push notifications in your iPhone settings),
          and every notification email is tied to a saved search you can pause or delete.
        </p>
        <p>
          In short, we process your information to provide the service, operate your
          account and alerts, improve and secure the platform, and comply with our
          legal obligations, and not for any unrelated purpose.
        </p>
      </Prose>

      <SectionHeading number="03" label="Cookies &amp; similar technologies">
        Mostly to keep you logged in.
      </SectionHeading>
      <Prose>
        <p>
          We and our providers use cookies and similar technologies (such as session
          tokens stored in your browser) to keep you signed in, secure your account,
          and support privacy-friendly analytics. We also keep a random ID in your
          browser's local storage for the anonymous usage events described above. These are essential to how the
          service works. Without them, login and authentication wouldn't function.
          We don't use cookies to build advertising profiles or track you across other
          websites. You can control or clear cookies in your browser settings, but
          disabling essential ones may prevent you from signing in.
        </p>
      </Prose>

      <SectionHeading number="04" label="Who we share it with">
        A small set of service providers who help us operate.
      </SectionHeading>
      <Prose>
        <p>
          We rely on trusted third parties to run the service. Each receives
          only the information needed to do its job, and may process it on servers
          located outside Canada (see cross-border transfers below):
        </p>
        <ul>
          <li><strong>Supabase</strong>: database and sign-in. Stores your account, saved searches, watchlist, plan status, notification history, push token, and anonymous usage events.</li>
          <li><strong>Vercel</strong>: website hosting, technical and security logs, and aggregate page-view analytics.</li>
          <li><strong>Resend</strong>: delivers our account and alert emails. It receives your email address and the content of the email.</li>
          <li><strong>Stripe</strong>: processes card payments for subscriptions bought on our website. Stripe receives your email address and an internal account ID, and handles your card details, billing, and invoices. We never see or store your card number.</li>
          <li><strong>Apple</strong>: if you subscribe in the iOS app, Apple processes the payment through the App Store, and Apple's push notification service delivers alerts to your device. If you use Sign in with Apple, Apple handles that sign-in. We don't see your payment details.</li>
          <li><strong>RevenueCat</strong>: confirms the status of App Store subscriptions for the iOS app. It receives your internal account ID and your purchase information from Apple (such as which plan and when it renews), and tells us whether your subscription is active.</li>
          <li><strong>Google</strong>: if you choose &quot;Sign in with Google,&quot; Google handles that authentication.</li>
          <li><strong>eBay</strong>: we use eBay's public Browse API to find listings. Your search words and filters are sent to eBay to get results (and, for saved searches, by us on a schedule), but never your name, email, or account details. We don't receive or store eBay user data such as buyer or seller account information. The only listing details we keep are the ones you star, described above.</li>
          <li><strong>Card catalogs</strong> (Scryfall, TCGdex and others listed in our Terms, when card data launches): we download public card lists from them. We never send them any information about you.</li>
        </ul>
        <p>
          We may also disclose information if required by law, or to protect the
          rights, safety, and security of our users and the service.
        </p>
      </Prose>

      <SectionHeading number="05" label="Cross-border data transfers">
        Your data may be processed outside Canada.
      </SectionHeading>
      <Prose>
        <p>
          We're based in Canada, but our service providers may store and process data
          in the United States or other countries where they operate. By using the
          service, you understand that your information may be transferred to, stored,
          and processed outside your province or country, where data-protection laws
          may differ. We work with providers that maintain industry-standard
          safeguards.
        </p>
      </Prose>

      <SectionHeading number="06" label="Your choices">
        Access, correction, and deletion.
      </SectionHeading>
      <Prose>
        <p>
          You can update your saved searches, watchlist and (when this feature
          launches) card collection lists at any time from your account. You can request access to, correction of, or deletion of your
          personal information by contacting us at the address below. You can stop
          receiving notification emails by pausing or deleting the relevant saved
          search, or by deleting your account. You can delete your account yourself
          from the account menu; contact us if you can't.
        </p>
        <p>
          Anonymous usage stats are on by default. You can turn them off here, on
          each device or browser you use, signed in or not:
        </p>
        <UsageStatsToggle />
      </Prose>

      <SectionHeading number="07" label="Data retention &amp; security">
        We keep what we need, for as long as you use the service.
      </SectionHeading>
      <Prose>
        <p>
          We retain your account information and saved data while your account is
          active. If you delete your account from the account menu, we immediately
          delete your account, saved searches, watchlist, card collection lists,
          notification history, push tokens, and any Sign in with Apple token, on both sides of the service, and cancel any website (Stripe) subscription. Anonymous usage
          events are kept but are no longer linked to you. Subscriptions bought in
          the iOS app are managed by Apple, so deleting your account does not cancel
          them: cancel those in your Apple ID subscription settings. Some data may
          remain where we're required to retain it for legal reasons. Residual copies may persist in routine backups for a limited
          time before being overwritten. We use industry-standard measures to protect
          your data, but no method of transmission or storage is completely secure,
          and we can't guarantee absolute security.
        </p>
      </Prose>

      <SectionHeading number="08" label="Business transfers">
        If the project changes hands.
      </SectionHeading>
      <Prose>
        <p>
          If Fields &amp; Floors is involved in a merger, acquisition, financing, sale
          of assets, or other business transition, your information may be transferred
          as part of that transaction. We'll take reasonable steps to ensure it
          remains subject to protections consistent with this policy.
        </p>
      </Prose>

      <SectionHeading number="09" label="Children">
        Not intended for children.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors is not directed to children under the age required by
          applicable law in your jurisdiction, and we do not knowingly collect their
          personal information. If you believe a child has provided us information,
          contact us and we'll remove it.
        </p>
      </Prose>

      <SectionHeading number="10" label="Changes &amp; contact">
        We'll post updates here.
      </SectionHeading>
      <Prose>
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by the "last updated" date above. Questions, requests, or
          concerns about your privacy can be sent to{' '}
          <a href="mailto:hello@fieldsandfloors.com">hello@fieldsandfloors.com</a>.
        </p>
        <p style={{ fontSize: '0.85em', color: 'var(--ink-400)' }}>
          Fields &amp; Floors, Foils &amp; Fables and the Floors &amp; Fables app
          are an independent search tool. They are not affiliated with, endorsed
          by, or sponsored by eBay Inc. or any card maker or game publisher,
          including The Pok&eacute;mon Company, Nintendo, Creatures Inc., GAME
          FREAK inc., Wizards of the Coast, Konami, Bandai, Ravensburger or
          Disney. All trademarks belong to their owners. See section 3 of our
          Terms.
        </p>
      </Prose>
    </PageShell>
  );
}
