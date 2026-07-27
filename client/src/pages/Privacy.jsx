import LegalLayout, { LegalSection } from '../components/LegalLayout'

const CONTACT = 'hello@indexcardkitchen.com'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 27, 2026">
      <LegalSection title="Overview">
        <p>
          Index Card Kitchen lets you save recipes locally in your browser and, if you choose,
          sync them to a cloud account. This policy describes what we collect and why.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account info</strong> (if you register): name, email, and a hashed password.
          </li>
          <li>
            <strong>Recipe data</strong>: titles, ingredients, instructions, notes, source URLs,
            and related fields you enter or import.
          </li>
          <li>
            <strong>Categories</strong> you create or use to organize recipes.
          </li>
          <li>
            <strong>Technical logs</strong>: standard server logs (IP address, request time, errors)
            for security and debugging.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Local-only use (no account)">
        <p>
          If you use the app without signing in, recipes are stored in{' '}
          <strong>IndexedDB</strong> in your browser. That data stays on your device and is not
          sent to our servers unless you create an account and sync.
        </p>
      </LegalSection>

      <LegalSection title="How we use your data">
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide the recipe box, sync, and print/PDF features</li>
          <li>Authenticate your account</li>
          <li>Respond to support or legal requests</li>
          <li>Keep the service secure and reliable</li>
        </ul>
        <p>We do not sell your personal information or recipe data.</p>
      </LegalSection>

      <LegalSection title="Where data is stored">
        <p>
          Cloud account data is stored in our application database (PostgreSQL) on infrastructure
          we operate or rent. Local data remains in your browser until you clear site data or
          delete recipes.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          We keep account and recipe data while your account is active. You can delete individual
          recipes in the app. To delete your account and associated cloud data, contact us at{' '}
          <a href={`mailto:${CONTACT}`} className="text-gingham hover:underline">
            {CONTACT}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          We use a JWT stored in <code className="text-sm bg-wicker-100 px-1 rounded">localStorage</code>{' '}
          when you sign in so you stay logged in. Recipe data uses IndexedDB for offline access.
          We do not use third-party advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Index Card Kitchen is not directed at children under 13. We do not knowingly collect
          information from children.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy. The “Last updated” date at the top will change when we do.
          Continued use after updates means you accept the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions:{' '}
          <a href={`mailto:${CONTACT}`} className="text-gingham hover:underline">
            {CONTACT}
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
