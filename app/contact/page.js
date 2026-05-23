import { ArrowUpRight } from 'lucide-react';
import PageShell, { Prose, SectionHeading } from '../components/PageShell';

export const metadata = {
  title: 'Contact — Fields & Floors Collectors',
  description: 'Get in touch. Bug reports, feature ideas, and "this card got through your filter" reports especially welcome.',
};

/* Edit these as needed. Twitter/X handle and other socials currently
   omitted — add them here when the time comes. */
const CONTACTS = [
  {
    label: 'General',
    handle: 'hello@fieldsandfloors.com',
    href: 'mailto:hello@fieldsandfloors.com',
    note: 'For anything: feedback, partnerships, hello.',
  },
  {
    label: 'Bug reports',
    handle: 'bugs@fieldsandfloors.com',
    href: 'mailto:bugs@fieldsandfloors.com?subject=Bug%20report',
    note: 'A filter let a date through as a print run? A search returned the wrong player? Tell us.',
  },
];

function ContactRow({ contact }) {
  return (
    <li className="py-7 border-t border-[var(--line-soft)] first:border-t-0 first:pt-0">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-2">
        {contact.label}
      </p>
      <a
        href={contact.href}
        className="group inline-flex items-baseline gap-2 font-display text-2xl text-[var(--ink-100)] tracking-tight hover:text-[var(--gold)] transition-colors"
      >
        {contact.handle}
        <ArrowUpRight
          size={16}
          className="text-[var(--ink-600)] group-hover:text-[var(--gold)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
        />
      </a>
      <p className="mt-2 text-[var(--ink-200)] leading-relaxed text-pretty">
        {contact.note}
      </p>
    </li>
  );
}

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="The Address"
      title="Get in touch."
      lede="Bug reports, feature ideas, and 'this card got through your filter' reports especially welcome. Real human reads every email."
    >
      <ul className="mt-2">
        {CONTACTS.map((c) => (
          <ContactRow key={c.href} contact={c} />
        ))}
      </ul>

      <SectionHeading number="02" label="What to send">
        Useful signal, lightly formatted.
      </SectionHeading>
      <Prose>
        <p>
          A good bug report includes: the search term you typed, the filters you had on, and ideally a link to the listing that shouldn't have appeared (or should have). Screenshots help. We respond to everything that's signal.
        </p>
        <p>
          Feature requests get filed and read. We can't build everything, and we deliberately ship narrow — but the requests are how we know what the next narrow thing should be.
        </p>
      </Prose>
    </PageShell>
  );
}
