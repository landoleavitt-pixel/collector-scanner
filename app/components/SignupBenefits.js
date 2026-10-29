'use client';

// What an account gets you, beside the sign-up form (above it on phones).
// Every line must stay true: check it against the plans when payments go live.

import { Bell, Star, Clock, MonitorSmartphone, Gift } from 'lucide-react';
import { PAYMENTS_LIVE } from '../../lib/payments';

export const SIGNUP_BENEFITS = [
  [Bell, PAYMENTS_LIVE ? 'Email alerts on your saved searches' : 'Alerts on up to 5 saved searches', 'Email, plus a notification in the iPhone app'],
  [Star, 'A watchlist that stays current', 'Live price and sold status on every card you star'],
  [Clock, 'Bid reminders', 'At the times you pick before an auction ends'],
  [MonitorSmartphone, 'Your searches on every device', 'Phone, laptop and the app, all in sync'],
];

export default function SignupBenefits() {
  return (
    <div>
      {!PAYMENTS_LIVE && (
        <span
          className="inline-flex items-center gap-2 text-[13px] rounded-full px-3 py-1.5 mb-4 md:mb-5"
          style={{ color: 'var(--gold-bright)', border: '1px solid var(--gold-deep)' }}
        >
          <Gift className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
          Free during early access
        </span>
      )}
      <h2 className="font-display italic text-[28px] md:text-[40px] leading-[1.05] mb-4 md:mb-6">
        Let the cards come to you.
      </h2>
      <ul className="list-none m-0 p-0 grid gap-2.5 md:gap-4">
        {SIGNUP_BENEFITS.map(([Icon, title, detail]) => (
          <li key={title} className="grid grid-cols-[18px_1fr] md:grid-cols-[22px_1fr] gap-2.5 md:gap-3 items-start">
            <Icon className="w-4 h-4 md:w-[18px] md:h-[18px] mt-0.5" strokeWidth={1.75} style={{ color: 'var(--gold-bright)' }} aria-hidden="true" />
            <div>
              <div className="text-[14px] md:text-[15px] md:font-medium" style={{ color: 'var(--ink-100)' }}>{title}</div>
              <div className="hidden md:block text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>{detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
