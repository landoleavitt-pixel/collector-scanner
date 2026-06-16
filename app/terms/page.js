import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'Terms of Service — Fields & Floors Collectors',
  description: 'The terms that govern your use of Fields & Floors Collectors.',
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service."
      lede="The agreement between you and Fields & Floors. Last updated June 2026."
    >
      <Prose>
        <p>
          These Terms govern your use of Fields &amp; Floors Collectors
          (fieldsandfloors.com). By using the service, you agree to them. If you
          don't agree, please don't use the service.
        </p>
      </Prose>

      <SectionHeading number="01" label="What we are">
        A search and notification tool for sports cards.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors is an independent tool that helps collectors search and
          filter publicly available sports card listings and receive notifications
          when new matching cards appear. We surface listings and link you to them.
          We do not sell cards, hold inventory, process transactions, or take part in
          any purchase.
        </p>
      </Prose>

      <SectionHeading number="02" label="Not affiliated with eBay">
        We're independent.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors is not affiliated with, endorsed by, sponsored by, or
          operated by eBay Inc. "eBay" is a trademark of its respective owner, used
          here only to describe the source of listing data. All listings, prices, and
          availability originate with eBay and its sellers, and all purchases happen
          on eBay under eBay's own terms — not ours. Listing content and data belong
          to eBay and its sellers; we only index and search publicly available
          listing information to help you find cards.
        </p>
      </Prose>

      <SectionHeading number="03" label="Accuracy of listing data">
        We do our best, but we can't guarantee it.
      </SectionHeading>
      <Prose>
        <p>
          We pull listing information from third-party sources and present it as
          accurately as we can, but we don't guarantee that any listing, price,
          print run, grade, or availability shown is current, complete, or correct.
          In particular, you acknowledge that:
        </p>
        <ul>
          <li>Our print-run detection can make mistakes &mdash; it may miss a card's serial number, or misread other numbers (for example, a season like "22/23") as a print run.</li>
          <li>Listing titles are written by sellers and can be inaccurate, misleading, or mislabeled, and our parsing of them can be wrong.</li>
          <li>Grades, autographs, parallels, and other attributes we surface are derived from listing text and may not reflect the actual item.</li>
        </ul>
        <p>
          Always confirm every detail on the eBay listing itself before buying. You
          are solely responsible for your own purchasing decisions.
        </p>
      </Prose>

      <SectionHeading number="04" label="Listing availability">
        Listings change constantly.
      </SectionHeading>
      <Prose>
        <p>
          Listings can sell, change, be relisted, or be removed at any time, often
          faster than we can refresh. We are not responsible for stale, expired, or
          sold listings shown in search results, your watchlist, or notifications.
        </p>
      </Prose>

      <SectionHeading number="05" label="Third-party services">
        We depend on others to run.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors relies on third-party services to operate &mdash; including
          eBay for listing data, and providers such as Supabase, Vercel, Resend, and
          Google for hosting, database, email, and authentication. We don't control
          these services and aren't responsible for their accuracy, availability, or
          performance. We are not liable for any downtime, delay, data loss, error, or
          interruption caused by eBay or any other external service, or for changes
          they make to their own systems, data, or terms.
        </p>
      </Prose>

      <SectionHeading number="06" label="Alerts &amp; notifications">
        Useful, but not guaranteed.
      </SectionHeading>
      <Prose>
        <p>
          Our notification and alert features are provided on a best-effort basis. We
          do not guarantee that any notification will be sent, delivered, accurate, or
          timely, and delivery depends on systems outside our control (email
          providers, third-party APIs, and your own inbox and filters). We are not
          liable for any missed listing, missed deal, lost opportunity, or any other
          loss arising from a notification that was delayed, inaccurate, or not
          delivered. Do not rely on our alerts as your only means of tracking a card.
        </p>
      </Prose>

      <SectionHeading number="07" label="Your account">
        Keep it secure, use it honestly.
      </SectionHeading>
      <Prose>
        <p>
          You're responsible for keeping your login credentials secure and for
          activity under your account. Provide accurate information when you sign up.
          Don't use the service to break the law, infringe others' rights, scrape or
          overload the service, attempt to bypass security, or resell access without
          our permission.
        </p>
      </Prose>

      <SectionHeading number="08" label="Our intellectual property">
        The site and its design are ours.
      </SectionHeading>
      <Prose>
        <p>
          The Fields &amp; Floors website, software, code, design, visual identity,
          branding, and the logic of our search, filtering, and notification tools are
          owned by Fields &amp; Floors and protected by intellectual property laws.
          You may not copy, reproduce, modify, reverse-engineer, scrape, or reuse any
          part of the service for your own product or commercial purpose without our
          prior written permission. This does not apply to third-party listing data,
          which belongs to eBay and its sellers as described above.
        </p>
      </Prose>

      <SectionHeading number="09" label="Subscriptions, fees &amp; refunds">
        Our paid plans and how billing works.
      </SectionHeading>
      <Prose>
        <p>
          The Fields &amp; Floors service includes a free tier and at least one paid
          subscription tier. Current pricing, billing intervals, and what each plan
          includes are listed on our pricing page and shown again at checkout. Paid
          features unlock additional functionality (such as automated alerts on
          saved searches and bid reminders) &mdash; not access to third-party listing
          data itself, which belongs to eBay and its sellers.
        </p>
        <p>
          <strong>Free trial.</strong> Paid plans may include a free trial period
          (currently 14 days). A valid payment method is required to start the
          trial. Unless you cancel before the trial ends, your subscription will
          automatically convert to a paid subscription and your payment method
          will be charged the then-current rate. You can cancel at any time
          before the trial ends to avoid being charged.
        </p>
        <p>
          <strong>Recurring billing.</strong> Paid subscriptions renew automatically
          at the end of each billing period (monthly unless otherwise stated)
          until cancelled. You authorize our payment processor to charge your
          payment method on each renewal. You can cancel at any time; access
          continues through the end of the period you've already paid for, and
          you won't be billed again.
        </p>
        <p>
          <strong>Refunds.</strong> Except where required by law, subscription
          fees are non-refundable, including for partially used periods. If you
          believe you were charged in error, please contact us and we'll
          investigate in good faith.
        </p>
        <p>
          <strong>Payment processor.</strong> Payments are processed by Lemon
          Squeezy, which acts as our merchant of record. Lemon Squeezy handles
          billing, your payment card details, applicable sales tax, and invoicing
          on our behalf. We never see or store your full payment card information.
          Your purchase is also subject to Lemon Squeezy's terms of service and
          privacy policy.
        </p>
        <p>
          <strong>Price changes.</strong> We may change subscription pricing in
          the future. If we do, we will give you reasonable advance notice
          (typically by email) before the change takes effect for your account,
          and you may cancel before the new price applies.
        </p>
      </Prose>

      <SectionHeading number="10" label="Changes to the service">
        We may evolve or discontinue features.
      </SectionHeading>
      <Prose>
        <p>
          We may add, change, suspend, or discontinue any part of the service &mdash;
          including features, filters, or notifications &mdash; at any time, with or without
          notice. We are not liable to you for any modification, suspension, or
          discontinuation of the service or any feature.
        </p>
      </Prose>

      <SectionHeading number="11" label="Disclaimers &amp; liability">
        The honest fine print.
      </SectionHeading>
      <Prose>
        <p>
          The service is provided "as is" and "as available," without warranties of
          any kind, whether express or implied, including any implied warranties of
          merchantability, fitness for a particular purpose, and non-infringement.
        </p>
        <p>
          To the fullest extent permitted by law, Fields &amp; Floors will not be
          liable for any indirect, incidental, special, consequential, or punitive
          damages, or for any loss of profits, opportunities, or data, arising from
          your use of the service or from any purchase you make on a third-party
          marketplace. To the fullest extent permitted by law, our total aggregate
          liability for any claim relating to the service is limited to the greater of
          (a) the total fees you paid us in the twelve (12) months before the claim,
          or (b) CAD $100. Nothing in these Terms limits liability that cannot be
          limited under applicable law.
        </p>
      </Prose>

      <SectionHeading number="12" label="Termination">
        Either of us can end it.
      </SectionHeading>
      <Prose>
        <p>
          You may stop using the service and delete your account at any time. We may
          suspend or terminate access if you violate these Terms or use the service in
          a way that risks harm to it or to others. Provisions that by their nature
          should survive termination &mdash; including intellectual property, disclaimers,
          and liability limits &mdash; will survive.
        </p>
      </Prose>

      <SectionHeading number="13" label="Governing law &amp; disputes">
        Alberta, Canada &mdash; and let's talk first.
      </SectionHeading>
      <Prose>
        <p>
          These Terms are governed by the laws of the Province of Alberta and the
          federal laws of Canada applicable there, without regard to conflict-of-laws
          rules. If a dispute arises, you agree to first contact us and attempt to
          resolve it informally and in good faith. If we can't resolve it within a
          reasonable time, the courts located in Alberta will have jurisdiction,
          except where applicable law gives you the right to bring a claim elsewhere.
        </p>
      </Prose>

      <SectionHeading number="14" label="Changes &amp; contact">
        We'll post updates here.
      </SectionHeading>
      <Prose>
        <p>
          We may update these Terms from time to time. Continued use after changes
          means you accept the updated Terms. Questions can be sent to{' '}
          <a href="mailto:hello@fieldsandfloors.com">hello@fieldsandfloors.com</a>.
        </p>
      </Prose>
    </PageShell>
  );
}
