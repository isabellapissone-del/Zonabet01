/**
 * Safely copies text to clipboard with fallback for iframes and permission constraints.
 * Prevents "NotAllowedError: The user didn't interact with the document first" unhandled rejections.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or iframe restriction; fallback to execCommand
    }
  }

  // 2. Fallback: document.execCommand('copy') with invisible textarea
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.contain = 'strict';
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.fontSize = '12pt';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.selectionStart = 0;
      textarea.selectionEnd = text.length;
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  return false;
}
