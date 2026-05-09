/**
 * Escapes HTML special characters to prevent XSS in document.write contexts.
 */
export const escHtml = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
