import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — SAT Nexus",
  description: "The terms and conditions that govern your use of SAT Nexus.",
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

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-[820px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Legal</p>
      <h1 className="font-display mt-1 text-[30px] font-bold text-[var(--ink)]">Terms of Service</h1>
      <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 space-y-3 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement between you and SAT Nexus
          (&ldquo;SAT Nexus,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to
          and use of our website, applications, and related services (collectively, the &ldquo;Service&rdquo;). By
          creating an account or using the Service, you accept these Terms and our{" "}
          <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Service.
        </p>
      </div>

      <Section number="1" title="Eligibility and Accounts">
        <p>
          You may use the Service as a guest or with a registered account. You are responsible for maintaining the
          confidentiality of your account credentials and for all activity that occurs under your account. You agree
          to provide accurate information and to notify us promptly of any unauthorized use. If you are under the age
          of majority in your jurisdiction, you may use the Service only with the involvement and consent of a parent
          or legal guardian.
        </p>
      </Section>

      <Section number="2" title="The Service">
        <p>
          SAT Nexus provides SAT practice tools, including a question bank, practice quizzes, full-length practice
          tests, vocabulary and grammar study resources, analytics, and community features such as sharing, duels, and
          leaderboards. The Service is provided free of charge for personal, non-commercial educational use. We may
          add, modify, or discontinue features at any time.
        </p>
      </Section>

      <Section number="3" title="Educational Content and Trademarks">
        <p>
          Practice questions and related materials are drawn from publicly available College Board resources and are
          provided solely for educational purposes. SAT® is a registered trademark of the College Board, which is not
          affiliated with, does not sponsor, and does not endorse SAT Nexus. All other trademarks are the property of
          their respective owners.
        </p>
        <p>
          The Service does not guarantee any particular score, admission outcome, or academic result. Practice
          materials may differ from the content of any actual examination.
        </p>
      </Section>

      <Section number="4" title="Acceptable Use">
        <p>You agree that you will not:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
          <li>Interfere with or disrupt the Service, including by probing, scanning, overloading, or circumventing security or rate limits;</li>
          <li>Scrape, harvest, resell, or redistribute the Service or its content at scale or for commercial purposes;</li>
          <li>Impersonate any person, misrepresent your affiliation, or manipulate leaderboards, duels, or statistics through automated means or multiple accounts;</li>
          <li>Upload or share content that is unlawful, infringing, harassing, hateful, or otherwise objectionable;</li>
          <li>Reverse engineer or copy the Service except as permitted by applicable law.</li>
        </ul>
      </Section>

      <Section number="5" title="User Content">
        <p>
          The Service lets you create and share content such as notes, collections, shared quizzes, display names, and
          feedback (&ldquo;User Content&rdquo;). You retain ownership of your User Content. By submitting User
          Content, you grant SAT Nexus a non-exclusive, worldwide, royalty-free license to host, store, display, and
          distribute that content solely as needed to operate and improve the Service. You represent that you have all
          rights necessary to submit your User Content and that it does not violate any law or third-party right. We
          may remove User Content that violates these Terms.
        </p>
      </Section>

      <Section number="6" title="Feedback">
        <p>
          If you submit suggestions, ideas, or other feedback, you grant us the right to use them without restriction
          or compensation, and we may incorporate them into the Service.
        </p>
      </Section>

      <Section number="7" title="Intellectual Property">
        <p>
          Except for User Content and third-party materials, the Service — including its software, design, text,
          graphics, and logos — is owned by or licensed to SAT Nexus and is protected by intellectual-property laws.
          We grant you a limited, revocable, non-exclusive, non-transferable license to access and use the Service for
          personal, non-commercial educational purposes in accordance with these Terms.
        </p>
      </Section>

      <Section number="8" title="Termination">
        <p>
          You may stop using the Service or delete your account at any time from Settings. We may suspend or terminate
          your access to the Service at any time, with or without notice, if we reasonably believe you have violated
          these Terms, if required by law, or if continuing to provide the Service is no longer commercially viable.
          Sections that by their nature should survive termination (including Sections 5–12) will survive.
        </p>
      </Section>

      <Section number="9" title="Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY CONTENT (INCLUDING ANSWERS AND EXPLANATIONS) IS COMPLETE OR
          ACCURATE.
        </p>
      </Section>

      <Section number="10" title="Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAT NEXUS AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, USE, OR GOODWILL,
          ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY FOR ANY CLAIM RELATING
          TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE
          CLAIM OR (B) FIFTY U.S. DOLLARS (US $50). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO SOME OF THE
          ABOVE MAY NOT APPLY TO YOU.
        </p>
      </Section>

      <Section number="11" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless SAT Nexus and its contributors from and against any claims,
          liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo; fees) arising out of or
          related to your User Content, your use of the Service, or your violation of these Terms.
        </p>
      </Section>

      <Section number="12" title="Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of the State of Michigan, United States, without regard to its
          conflict-of-law rules. Any dispute arising out of or relating to these Terms or the Service will be resolved
          in the state or federal courts located in Michigan, and you consent to their jurisdiction, except that
          either party may seek relief in small-claims court or injunctive relief for misuse of intellectual property.
        </p>
      </Section>

      <Section number="13" title="Changes to These Terms">
        <p>
          We may revise these Terms from time to time. We will post the revised Terms on this page and update the
          &ldquo;Last updated&rdquo; date above, and we will provide additional notice of material changes where
          practical. Your continued use of the Service after revised Terms take effect constitutes acceptance of the
          changes.
        </p>
      </Section>

      <Section number="14" title="Contact">
        <p>
          Questions about these Terms? Reach out through the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">
            Contact page
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
