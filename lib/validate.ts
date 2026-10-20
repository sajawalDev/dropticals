/**
 * Checks a form's required, email, phone and date fields. Focuses the
 * first problem and returns the ids of the fields that need fixing.
 */
export function validateForm(form: HTMLFormElement): Set<string> {
  const invalid = new Set<string>();
  let first: HTMLElement | null = null;
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required], input[type="email"]').forEach(inp => {
    const value = inp.value.trim();
    let bad = inp.required && !value;
    if (!bad && inp.type === 'email' && value) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!bad && inp.type === 'tel') bad = inp.value.replace(/\D/g, '').length < 7;
    if (!bad && inp.type === 'date' && 'min' in inp && inp.min) bad = inp.value < inp.min;
    if (bad) { invalid.add(inp.id); first ??= inp; }
  });
  (first as HTMLElement | null)?.focus();
  return invalid;
}
