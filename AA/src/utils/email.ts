import { supabase } from './supabase';

export interface AdminEmailAttachmentPayload {
  name: string;
  content: string;
  type?: string;
}

export interface AdminEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string | null;
  attachments?: AdminEmailAttachmentPayload[];
  templateId?: string | null;
}

export async function sendAdminEmail(payload: AdminEmailPayload): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-send-email', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email.');
  }

  return (data as { success: boolean; error?: string }) ?? { success: false, error: 'Réponse inattendue' };
}
