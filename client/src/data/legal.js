/** Shared legal copy — year rolls automatically. */
export const COPYRIGHT_OWNER = 'AppSquire Consulting Ltd.'

export function copyrightYear() {
  return new Date().getFullYear()
}

export function copyrightNotice() {
  return `© ${copyrightYear()} ${COPYRIGHT_OWNER}. All rights reserved.`
}
