import { getSupabaseClient } from './settings/supabaseClient';

export interface FreeTrialConfig {
  durationDays: number;
  tokens: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: FreeTrialConfig = {
  durationDays: 7,
  tokens: 100000,
  enabled: true
};

const SETTINGS_KEYS = {
  duration: 'trial_duration_days',
  tokens: 'trial_tokens',
  tokensLegacy: 'trial_tokens_amount',
  enabled: 'trial_enabled'
};

export async function fetchFreeTrialConfig(): Promise<FreeTrialConfig> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase client not initialised, using default free trial config');
    return DEFAULT_CONFIG;
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('key,value')
    .in('key', Object.values(SETTINGS_KEYS));

  if (error || !data) {
    console.warn('Unable to load free trial config from Supabase, using defaults', error);
    return DEFAULT_CONFIG;
  }

  const map = new Map<string, string>(data.map(row => [row.key, row.value]));

  const duration = parseInt(map.get(SETTINGS_KEYS.duration) ?? '', 10);
  const tokens = parseInt(map.get(SETTINGS_KEYS.tokens) ?? map.get(SETTINGS_KEYS.tokensLegacy) ?? '', 10);
  const enabledRaw = map.get(SETTINGS_KEYS.enabled);

  return {
    durationDays: Number.isNaN(duration) ? DEFAULT_CONFIG.durationDays : duration,
    tokens: Number.isNaN(tokens) ? DEFAULT_CONFIG.tokens : tokens,
    enabled: enabledRaw !== undefined ? enabledRaw === 'true' : DEFAULT_CONFIG.enabled
  };
}

export function formatFreeTrial(config: FreeTrialConfig) {
  const daysLabel = `${config.durationDays} jour${config.durationDays > 1 ? 's' : ''}`;
  const tokensLabel = `${config.tokens.toLocaleString()} jetons`;
  return `${daysLabel} Premium + ${tokensLabel}`;
}
