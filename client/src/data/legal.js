/** Shared legal copy — year rolls automatically. */
export const COPYRIGHT_OWNER = 'AppSquire Consulting Ltd.'
export const APP_NAME = 'Index Card Kitchen'
export const CONTACT_EMAIL = 'info@appsquire.com'
export const FOOTER_TAGLINE = 'Save it once. Find it when you need it.'

export function copyrightYear() {
  return new Date().getFullYear()
}

export function copyrightNotice() {
  return `© ${copyrightYear()} ${COPYRIGHT_OWNER} All rights reserved.`
}
