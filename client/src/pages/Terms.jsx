import LegalLayout, { LegalSection } from '../components/LegalLayout'
import { CONTACT_EMAIL, COPYRIGHT_OWNER, copyrightYear } from '../data/legal'

const LAST_UPDATED = `July 27, ${copyrightYear()}`

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="The short version">
        <p>
          Index Card Kitchen is a <strong>personal recipe box</strong>. You save, organize, and
          print recipes for your own kitchen. We are not a recipe publisher or a public recipe
          directory.
        </p>
      </LegalSection>

      <LegalSection title="Personal use">
        <p>
          You may use Index Card Kitchen to store and print recipes for{' '}
          <strong>personal, non-commercial</strong> use. Do not use the service to build a public
          recipe website, scrape our platform, or redistribute imported content at scale.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You are responsible for the recipes you add, import, edit, or print — including content
          pulled from other websites. Only import recipes you have the right to save for personal
          use, and link to the original source when you can.
        </p>
        <p>
          By using the service, you represent that your use of saved content complies with
          applicable law and the terms of any source website.
        </p>
      </LegalSection>

      <LegalSection title="Importing from links">
        <p>
          The import feature extracts recipe data from URLs you provide. We do not claim ownership
          of third-party recipes. Imported content remains attributed to its source where possible.
          We do not guarantee that every site permits automated import.
        </p>
      </LegalSection>

      <LegalSection title="Copyright complaints">
        <p>
          We respect intellectual property. Index Card Kitchen stores user-imported content in
          private accounts; we do not publish a searchable recipe catalog.
        </p>
        <p>
          If you believe content stored through our service infringes your copyright, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gingham hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          with:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identification of the copyrighted work</li>
          <li>The URL or description of the material in question</li>
          <li>Your contact information and a good-faith statement of unauthorized use</li>
          <li>A statement that the information is accurate and you are authorized to act</li>
        </ul>
        <p>We will review and respond as appropriate.</p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You may use the app without an account (browser storage) or create a free account for
          cloud sync. Keep your login credentials secure. You are responsible for activity under
          your account.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          Index Card Kitchen is provided <strong>“as is”</strong> without warranties of any kind.
          We do not guarantee uninterrupted service, accurate imports, or perfect print layouts.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Index Card Kitchen and its operators will not be
          liable for indirect, incidental, or consequential damages arising from your use of the
          service. Our total liability is limited to the amount you paid us in the past twelve
          months (typically $0 for the free tier).
        </p>
      </LegalSection>

      <LegalSection title="Our content">
        <p>
          Index Card Kitchen, including its name, design, and software, is © {copyrightYear()}{' '}
          {COPYRIGHT_OWNER} All rights reserved. Recipe content you import or enter remains
          yours; we do not claim ownership of your recipes.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these terms from time to time. Continued use after changes constitutes
          acceptance. Material changes will be noted on this page with an updated date.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gingham hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
