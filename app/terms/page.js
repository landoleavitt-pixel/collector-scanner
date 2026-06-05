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
          on eBay under eBay's own terms — not ours.
        </p>
      </Prose>

      <SectionHeading number="03" label="Accuracy &amp; availability">
        Listing data is provided as-is.
      </SectionHeading>
      <Prose>
        <p>
          We pull listing information from third-party sources and present it as
          accurately as we can, but we don't guarantee that any listing, price,
          print run, grade, or availability shown is current, complete, or correct.
          Listings sell, prices change, and titles can be miswritten by sellers.
          Always confirm the details on the eBay listing itself before buying. You
          are solely responsible for your own purchasing decisions.
        </p>
      </Prose>

      <SectionHeading number="04" label="Your account">
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

      <SectionHeading number="05" label="Subscriptions &amp; fees">
        If and when paid features exist.
      </SectionHeading>
      <Prose>
        <p>
          Some features may be offered free and others as part of a paid
          subscription. Any fees, billing terms, and cancellation details will be
          disclosed clearly at the point of purchase. Paid features are for access to
          our tools and functionality — not for access to third-party listing data
          itself.
        </p>
      </Prose>

      <SectionHeading number="06" label="Disclaimers &amp; liability">
        The honest fine print.
      </SectionHeading>
      <Prose>
        <p>
          The service is provided "as is" and "as available," without warranties of
          any kind, whether express or implied. To the fullest extent permitted by
          law, Fields &amp; Floors is not liable for any indirect, incidental, or
          consequential damages, or for any loss arising from your use of the service
          or from any purchase you make on a third-party marketplace. Nothing in these
          Terms limits liability that cannot be limited under applicable law.
        </p>
      </Prose>

      <SectionHeading number="07" label="Termination">
        Either of us can end it.
      </SectionHeading>
      <Prose>
        <p>
          You may stop using the service and delete your account at any time. We may
          suspend or terminate access if you violate these Terms or use the service in
          a way that risks harm to it or to others. Provisions that by their nature
          should survive termination will survive.
        </p>
      </Prose>

      <SectionHeading number="08" label="Changes &amp; contact">
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
