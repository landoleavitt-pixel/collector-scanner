import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'Privacy Policy — Fields & Floors Collectors',
  description: 'How Fields & Floors collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy."
      lede="What we collect, why we collect it, and who we share it with. Last updated June 2026."
    >
      <Prose>
        <p>
          Fields &amp; Floors Collectors ("Fields &amp; Floors," "we," "us") operates
          the website at fieldsandfloors.com. This policy explains what information
          we handle when you use the service and the choices you have. We've tried to
          write it plainly rather than in legalese.
        </p>
      </Prose>

      <SectionHeading number="01" label="What we collect">
        Information you give us, and a little we observe.
      </SectionHeading>
      <Prose>
        <p>When you create an account or use Fields &amp; Floors, we may handle:</p>
        <ul>
          <li><strong>Account information</strong> — your email address, and (if you sign in with Google) your name and profile photo as provided by Google.</li>
          <li><strong>Saved searches</strong> — the search terms and filters you save so we can notify you of new matching cards.</li>
          <li><strong>Watchlist</strong> — the individual listings you star to track.</li>
          <li><strong>Usage data</strong> — basic, aggregate analytics about page visits, collected through privacy-friendly analytics. This does not identify you personally.</li>
        </ul>
        <p>
          We do not collect payment card details directly. We do not sell your
          personal information to anyone.
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
          <li>Show and manage your watchlist.</li>
          <li>Understand, in aggregate, how the site is used so we can improve it.</li>
        </ul>
        <p>
          We send notification and account emails related to the features you use.
          You can turn off saved-search notifications at any time from your account,
          and every notification email is tied to a saved search you can pause or delete.
        </p>
      </Prose>

      <SectionHeading number="03" label="Who we share it with">
        A small set of service providers who help us operate.
      </SectionHeading>
      <Prose>
        <p>
          We rely on trusted third parties to run Fields &amp; Floors. Each receives
          only the information needed to do its job:
        </p>
        <ul>
          <li><strong>Supabase</strong> — database and authentication (stores your account, saved searches, and watchlist).</li>
          <li><strong>Vercel</strong> — website hosting and aggregate analytics.</li>
          <li><strong>Resend</strong> — delivery of account and notification emails.</li>
          <li><strong>Google</strong> — if you choose "Sign in with Google," Google handles that authentication.</li>
          <li><strong>eBay</strong> — we query eBay's public listing data to power search results. Your personal information is not sent to eBay.</li>
        </ul>
        <p>
          We may also disclose information if required by law, or to protect the
          rights, safety, and security of our users and the service.
        </p>
      </Prose>

      <SectionHeading number="04" label="Your choices">
        Access, correction, and deletion.
      </SectionHeading>
      <Prose>
        <p>
          You can update your saved searches and watchlist at any time from your
          account. You can request access to, correction of, or deletion of your
          personal information by contacting us at the address below. You can stop
          receiving notification emails by pausing or deleting the relevant saved
          search, or by deleting your account.
        </p>
      </Prose>

      <SectionHeading number="05" label="Data retention &amp; security">
        We keep what we need, for as long as you use the service.
      </SectionHeading>
      <Prose>
        <p>
          We retain your account information and saved data while your account is
          active. If you delete your account, we delete the associated personal data,
          except where we're required to retain it for legal reasons. We use
          industry-standard measures to protect your data, but no method of
          transmission or storage is completely secure, and we can't guarantee
          absolute security.
        </p>
      </Prose>

      <SectionHeading number="06" label="Children">
        Not intended for children under 13.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors is not directed to children under 13, and we do not
          knowingly collect personal information from them. If you believe a child
          has provided us information, contact us and we'll remove it.
        </p>
      </Prose>

      <SectionHeading number="07" label="Changes &amp; contact">
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
          Fields &amp; Floors is an independent search tool. It is not affiliated
          with, endorsed by, or sponsored by eBay Inc.
        </p>
      </Prose>
    </PageShell>
  );
}
