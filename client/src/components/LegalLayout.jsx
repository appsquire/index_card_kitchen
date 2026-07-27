import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-wicker-600 hover:text-gingham mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the box
      </Link>

      <article className="card prose-legal">
        <header className="mb-8 pb-6 border-b border-wicker-200">
          <h1 className="text-3xl sm:text-4xl font-hand text-wicker-900 mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-wicker-500">Last updated: {lastUpdated}</p>
          )}
        </header>
        {children}
      </article>

      <p className="mt-6 text-center text-sm text-wicker-600">
        <Link to="/terms" className="text-gingham hover:underline font-medium">
          Terms of Service
        </Link>
        {' · '}
        <Link to="/privacy" className="text-gingham hover:underline font-medium">
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}

export function LegalSection({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-wicker-900 mb-3">{title}</h2>
      <div className="space-y-3 text-wicker-700 leading-relaxed text-sm sm:text-base">
        {children}
      </div>
    </section>
  )
}
