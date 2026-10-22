import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Fields & Floors Collectors.',
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service."
      lede="The agreement between you and Fields & Floors. Last updated October 2026."
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

      <SectionHeading number="02" label="We're a search tool, not a seller">
        Please read this before you buy anything.
      </SectionHeading>
      <Prose>
        <p>
          <strong>2.1 Definitions.</strong> In these Terms, &ldquo;Fields &amp;
          Floors,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; mean
          the operator of the website at fieldsandfloors.com and any related
          mobile application (together, the &ldquo;Service&rdquo;). &ldquo;Third-Party
          Marketplace&rdquo; means eBay. &ldquo;Sellers&rdquo; means the persons or
          businesses that offer items for sale on a Third-Party Marketplace.
          &ldquo;Listings&rdquo; means the offers for sale, descriptions, images,
          prices, and other information published by Sellers that the Service
          displays or links to. &ldquo;You&rdquo; and &ldquo;User&rdquo; mean the
          person using the Service.
        </p>
        <p>
          <strong>2.2 Nature of the Service.</strong> The Service is a search and
          notification tool only. It helps Users find Listings and links to them. We
          do not sell, own, hold, inspect, authenticate, grade, store, or ship any
          item, and we do not process any purchase of an item.
        </p>
        <p>
          <strong>2.3 No agency; not a party.</strong> We are not the agent,
          partner, joint venturer, employee, or representative of eBay or of any
          Seller, and nothing in the Service creates any such relationship. We are
          not a party to, and have no control over, any transaction between a User
          and a Seller or a Third-Party Marketplace.
        </p>
        <p>
          <strong>2.4 As is; no warranty regarding items or Listings.</strong> To the
          extent permitted by applicable law, the Service and all Listing information
          are provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE.&rdquo; WE MAKE NO
          REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING ANY
          ITEM OR LISTING, INCLUDING AS TO AUTHENTICITY, GENUINENESS, CONDITION,
          GRADING, AUTOGRAPHS, PROVENANCE, PRINT RUN, TITLE, OR THAT THE ITEM
          DELIVERED WILL MATCH ITS LISTING, OR AS TO THE ACCURACY, COMPLETENESS, OR
          TIMELINESS OF ANY LISTING DATA. TO THE EXTENT PERMITTED BY APPLICABLE LAW,
          WE DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          <strong>2.5 Automated labels.</strong> Classifications and labels that the
          Service displays, including print run, rarity tier and colour, autograph,
          rookie, set, and parallel designations, are generated automatically from
          text written by Sellers. They are provided for informational purposes only,
          may be inaccurate or incomplete, and must not be relied on as a
          representation of fact about any item. You are responsible for reviewing
          the full Listing, its images, and the Seller before making any purchase.
        </p>
        <p>
          <strong>2.6 Transactions and disputes.</strong> Any purchase is made
          solely between you and the Seller, under the terms of the Third-Party
          Marketplace. Any dispute about an item, its authenticity or condition, its
          delivery, or payment for it is solely between you, the Seller, and the
          Third-Party Marketplace. The Third-Party Marketplace may offer buyer
          protection programs, such as the eBay Money Back Guarantee, and you should
          consult its terms to determine whether a particular purchase is eligible.
          We make no representation or promise that any purchase will be covered by
          any such program, and we have no obligation to resolve disputes, to
          arrange refunds or returns, or to reverse any transaction.
        </p>
        <p>
          <strong>2.7 Release.</strong> To the extent permitted by applicable law,
          you release Fields &amp; Floors, and its owners, officers, employees, and
          contractors, from any claim, demand, loss, or damage, known or unknown,
          arising out of or connected with any transaction or dispute between you
          and a Seller or a Third-Party Marketplace, or any item you buy or
          attempt to buy through a Listing.
        </p>
        <p>
          <strong>2.8 Relationship to other provisions.</strong> This Section 2 is
          in addition to, and is to be read together with, Section 4 (Accuracy of
          listing data), Section 12 (Disclaimers &amp; liability), and Section 14
          (Governing law &amp; disputes). Nothing in this Section 2 excludes or
          limits any right or liability that cannot be excluded or limited under
          applicable law.
        </p>
      </Prose>

      <SectionHeading number="03" label="Not affiliated with eBay">
        We're independent.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors is not affiliated with, endorsed by, sponsored by, or
          operated by eBay Inc. "eBay" is a trademark of its respective owner, used
          here only to describe the source of listing data. All listings, prices, and
          availability originate with eBay and its sellers, and all purchases happen
          on eBay under eBay's own terms, not ours. Listing content and data belong
          to eBay and its sellers; we only index and search publicly available
          listing information to help you find cards.
        </p>
      </Prose>

      <SectionHeading number="04" label="Accuracy of listing data">
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
          <li>Our print-run detection can make mistakes. It may miss a card's serial number, or misread other numbers (for example, a season like "22/23") as a print run.</li>
          <li>Listing titles are written by sellers and can be inaccurate, misleading, or mislabeled, and our parsing of them can be wrong.</li>
          <li>Grades, autographs, parallels, and other attributes we surface are derived from listing text and may not reflect the actual item.</li>
        </ul>
        <p>
          Always confirm every detail on the eBay listing itself before buying. You
          are solely responsible for your own purchasing decisions.
        </p>
      </Prose>

      <SectionHeading number="05" label="Listing availability">
        Listings change constantly.
      </SectionHeading>
      <Prose>
        <p>
          Listings can sell, change, be relisted, or be removed at any time, often
          faster than we can refresh. We are not responsible for stale, expired, or
          sold listings shown in search results, your watchlist, or notifications.
        </p>
      </Prose>

      <SectionHeading number="06" label="Third-party services">
        We depend on others to run.
      </SectionHeading>
      <Prose>
        <p>
          Fields &amp; Floors relies on third-party services to operate, including
          eBay for listing data, and providers such as Supabase, Vercel, Resend, and
          Google for hosting, database, email, and authentication. We don't control
          these services and aren't responsible for their accuracy, availability, or
          performance. We are not liable for any downtime, delay, data loss, error, or
          interruption caused by eBay or any other external service, or for changes
          they make to their own systems, data, or terms.
        </p>
      </Prose>

      <SectionHeading number="07" label="Alerts &amp; notifications">
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

      <SectionHeading number="08" label="Your account">
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

      <SectionHeading number="09" label="Our intellectual property">
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

      <SectionHeading number="10" label="Subscriptions, fees &amp; refunds">
        Our paid plans and how billing works.
      </SectionHeading>
      <Prose>
        <p>
          The Fields &amp; Floors service includes a free tier and at least one paid
          subscription tier. Current pricing, billing intervals, and what each plan
          includes are listed on our pricing page and shown again at checkout. Paid
          features unlock additional functionality (such as automated alerts on
          saved searches and bid reminders), not access to third-party listing
          data itself, which belongs to eBay and its sellers.
        </p>
        <p>
          <strong>Prices.</strong> Prices are in Canadian dollars (CAD) and are
          shown before applicable taxes. Applicable taxes are added at checkout.
        </p>
        <p>
          <strong>Free trial.</strong> New subscribers get a 14-day free trial.
          A valid payment method is required to start the trial. Unless you cancel
          before the trial ends, your subscription will automatically convert to
          a paid subscription and your payment method will be charged the
          then-current rate plus applicable taxes. You can cancel at any time
          before the trial ends to avoid being charged.
        </p>
        <p>
          <strong>Recurring billing.</strong> Paid subscriptions renew automatically
          at the end of each billing period (monthly or annual, depending on the
          plan you chose) until cancelled. You authorize our payment processor
          to charge your payment method on each renewal. You can cancel at any
          time; access continues through the end of the period you've already
          paid for, and you won't be billed again.
        </p>
        <p>
          <strong>How to cancel.</strong> If you subscribed on our website, cancel
          from the account menu (&ldquo;Manage membership&rdquo;), which opens
          Stripe's billing portal. If you subscribed in the iOS app, cancel in
          your Apple ID subscription settings. Deleting your account cancels a
          website subscription but does not cancel an App Store subscription.
        </p>
        <p>
          <strong>Refunds.</strong> Except where required by law, subscription
          fees are non-refundable, including for partially used periods. If you
          believe you were charged in error, please contact us and we'll
          investigate in good faith. Refunds for App Store purchases are handled
          by Apple under Apple's terms, not by us.
        </p>
        <p>
          <strong>Payment processors.</strong> Payments made on our website are
          processed by Stripe, which handles your payment card details, billing,
          and invoices. Payments made in the iOS app are processed by Apple
          through the App Store, and Apple's terms apply to those purchases. We
          never see or store your full payment card information. Your purchase is
          also subject to the terms and privacy policy of the processor you pay
          through.
        </p>
        <p>
          <strong>Price changes.</strong> We may change subscription pricing in
          the future. If we do, we will give you reasonable advance notice
          (typically by email) before the change takes effect for your account,
          and you may cancel before the new price applies.
        </p>
      </Prose>

      <SectionHeading number="11" label="Changes to the service">
        We may evolve or discontinue features.
      </SectionHeading>
      <Prose>
        <p>
          We may add, change, suspend, or discontinue any part of the service
          (including features, filters, or notifications) at any time, with or without
          notice. We are not liable to you for any modification, suspension, or
          discontinuation of the service or any feature.
        </p>
      </Prose>

      <SectionHeading number="12" label="Disclaimers &amp; liability">
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

      <SectionHeading number="13" label="Termination">
        Either of us can end it.
      </SectionHeading>
      <Prose>
        <p>
          You may stop using the service and delete your account at any time. We may
          suspend or terminate access if you violate these Terms or use the service in
          a way that risks harm to it or to others. Provisions that by their nature
          should survive termination (including intellectual property, disclaimers,
          and liability limits) will survive.
        </p>
      </Prose>

      <SectionHeading number="14" label="Governing law &amp; disputes">
        Alberta, Canada. Let's talk first.
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

      <SectionHeading number="15" label="Changes &amp; contact">
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
