import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

interface EdgeCredentials {
  projectId: string;
  publicAnonKey: string;
}

let cachedCredentials: EdgeCredentials | null = null;

function extractProjectId(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const [projectId] = parsed.hostname.split('.');
    return projectId || null;
  } catch {
    return null;
  }
}

export async function getSupabaseEdgeCredentials(): Promise<EdgeCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const envProjectId = extractProjectId(SUPABASE_URL);
  if (envProjectId && SUPABASE_ANON_KEY) {
    cachedCredentials = {
      projectId: envProjectId,
      publicAnonKey: SUPABASE_ANON_KEY,
    };
    return cachedCredentials;
  }

  const info = await import('./info');
  cachedCredentials = {
    projectId: info.projectId,
    publicAnonKey: info.publicAnonKey,
  };
  return cachedCredentials;
}

export async function buildEdgeFunctionUrl(path: string): Promise<string> {
  // Détection automatique local vs cloud
  if (SUPABASE_URL?.includes('127.0.0.1') || SUPABASE_URL?.includes('localhost')) {
    // Mode local : utiliser l'URL Supabase locale directement
    return `${SUPABASE_URL}${path}`;
  }
  
  // Mode cloud : utiliser le format classique
  const { projectId } = await getSupabaseEdgeCredentials();
  return `https://${projectId}.supabase.co${path}`;
}
