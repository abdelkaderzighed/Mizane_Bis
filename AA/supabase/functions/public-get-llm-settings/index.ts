import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type RawLLMSettings = {
  models?: Record<string, any> | null;
  defaultModels?: string[] | null;
  maxSimultaneousModels?: number | null;
  globalSettings?: {
    allowUserOverrides?: boolean;
    defaultTimeout?: number;
    maxRetries?: number;
    enableCaching?: boolean;
    allowModelSelection?: boolean;
    defaultModelId?: string | null;
  } | null;
};

type PublicLLMModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  color: string;
  isPremium: boolean;
};

type RawAssistantPrompt = {
  type?: 'local' | 'openai_prompt' | 'openai_assistant';
  localPromptId?: string | null;
  openAiPromptId?: string | null;
  openAiAssistantId?: string | null;
  versionTag?: string | null;
};

type RawAssistantFunction = {
  id?: string;
  name?: string;
  description?: string;
  provider?: string;
  modelConfigId?: string;
  apiKeyName?: string;
  prompt?: RawAssistantPrompt | null;
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  responseFormat?: 'text' | 'json' | 'auto' | null;
  isEnabled?: boolean | null;
  tags?: string[] | null;
  invitationMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PublicAssistantPromptConfig = {
  type: 'local' | 'openai_prompt' | 'openai_assistant';
  localPromptId?: string;
  openAiPromptId?: string;
  openAiAssistantId?: string;
  versionTag?: string;
};

type PublicAssistantFunctionConfig = {
  id: string;
  name: string;
  description: string;
  provider: string;
  modelConfigId: string;
  prompt: PublicAssistantPromptConfig;
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  responseFormat?: 'text' | 'json' | 'auto';
  tags?: string[];
  hasOpenAiReference?: boolean;
  invitationMessage?: string;
  metadata?: Record<string, unknown>;
};

type PublicLLMSettings = {
  models: Record<string, PublicLLMModel>;
  defaultModels: string[];
  maxSimultaneousModels: number;
  globalSettings: {
    allowModelSelection: boolean;
    defaultModelId: string | null;
  };
  assistantFunctions: Record<string, PublicAssistantFunctionConfig>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration for public-get-llm-settings function.");
}

const DEFAULT_MODEL: PublicLLMModel = {
  id: "gpt4",
  name: "GPT-4",
  provider: "OpenAI",
  description: "Modèle conversationnel avancé d'OpenAI.",
  color: "text-green-600",
  isPremium: true
};

const DEFAULT_SETTINGS: PublicLLMSettings = {
  models: { [DEFAULT_MODEL.id]: DEFAULT_MODEL },
  defaultModels: [DEFAULT_MODEL.id],
  maxSimultaneousModels: 3,
  globalSettings: {
    allowModelSelection: true,
    defaultModelId: DEFAULT_MODEL.id
  },
  assistantFunctions: {}
};

const sanitizeModel = (id: string, raw: Record<string, any>, fallback?: PublicLLMModel): PublicLLMModel | null => {
  const isEnabled = raw?.isEnabled ?? true;
  if (!isEnabled) {
    return null;
  }

  const base = fallback ?? DEFAULT_MODEL;

  return {
    id,
    name: typeof raw?.name === "string" && raw.name.trim().length > 0 ? raw.name.trim() : base.name,
    provider: typeof raw?.provider === "string" && raw.provider.trim().length > 0 ? raw.provider.trim() : base.provider,
    description: typeof raw?.description === "string" && raw.description.trim().length > 0 ? raw.description.trim() : base.description,
    color: typeof raw?.color === "string" && raw.color.trim().length > 0 ? raw.color.trim() : base.color,
    isPremium: Boolean(raw?.isPremium)
  };
};

const sanitizeAssistantFunctions = (raw: Record<string, RawAssistantFunction> | null | undefined): Record<string, PublicAssistantFunctionConfig> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: Record<string, PublicAssistantFunctionConfig> = {};

  Object.entries(raw).forEach(([id, value]) => {
    if (!value || value.isEnabled === false) {
      return;
    }

    const sanitizedPromptType = value.prompt?.type === 'openai_prompt' || value.prompt?.type === 'openai_assistant' ? value.prompt.type : 'local';

    const prompt: PublicAssistantPromptConfig = {
      type: sanitizedPromptType,
      localPromptId: value.prompt?.localPromptId ?? undefined,
      openAiPromptId: value.prompt?.openAiPromptId ?? undefined,
      openAiAssistantId: value.prompt?.openAiAssistantId ?? undefined,
      versionTag: value.prompt?.versionTag ?? undefined,
    };

    const tags = Array.isArray(value.tags) ? value.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : undefined;
    const invitation = typeof value.invitationMessage === 'string' ? value.invitationMessage : undefined;
    const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : undefined;

    result[id] = {
      id,
      name: typeof value.name === 'string' && value.name.trim().length > 0 ? value.name.trim() : `Assistant ${id}`,
      description: typeof value.description === 'string' ? value.description : '',
      provider: typeof value.provider === 'string' && value.provider.trim().length > 0 ? value.provider.trim() : 'openai',
      modelConfigId: typeof value.modelConfigId === 'string' && value.modelConfigId.trim().length > 0 ? value.modelConfigId.trim() : DEFAULT_MODEL.id,
      prompt,
      temperature: typeof value.temperature === 'number' ? value.temperature : null,
      topP: typeof value.topP === 'number' ? value.topP : null,
      maxTokens: typeof value.maxTokens === 'number' ? value.maxTokens : null,
      responseFormat:
        value.responseFormat === 'json' || value.responseFormat === 'auto' || value.responseFormat === 'text'
          ? value.responseFormat
          : 'text',
      tags,
      hasOpenAiReference: Boolean(value.prompt?.openAiAssistantId || value.prompt?.openAiPromptId),
      invitationMessage: invitation,
      metadata,
    };
  });

  return result;
};

const mapSettings = (rawValue: string | null): PublicLLMSettings => {
  if (!rawValue) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(rawValue) as RawLLMSettings;
    const rawModels = parsed?.models ?? {};
    const sanitizedModels: Record<string, PublicLLMModel> = {};

    Object.entries(rawModels).forEach(([id, value]) => {
      const sanitized = sanitizeModel(id, value as Record<string, any>);
      if (sanitized) {
        sanitizedModels[id] = sanitized;
      }
    });

    const modelIds = Object.keys(sanitizedModels);
    const assistantFunctions = sanitizeAssistantFunctions((parsed as any)?.assistantFunctions ?? undefined);

    if (modelIds.length === 0) {
      return {
        ...DEFAULT_SETTINGS,
        assistantFunctions,
      };
    }

    const defaultIds = (parsed?.defaultModels ?? []).filter(id => modelIds.includes(id));
    const primaryId = defaultIds[0] ?? parsed?.globalSettings?.defaultModelId ?? modelIds[0];

    const allowSelection = parsed?.globalSettings?.allowModelSelection ?? true;
    const maxSimultaneous = parsed?.maxSimultaneousModels ?? DEFAULT_SETTINGS.maxSimultaneousModels;

    return {
      models: sanitizedModels,
      defaultModels: defaultIds.length > 0 ? defaultIds : [primaryId],
      maxSimultaneousModels: Number.isFinite(maxSimultaneous) && maxSimultaneous > 0 ? maxSimultaneous : DEFAULT_SETTINGS.maxSimultaneousModels,
      globalSettings: {
        allowModelSelection: Boolean(allowSelection),
        defaultModelId: primaryId ?? null
      },
      assistantFunctions
    };
  } catch (error) {
    console.error("Unable to parse llm_settings", error);
    return DEFAULT_SETTINGS;
  }
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "llm_settings")
      .maybeSingle();

    if (error) {
      console.error("Failed to read llm_settings", error.message);
      return new Response(JSON.stringify({ success: false, error: "Lecture paramètres LLM impossible" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const settings = mapSettings((data as { value: string | null } | null)?.value ?? null);

    return new Response(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error in public-get-llm-settings", error);
    return new Response(JSON.stringify({ success: false, error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
