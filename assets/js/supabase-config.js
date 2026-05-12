/**
 * Convivium Supabase configuration.
 *
 * GitHub Pages cannot run a private backend. Supabase anon keys are designed
 * to be public; database safety comes from Row Level Security policies.
 *
 * Fill these after creating the Supabase project:
 *   url:     Project Settings > API > Project URL
 *   anonKey: Project Settings > API > anon public key
 */
window.CONVIVIUM_SUPABASE = {
  url: 'https://airmhxfgtslsgrdhvfin.supabase.co',
  anonKey: 'sb_publishable_S7saLZ-v0bXJTwd7kdE5Aw_IJyU3y4Q',
  redirectTo: `${window.location.origin}/auth.html`
};
