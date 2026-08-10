import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SAT Nexus",
  description: "How SAT Nexus collects, uses, protects, and shares your information.",
};

const LAST_UPDATED = "August 10, 2026";

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-[19px] font-bold text-[var(--ink)]">
        {number}. {title}
      </h2>
      <div className="mt-2 space-y-3 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-[820px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Legal</p>
      <h1 className="font-display mt-1 text-[30px] font-bold text-[var(--ink)]">Privacy Policy</h1>
      <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 space-y-3 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        <p>
          This Privacy Policy describes how SAT Nexus (&ldquo;SAT Nexus,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) collects, uses, discloses, and safeguards information when you visit or use our website,
          applications, and related services (collectively, the &ldquo;Service&rdquo;). By accessing or using the
          Service, you agree to the collection and use of information in accordance with this Policy. If you do not
          agree with this Policy, please do not use the Service.
        </p>
      </div>

      <Section number="1" title="Information We Collect">
        <p>
          <strong className="text-[var(--ink)]">Information you provide directly.</strong> When you create an account
          we collect your email address, a display name you choose, and authentication credentials managed by our
          authentication provider. If you contact us or submit feedback, we collect the contents of your message and
          any contact details you include.
        </p>
        <p>
          <strong className="text-[var(--ink)]">Study and usage data.</strong> To operate the Service&rsquo;s core
          features we store your practice activity, including quiz sessions and answers, practice-test progress,
          collections, favorites, notes, mistake-bank entries, study-session history, duel results, and leaderboard
          statistics.
        </p>
        <p>
          <strong className="text-[var(--ink)]">Technical and analytics data.</strong> We automatically collect
          limited technical information such as browser type, device characteristics, pages visited, approximate
          region, and interaction events. We use privacy-conscious analytics tools (such as Vercel Analytics and
          PostHog) and error-monitoring tools (such as Sentry) to keep the Service fast and reliable.
        </p>
        <p>
          <strong className="text-[var(--ink)]">Presence data.</strong> While you are signed in, the Service records a
          periodic &ldquo;heartbeat&rdquo; timestamp so administrators can see whether an account is currently online
          and when it was last active.
        </p>
        <p>
          <strong className="text-[var(--ink)]">Guest sessions.</strong> You may use much of the Service without an
          account. Guest progress is stored locally in your browser and/or under a random guest identifier that is not
          linked to your name or email address.
        </p>
      </Section>

      <Section number="2" title="How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Provide, operate, maintain, and improve the Service;</li>
          <li>Save and synchronize your study progress, scores, and preferences across devices;</li>
          <li>Personalize practice recommendations and analytics dashboards;</li>
          <li>Operate community features such as sharing, duels, and leaderboards;</li>
          <li>Respond to your feedback, questions, and support requests;</li>
          <li>Monitor usage, diagnose technical problems, and protect against abuse, fraud, and security incidents;</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>
      </Section>

      <Section number="3" title="Legal Bases for Processing">
        <p>
          Where applicable law (such as the EU/UK General Data Protection Regulation) requires a legal basis for
          processing, we rely on: (a) performance of a contract, to deliver the Service you request; (b) our
          legitimate interests, such as securing and improving the Service; (c) your consent, where required, which
          you may withdraw at any time; and (d) compliance with legal obligations.
        </p>
      </Section>

      <Section number="4" title="Cookies and Local Storage">
        <p>
          We use cookies and browser storage (localStorage and sessionStorage) that are strictly necessary to keep you
          signed in, remember your settings (theme, layout, quiz preferences), and store guest progress. Analytics
          cookies help us understand aggregate usage. You can control cookies through your browser settings; disabling
          them may limit some functionality.
        </p>
      </Section>

      <Section number="5" title="How We Share Information">
        <p>We share information only in the following circumstances:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong className="text-[var(--ink)]">Service providers.</strong> With vendors that host and support the
            Service (for example Vercel for hosting, Supabase for authentication and databases, and Resend for
            transactional email), under agreements that limit their use of your data;
          </li>
          <li>
            <strong className="text-[var(--ink)]">Other users, at your direction.</strong> When you share a question,
            collection, or quiz, join a duel, or appear on the leaderboard, your display name and related activity are
            visible to the recipients (you may hide yourself from the leaderboard in Settings);
          </li>
          <li>
            <strong className="text-[var(--ink)]">Legal requirements.</strong> When required by law, subpoena, or
            other legal process, or to protect the rights, property, or safety of SAT Nexus, our users, or others;
          </li>
          <li>
            <strong className="text-[var(--ink)]">Business transfers.</strong> In connection with a merger,
            acquisition, or sale of assets, in which case this Policy will continue to apply to your information.
          </li>
        </ul>
      </Section>

      <Section number="6" title="Data Retention">
        <p>
          We retain your account information and study data for as long as your account is active or as needed to
          provide the Service. You may delete your account at any time from Settings; doing so permanently removes
          your synced study data from our production databases within a reasonable period, except where retention is
          required by law or for legitimate backup and security purposes.
        </p>
      </Section>

      <Section number="7" title="Security">
        <p>
          We use administrative, technical, and physical safeguards designed to protect your information, including
          encrypted connections (HTTPS), access controls, row-level security on our databases, and reputable managed
          infrastructure. However, no method of transmission or storage is completely secure, and we cannot guarantee
          absolute security.
        </p>
      </Section>

      <Section number="8" title="Children's Privacy">
        <p>
          The Service is designed for students preparing for the SAT, including students under 18. We collect only the
          minimal information needed to operate the Service and do not knowingly collect personal information from
          children under 13 without verifiable parental consent. If you believe a child under 13 has provided us
          personal information, please contact us and we will promptly delete it.
        </p>
      </Section>

      <Section number="9" title="Your Rights and Choices">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Access, correct, or update your personal information (available in Settings);</li>
          <li>Delete your account and associated data (available in Settings);</li>
          <li>Export or request a copy of your data;</li>
          <li>Object to or restrict certain processing;</li>
          <li>Withdraw consent where processing is based on consent;</li>
          <li>Lodge a complaint with your local data-protection authority.</li>
        </ul>
        <p>
          To exercise any of these rights, use the tools in Settings or contact us via the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">
            Contact page
          </Link>
          . We will respond within the time required by applicable law.
        </p>
      </Section>

      <Section number="10" title="International Transfers">
        <p>
          Our infrastructure providers may store and process information in the United States and other countries.
          Where information is transferred internationally, we rely on appropriate safeguards such as standard
          contractual clauses offered by our providers.
        </p>
      </Section>

      <Section number="11" title="Third-Party Content">
        <p>
          Practice questions are sourced from publicly available College Board materials for educational purposes. SAT
          is a registered trademark of the College Board, which is not affiliated with and does not endorse SAT Nexus.
          The Service may link to third-party sites whose privacy practices we do not control.
        </p>
      </Section>

      <Section number="12" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised Policy on this page and update
          the &ldquo;Last updated&rdquo; date above. Material changes will be communicated through the Service where
          practical. Continued use of the Service after changes become effective constitutes acceptance of the revised
          Policy.
        </p>
      </Section>

      <Section number="13" title="Contact Us">
        <p>
          If you have questions about this Privacy Policy or our data practices, please reach out through the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">
            Contact page
          </Link>{" "}
          or the in-app{" "}
          <Link href="/feedback" className="font-semibold text-[var(--accent)] hover:underline">
            Feedback form
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
