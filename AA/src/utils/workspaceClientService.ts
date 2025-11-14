import { supabase } from './supabase';

export interface WorkspaceClientProfile {
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceClientInput {
  slug: string;
  displayName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

const TABLE_NAME = 'clients';

export async function fetchWorkspaceClientProfiles(): Promise<Record<string, WorkspaceClientProfile>> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, folder_path, name, email, phone, address, notes, description, created_at, updated_at');

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      return {};
    }
    console.error('[workspaceClientService] fetchWorkspaceClientProfiles failed', error);
    throw error;
  }

  const entries = data ?? [];
  return entries.reduce<Record<string, WorkspaceClientProfile>>((acc, profile: any) => {
    const slug = typeof profile.folder_path === 'string' && profile.folder_path.trim()
      ? profile.folder_path.trim()
      : typeof profile.name === 'string' && profile.name.trim()
        ? profile.name.trim().toLowerCase().replace(/\s+/g, '-')
        : typeof profile.id === 'string'
          ? profile.id
          : undefined;
    if (!slug) {
      console.warn('[clientService] Ignored client row without usable slug', profile);
      return acc;
    }
    const displayName = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : slug;
    const nameParts = displayName.split(' ').filter(Boolean);
    const firstName = nameParts.length > 0 ? nameParts[0] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    acc[slug] = {
      slug,
      displayName,
      firstName,
      lastName,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      description: profile.description ?? profile.notes ?? '',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
    return acc;
  }, {});
}

export async function upsertWorkspaceClientProfile(payload: WorkspaceClientInput): Promise<WorkspaceClientProfile> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('[workspaceClientService] getUser failed', authError);
    throw authError;
  }

  if (!user) {
    throw new Error('Utilisateur non authentifié. Impossible d\'enregistrer le client.');
  }

  try {
    await supabase.rpc('ensure_user_profile', {
      _user_id: user.id,
      _email: user.email ?? (user.user_metadata as any)?.email ?? null,
      _name:
        (user.user_metadata as any)?.full_name
        || (user.user_metadata as any)?.name
        || user.email
        || 'Utilisateur Misan',
      _role: null,
      _subscription_type: null,
      _subscription_status: null,
      _subscription_start: null,
      _subscription_end: null,
      _tokens_balance: null,
    });
  } catch (err) {
    console.warn('[workspaceClientService] ensure_user_profile failed', err);
  }

  const recordPayload = {
    folder_path: payload.slug,
    name: payload.slug,
    email: payload.email || null,
    phone: payload.phone || null,
    address: payload.address || null,
    notes: payload.description || null,
    description: payload.description || null,
    status: 'active',
    user_id: user.id,
  };

  const { data: existing, error: selectError } = await supabase
    .from(TABLE_NAME)
    .select('id, created_at, updated_at, name, email, phone, address, notes, description, folder_path')
    .eq('folder_path', payload.slug)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('[workspaceClientService] lookup failed', selectError);
    throw selectError;
  }

  let result: any;
  if (existing) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(recordPayload)
      .eq('id', existing.id)
      .select('id, created_at, updated_at, name, email, phone, address, notes, description, folder_path')
      .single();
    if (error) {
      console.error('[workspaceClientService] update client failed', error);
      throw error;
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(recordPayload)
      .select('id, created_at, updated_at, name, email, phone, address, notes, description, folder_path')
      .single();
    if (error) {
      console.error('[workspaceClientService] insert client failed', error);
      throw error;
    }
    result = data;
  }

  const displayName = payload.displayName?.trim()
    || [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim()
    || result.name
    || payload.slug;
  const nameParts = displayName.split(' ').filter(Boolean);
  const firstName = nameParts.length > 0 ? nameParts[0] : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  return {
    slug: result.folder_path ?? payload.slug,
    displayName,
    firstName,
    lastName,
    email: result.email ?? '',
    phone: result.phone ?? '',
    address: result.address ?? '',
    description: result.description ?? result.notes ?? '',
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}
