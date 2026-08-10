import type { Metadata } from "next";
import Link from "next/link";
import { Copyright, Mail, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "DMCA Copyright Policy — SAT Nexus",
  description:
    "How to submit a copyright takedown notice or counter-notification to SAT Nexus under Section 512(c) of the Digital Millennium Copyright Act.",
};

const LAST_UPDATED = "August 10, 2026";
const DMCA_AGENT_EMAIL = "dmca@sat-nexus.com";

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

export default function DmcaPolicyPage() {
  return (
    <div className="mx-auto max-w-[820px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Legal</p>
      <h1 className="font-display mt-1 flex items-center gap-2.5 text-[30px] font-bold text-[var(--ink)]">
        <Copyright className="h-7 w-7 text-[var(--accent)]" aria-hidden="true" />
        DMCA Copyright Policy
      </h1>
      <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 space-y-3 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        <p>
          SAT Nexus respects the intellectual-property rights of others and expects users of the Service to do the
          same. In accordance with the Digital Millennium Copyright Act of 1998, 17 U.S.C. § 512
          (&ldquo;DMCA&rdquo;), we will respond expeditiously to properly submitted claims of copyright infringement
          committed using the Service. This page describes the notice-and-takedown procedure under Section 512(c) of
          the DMCA.
        </p>
      </div>

      {/* Designated agent card */}
      <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
        <div className="flex items-center gap-2.5">
          <Mail className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-[var(--ink)]">Designated DMCA Agent</h2>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13.5px] sm:grid-cols-[140px_1fr]">
          <dt className="font-bold text-[var(--ink)]">Agent</dt>
          <dd className="text-[var(--ink-soft)]">Copyright Agent, SAT Nexus</dd>
          <dt className="font-bold text-[var(--ink)]">Email</dt>
          <dd>
            <a href={`mailto:${DMCA_AGENT_EMAIL}`} className="font-semibold text-[var(--accent)] hover:underline">
              {DMCA_AGENT_EMAIL}
            </a>{" "}
            <span className="text-[var(--ink-faint)]">(subject line: &ldquo;DMCA Takedown Notice&rdquo;)</span>
          </dd>
          <dt className="font-bold text-[var(--ink)]">Mailing address</dt>
          <dd className="text-[var(--ink-soft)]">SAT Nexus — Copyright Agent, [Street Address], [City], MI [ZIP], United States</dd>
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">
          Only copyright notices and counter-notifications should be sent to the agent above. All other inquiries
          (support, privacy, feedback) should go through the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">Contact page</Link>{" "}
          and will not receive a response at this address.
        </p>
      </div>

      <Section number="1" title="Filing a Takedown Notice (17 U.S.C. § 512(c)(3))">
        <p>
          If you are a copyright owner (or authorized to act on behalf of one) and believe that material available
          through the Service infringes your copyright, submit a written notification to our Designated Agent that
          includes <strong>all</strong> of the following:
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            A <strong>physical or electronic signature</strong> of the copyright owner or a person authorized to act
            on the owner&rsquo;s behalf;
          </li>
          <li>
            <strong>Identification of the copyrighted work</strong> claimed to have been infringed — or, if multiple
            works are covered by a single notification, a representative list of those works;
          </li>
          <li>
            <strong>Identification of the allegedly infringing material</strong> and information reasonably sufficient
            to permit us to locate it (for SAT Nexus, please include the full URL and, where applicable, the question
            ID, collection name, or username associated with the material);
          </li>
          <li>
            Your <strong>contact information</strong>: name, mailing address, telephone number, and email address;
          </li>
          <li>
            A statement that you have a <strong>good-faith belief</strong> that use of the material in the manner
            complained of is not authorized by the copyright owner, its agent, or the law;
          </li>
          <li>
            A statement that the information in the notification is <strong>accurate</strong>, and{" "}
            <strong>under penalty of perjury</strong>, that you are authorized to act on behalf of the owner of the
            exclusive right that is allegedly infringed.
          </li>
        </ol>
        <p>
          Upon receipt of a valid notice, we will remove or disable access to the identified material expeditiously,
          notify the user who posted it (where we have contact information), and document the complaint.
        </p>
      </Section>

      <Section number="2" title="Counter-Notification (17 U.S.C. § 512(g))">
        <p>
          If material you posted was removed and you believe the removal was the result of mistake or
          misidentification, you may submit a written counter-notification to our Designated Agent including:
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Your physical or electronic signature;</li>
          <li>Identification of the material that was removed and the location where it appeared before removal;</li>
          <li>
            A statement <strong>under penalty of perjury</strong> that you have a good-faith belief the material was
            removed as a result of mistake or misidentification;
          </li>
          <li>
            Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the
            federal district court for your judicial district (or, if outside the United States, any judicial district
            in which SAT Nexus may be found), and that you will accept service of process from the person who filed
            the original takedown notice or their agent.
          </li>
        </ol>
        <p>
          If we receive a valid counter-notification, we will forward it to the original complainant. Unless the
          complainant notifies us within 10 business days that they have filed a court action seeking to restrain the
          infringement, we may restore the removed material within 10–14 business days.
        </p>
      </Section>

      <Section number="3" title="Repeat Infringers">
        <p>
          In accordance with the DMCA and our{" "}
          <Link href="/terms" className="font-semibold text-[var(--accent)] hover:underline">Terms of Service</Link>,
          we will, in appropriate circumstances, disable or terminate the accounts of users who are repeat infringers.
        </p>
      </Section>

      <Section number="4" title="Misrepresentations">
        <p className="flex gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <span>
            Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing,
            or that material was removed by mistake, may be liable for damages — including costs and attorneys&rsquo;
            fees. Please consider whether the use may be a fair use before submitting a notice.
          </span>
        </p>
      </Section>

      <Section number="5" title="Not Legal Advice">
        <p>
          The information on this page is provided for convenience and does not constitute legal advice. If you are
          unsure whether material infringes your copyright, or how to respond to a takedown, consult an attorney.
        </p>
      </Section>
    </div>
  );
}
