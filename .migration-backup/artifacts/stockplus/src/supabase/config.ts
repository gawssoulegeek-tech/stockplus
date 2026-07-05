export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

export function validateSupabaseConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!supabaseConfig.url) {
    errors.push('VITE_SUPABASE_URL est manquante');
  } else if (!supabaseConfig.url.startsWith('https://') || supabaseConfig.url.includes('/rest/v1')) {
    errors.push('VITE_SUPABASE_URL doit être l\'URL du projet (ex: https://xxx.supabase.co), sans /rest/v1/');
  }

  if (!supabaseConfig.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY est manquante');
  } else if (!supabaseConfig.anonKey.startsWith('eyJ')) {
    errors.push('VITE_SUPABASE_ANON_KEY semble invalide (doit commencer par eyJ)');
  }

  if (typeof window !== 'undefined' && errors.length > 0) {
    console.warn(
      '%c⚠ STOCKPLUS — Erreurs de configuration Supabase:\n' +
        errors.map((e) => `  • ${e}`).join('\n'),
      'color: red; font-weight: bold; font-size: 14px;'
    );
  }

  return { valid: errors.length === 0, errors };
}
