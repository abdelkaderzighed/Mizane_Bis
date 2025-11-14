import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { WorkspaceState } from './useClientWorkspace';

interface UseWorkspaceGuardsParams {
  workspaceState: WorkspaceState;
  isTemplateMode: boolean;
  workspaceSelectionWarning: string;
  clientSelectionWarning: string;
}

interface UseWorkspaceGuardsResult {
  showWorkspaceSelectionReminder: boolean;
  showClientSelectionReminder: boolean;
  ensureWorkspaceSelection: () => boolean;
  ensureClientSelectionForDocuments: () => boolean;
  triggerWorkspaceSelectionReminder: () => void;
  triggerClientSelectionReminder: () => void;
  clearWorkspaceSelectionReminder: () => void;
  clearClientSelectionReminder: () => void;
}

const REMINDER_DURATION_MS = 8000;

export function useWorkspaceGuards({
  workspaceState,
  isTemplateMode,
  workspaceSelectionWarning,
  clientSelectionWarning,
}: UseWorkspaceGuardsParams): UseWorkspaceGuardsResult {
  const [showWorkspaceSelectionReminder, setShowWorkspaceSelectionReminder] = useState(false);
  const [showClientSelectionReminder, setShowClientSelectionReminder] = useState(false);

  const workspaceReminderTimeoutRef = useRef<number | null>(null);
  const clientReminderTimeoutRef = useRef<number | null>(null);

  const clearWorkspaceSelectionReminder = useCallback(() => {
    setShowWorkspaceSelectionReminder(false);
    if (workspaceReminderTimeoutRef.current !== null) {
      window.clearTimeout(workspaceReminderTimeoutRef.current);
      workspaceReminderTimeoutRef.current = null;
    }
  }, []);

  const clearClientSelectionReminder = useCallback(() => {
    setShowClientSelectionReminder(false);
    if (clientReminderTimeoutRef.current !== null) {
      window.clearTimeout(clientReminderTimeoutRef.current);
      clientReminderTimeoutRef.current = null;
    }
  }, []);

  const triggerWorkspaceSelectionReminder = useCallback(() => {
    setShowWorkspaceSelectionReminder(true);
    if (workspaceReminderTimeoutRef.current !== null) {
      window.clearTimeout(workspaceReminderTimeoutRef.current);
    }
    workspaceReminderTimeoutRef.current = window.setTimeout(() => {
      setShowWorkspaceSelectionReminder(false);
      workspaceReminderTimeoutRef.current = null;
    }, REMINDER_DURATION_MS);
  }, []);

  const triggerClientSelectionReminder = useCallback(() => {
    setShowClientSelectionReminder(true);
    if (clientReminderTimeoutRef.current !== null) {
      window.clearTimeout(clientReminderTimeoutRef.current);
    }
    clientReminderTimeoutRef.current = window.setTimeout(() => {
      setShowClientSelectionReminder(false);
      clientReminderTimeoutRef.current = null;
    }, REMINDER_DURATION_MS);
  }, []);

  const ensureWorkspaceSelection = useCallback(() => {
    if (workspaceState.root) {
      clearWorkspaceSelectionReminder();
      return true;
    }
    toast.warning(workspaceSelectionWarning);
    triggerWorkspaceSelectionReminder();
    return false;
  }, [
    workspaceState.root,
    workspaceSelectionWarning,
    triggerWorkspaceSelectionReminder,
    clearWorkspaceSelectionReminder,
  ]);

  const ensureClientSelectionForDocuments = useCallback(() => {
    if (isTemplateMode) {
      clearClientSelectionReminder();
      return true;
    }

    if (!ensureWorkspaceSelection()) {
      clearClientSelectionReminder();
      return false;
    }

    if (!workspaceState.selectedClient) {
      toast.warning(clientSelectionWarning);
      triggerClientSelectionReminder();
      return false;
    }

    clearClientSelectionReminder();
    return true;
  }, [
    isTemplateMode,
    workspaceState.selectedClient,
    clientSelectionWarning,
    ensureWorkspaceSelection,
    triggerClientSelectionReminder,
    clearClientSelectionReminder,
  ]);

  useEffect(() => {
    if (workspaceState.root) {
      clearWorkspaceSelectionReminder();
    }
  }, [workspaceState.root, clearWorkspaceSelectionReminder]);

  useEffect(() => {
    if (workspaceState.selectedClient || isTemplateMode) {
      clearClientSelectionReminder();
    }
  }, [workspaceState.selectedClient, isTemplateMode, clearClientSelectionReminder]);

  useEffect(() => () => {
    if (workspaceReminderTimeoutRef.current !== null) {
      window.clearTimeout(workspaceReminderTimeoutRef.current);
    }
    if (clientReminderTimeoutRef.current !== null) {
      window.clearTimeout(clientReminderTimeoutRef.current);
    }
  }, []);

  return {
    showWorkspaceSelectionReminder,
    showClientSelectionReminder,
    ensureWorkspaceSelection,
    ensureClientSelectionForDocuments,
    triggerWorkspaceSelectionReminder,
    triggerClientSelectionReminder,
    clearWorkspaceSelectionReminder,
    clearClientSelectionReminder,
  };
}
