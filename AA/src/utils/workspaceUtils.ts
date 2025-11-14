const REQUIRED_DIRECTORIES = ['templates'] as const;

type RequiredDirectory = typeof REQUIRED_DIRECTORIES[number];

interface EnsureResult {
  missing: RequiredDirectory[];
  created: RequiredDirectory[];
}

interface EnsureOptions {
  promptCreate?: boolean;
}

export async function ensureWorkspaceDirectories(
  root: FileSystemDirectoryHandle,
  options: EnsureOptions = { promptCreate: false },
): Promise<EnsureResult> {
  const missing: RequiredDirectory[] = [];
  const created: RequiredDirectory[] = [];

  for (const directoryName of REQUIRED_DIRECTORIES) {
    try {
      await root.getDirectoryHandle(directoryName);
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        const shouldPrompt = options.promptCreate ?? false;
        if (shouldPrompt) {
          const confirmed = window.confirm(
            `Le dossier "${directoryName}" est absent de ${root.name}.\nSouhaitez-vous le créer maintenant ?`,
          );
          if (!confirmed) {
            missing.push(directoryName);
            continue;
          }
        }

        try {
          await root.getDirectoryHandle(directoryName, { create: true });
          created.push(directoryName);
        } catch (creationError) {
          console.error('[ensureWorkspaceDirectories] Création dossier échouée', creationError);
          missing.push(directoryName);
        }
      } else {
        throw error;
      }
    }
  }

  return { missing, created };
}
