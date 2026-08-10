import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service & EULA — SAT Nexus",
  description:
    "The Terms of Service and End User License Agreement that govern your use of SAT Nexus, including the binding arbitration agreement and class action waiver.",
};

const LAST_UPDATED = "August 10, 2026";

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" id={`section-${number}`}>
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
      <h1 className="font-display mt-1 text-[30px] font-bold text-[var(--ink)]">
        Terms of Service &amp; End User License Agreement
      </h1>
      <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 space-y-3 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        <p>
          These Terms of Service and End User License Agreement (together, the &ldquo;Terms&rdquo;) are a binding
          agreement between you and SAT Nexus (&ldquo;SAT Nexus,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) governing your access to and use of our website, applications, question banks, and
          related services (collectively, the &ldquo;Service&rdquo;). By creating an account or using the Service,
          you accept these Terms and our{" "}
          <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Service.
        </p>
      </div>

      <div className="mt-5 rounded-[10px] border border-[#d2abb7] bg-[#f0dfe5]/60 p-4 text-[13.5px] leading-relaxed text-[var(--ink)]">
        <strong className="font-bold uppercase tracking-wide text-[12px]">Important notice:</strong> Section 14 of
        these Terms contains a <strong>binding arbitration agreement and class action waiver</strong>. It affects your
        legal rights by requiring that disputes be resolved through individual binding arbitration rather than jury
        trials or class actions. Please read it carefully.
      </div>

      <Section number="1" title="Eligibility and Accounts">
        <p>
          You may use the Service as a guest or with a registered account. You are responsible for maintaining the
          confidentiality of your account credentials and for all activity that occurs under your account. You agree
          to provide accurate information and to notify us promptly of any unauthorized use. If you are under the age
          of majority in your jurisdiction, you may use the Service only with the involvement and consent of a parent
          or legal guardian, who agrees to be bound by these Terms on your behalf.
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

      <Section number="3" title="End User License Agreement (EULA)">
        <p>
          <strong className="text-[var(--ink)]">3.1 License grant.</strong> Subject to your continued compliance with
          these Terms, SAT Nexus grants you a <strong>limited, non-exclusive, non-transferable, non-sublicensable,
          revocable license</strong> to access and use the Service, and to view and interact with its content, solely
          for your personal, non-commercial educational use. This license is a permission to use — it is not a sale,
          and it conveys no ownership interest in the Service or its content.
        </p>
        <p>
          <strong className="text-[var(--ink)]">3.2 License restrictions.</strong> Except to the extent expressly
          permitted by applicable law that cannot be contractually waived, you shall <strong>not</strong>, and shall
          not permit or assist any third party to:
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong className="text-[var(--ink)]">Scrape or harvest</strong> the Service — including by web scraping,
            crawling, spidering, data mining, screen capture at scale, or bulk downloading of the question banks,
            explanations, vocabulary decks, or any other content or data;
          </li>
          <li>
            <strong className="text-[var(--ink)]">Deploy automated agents</strong> — bots, scripts, headless browsers,
            or other automated means — to access the Service, create accounts, submit answers, manipulate statistics,
            or otherwise interact with the Service other than through the interfaces we provide;
          </li>
          <li>
            <strong className="text-[var(--ink)]">Reverse engineer</strong>, decompile, disassemble, translate, or
            otherwise attempt to derive the source code, underlying structure, algorithms, or non-public APIs of the
            Service;
          </li>
          <li>
            <strong className="text-[var(--ink)]">Commercially resell or redistribute</strong> the question banks or
            any portion of the Service — including selling, licensing, renting, republishing, mirroring, or bundling
            the content into a competing or paid product, course, or dataset (including datasets used to train
            machine-learning models);
          </li>
          <li>Circumvent, disable, or interfere with rate limits, access controls, or security-related features;</li>
          <li>Remove, obscure, or alter any proprietary notices or attributions contained in the Service.</li>
        </ul>
        <p>
          <strong className="text-[var(--ink)]">3.3 Revocation.</strong> This license is revocable at will: we may
          suspend or terminate it at any time under Section 8. Any use of the Service in violation of this Section 3
          automatically terminates the license, and any copies of content obtained through such use must be destroyed.
        </p>
      </Section>

      <Section number="4" title="Educational Content and Trademarks">
        <p>
          Practice questions and related materials are drawn from publicly available College Board resources and are
          provided solely for educational purposes. SAT® is a registered trademark of the College Board, which is not
          affiliated with, does not sponsor, and does not endorse SAT Nexus. All other trademarks are the property of
          their respective owners.
        </p>
        <p>
          The Service does not guarantee any particular score, admission outcome, or academic result. Practice
          materials may differ from the content of any actual examination. Portions of the Service — including certain
          question explanations and study hints — may be generated or enhanced using artificial intelligence models
          and may contain errors; they are provided for study assistance only.
        </p>
      </Section>

      <Section number="5" title="Acceptable Use">
        <p>In addition to the license restrictions in Section 3, you agree that you will not:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
          <li>Interfere with or disrupt the Service, including by probing, scanning, or overloading our infrastructure;</li>
          <li>Impersonate any person, misrepresent your affiliation, or manipulate leaderboards, duels, or statistics through automated means or multiple accounts;</li>
          <li>Upload or share content that is unlawful, infringing, harassing, hateful, obscene, or otherwise objectionable;</li>
          <li>Copy the Service except as permitted by these Terms or by applicable law that cannot be contractually waived.</li>
        </ul>
      </Section>

      <Section number="6" title="User-Generated Content">
        <p>
          <strong className="text-[var(--ink)]">6.1 Your content.</strong> The Service lets you create, upload, and
          share content such as notes, custom collections, shared quizzes, duel challenges, display names, profile
          details, and feedback (&ldquo;User-Generated Content&rdquo; or &ldquo;UGC&rdquo;). You retain ownership of
          your UGC.
        </p>
        <p>
          <strong className="text-[var(--ink)]">6.2 Your responsibility; our disclaimer.</strong> You are{" "}
          <strong>solely and fully legally responsible</strong> for all UGC you submit, including its legality,
          accuracy, appropriateness, and non-infringement. SAT Nexus does not endorse, verify, or assume any liability
          for UGC. UGC reflects the views of the user who submitted it, not ours, and we expressly disclaim all
          liability arising from or relating to UGC to the maximum extent permitted by law. We act as a passive
          conduit for UGC and have no obligation to pre-screen it, though we reserve the right to do so.
        </p>
        <p>
          <strong className="text-[var(--ink)]">6.3 License to us.</strong> By submitting UGC, you grant SAT Nexus a{" "}
          <strong>non-exclusive, worldwide, royalty-free, sublicensable license</strong> to host, store, reproduce,
          display, distribute, and adapt (for technical purposes such as formatting) that UGC as needed to operate,
          promote, and improve the Service, including displaying it to users you choose to share it with. This license
          ends when you delete the UGC or your account, except for content already shared with others, retained in
          routine backups, or where retention is required by law. You represent and warrant that you have all rights
          necessary to grant this license and that your UGC does not violate any law or third-party right.
        </p>
        <p>
          <strong className="text-[var(--ink)]">6.4 Moderation and enforcement.</strong> We may — but are not obligated
          to — monitor, review, edit for formatting, refuse, remove, or restrict access to any UGC at any time, with
          or without notice, for any reason, including UGC we reasonably believe violates these Terms or applicable
          law. We may <strong>suspend or permanently terminate the accounts</strong> of users who post abusive,
          harassing, infringing, or otherwise objectionable content, or who repeatedly violate this Section, in
          addition to any other remedies available to us. Reports of abusive content can be submitted through the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">Contact page</Link>.
        </p>
      </Section>

      <Section number="7" title="Feedback">
        <p>
          If you submit suggestions, ideas, or other feedback, you grant us the right to use them without restriction
          or compensation, and we may incorporate them into the Service.
        </p>
      </Section>

      <Section number="8" title="Intellectual Property and Copyright Complaints">
        <p>
          Except for UGC and third-party materials, the Service — including its software, design, text, graphics, and
          logos — is owned by or licensed to SAT Nexus and is protected by intellectual-property laws. Nothing in
          these Terms grants you any right to use our names, logos, or branding.
        </p>
        <p>
          We respect the intellectual-property rights of others and respond to copyright complaints in accordance with
          the Digital Millennium Copyright Act. To report allegedly infringing material, or to submit a
          counter-notification, follow the procedure in our{" "}
          <Link href="/dmca" className="font-semibold text-[var(--accent)] hover:underline">
            DMCA Copyright Policy
          </Link>
          . We maintain a policy of terminating the accounts of repeat infringers in appropriate circumstances.
        </p>
      </Section>

      <Section number="9" title="Termination">
        <p>
          You may stop using the Service or delete your account at any time from Settings. We may suspend or terminate
          your access to the Service (and revoke the license granted in Section 3) at any time, with or without
          notice, if we reasonably believe you have violated these Terms, if required by law, or if continuing to
          provide the Service is no longer commercially viable. Sections that by their nature should survive
          termination (including Sections 3.2, 6, and 10–15) will survive.
        </p>
      </Section>

      <Section number="10" title="Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY CONTENT — INCLUDING ANSWERS, EXPLANATIONS, AND
          AI-GENERATED OR AI-ENHANCED CONTENT — IS COMPLETE OR ACCURATE.
        </p>
      </Section>

      <Section number="11" title="Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAT NEXUS AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, USE, OR GOODWILL,
          ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE OR ANY USER-GENERATED CONTENT. OUR AGGREGATE
          LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN
          THE TWELVE MONTHS PRECEDING THE CLAIM OR (B) FIFTY U.S. DOLLARS (US $50). SOME JURISDICTIONS DO NOT ALLOW
          CERTAIN LIMITATIONS, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.
        </p>
      </Section>

      <Section number="12" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless SAT Nexus and its contributors from and against any claims,
          liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo; fees) arising out of or
          related to your User-Generated Content, your use of the Service, or your violation of these Terms.
        </p>
      </Section>

      <Section number="13" title="Governing Law">
        <p>
          These Terms are governed by the laws of the State of Michigan, United States, without regard to its
          conflict-of-law rules, and — for matters not subject to arbitration under Section 14 — you consent to the
          exclusive jurisdiction of the state and federal courts located in Michigan.
        </p>
      </Section>

      <Section number="14" title="Binding Arbitration and Class Action Waiver">
        <p className="font-semibold text-[var(--ink)]">
          PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN
          COURT AND TO HAVE A JURY HEAR YOUR CLAIMS.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.1 Agreement to arbitrate.</strong> You and SAT Nexus agree that{" "}
          <strong>
            any and all claims, disputes, or controversies arising out of or relating to these Terms, the Service, or
            your use of the Service
          </strong>{" "}
          — whether based in contract, tort, statute, fraud, misrepresentation, or any other legal theory — shall be
          resolved exclusively through <strong>final and binding arbitration conducted on an individual basis</strong>,
          rather than in court, except as set out in Section 14.4. The Federal Arbitration Act governs the
          interpretation and enforcement of this Section.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.2 Arbitration procedure.</strong> The arbitration will be
          administered by the American Arbitration Association (&ldquo;AAA&rdquo;) under its Consumer Arbitration
          Rules then in effect, before a single neutral arbitrator. Arbitration may be conducted by written
          submissions, by telephone or video conference, or — if an in-person hearing is required — in the county
          where you reside or another mutually agreed location. The arbitrator may award the same individual relief a
          court could award, and judgment on the award may be entered in any court of competent jurisdiction.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.3 Jury trial waiver.</strong> YOU AND SAT NEXUS EACH{" "}
          <strong>WAIVE THE RIGHT TO A TRIAL BY JURY</strong> for all arbitrable disputes.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.4 Exceptions.</strong> Either party may (a) bring an individual
          claim in small-claims court if it qualifies, and (b) seek injunctive or other equitable relief in a court of
          competent jurisdiction to prevent actual or threatened infringement or misuse of intellectual-property
          rights (including violations of the license restrictions in Section 3).
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.5 Class action waiver.</strong> YOU AND SAT NEXUS AGREE THAT EACH
          MAY BRING CLAIMS AGAINST THE OTHER{" "}
          <strong>
            ONLY IN AN INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS,
            CONSOLIDATED, OR REPRESENTATIVE PROCEEDING
          </strong>
          . The arbitrator may not consolidate more than one person&rsquo;s claims and may not preside over any form
          of class or representative proceeding. If this class action waiver is found unenforceable as to a particular
          claim, that claim (and only that claim) shall proceed in court, and the remainder shall be arbitrated.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.6 30-day opt-out.</strong> You may opt out of this arbitration
          agreement and class action waiver by sending us written notice — via the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">Contact page</Link>{" "}
          with the subject &ldquo;Arbitration Opt-Out,&rdquo; including your account email — within 30 days of first
          accepting these Terms. Opting out does not affect any other provision of these Terms.
        </p>
        <p>
          <strong className="text-[var(--ink)]">14.7 Severability.</strong> Except as stated in Section 14.5, if any
          part of this Section 14 is found unenforceable, the remaining parts shall remain in full force and effect.
        </p>
      </Section>

      <Section number="15" title="Changes to These Terms">
        <p>
          We may revise these Terms from time to time. We will post the revised Terms on this page and update the
          &ldquo;Last updated&rdquo; date above, and we will provide additional notice of material changes where
          practical. Your continued use of the Service after revised Terms take effect constitutes acceptance of the
          changes.
        </p>
      </Section>

      <Section number="16" title="Contact">
        <p>
          Questions about these Terms? Reach out through the{" "}
          <Link href="/contact" className="font-semibold text-[var(--accent)] hover:underline">
            Contact page
          </Link>
          . Copyright matters should follow the{" "}
          <Link href="/dmca" className="font-semibold text-[var(--accent)] hover:underline">
            DMCA Copyright Policy
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
