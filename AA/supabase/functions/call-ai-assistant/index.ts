import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestPayload {
  assistantId?: string;
  message?: string;
  history?: HistoryMessage[];
  threadId?: string | null;
  language?: string | null;
}

interface AssistantPrompt {
  type?: "local" | "openai_prompt" | "openai_assistant";
  localPromptId?: string | null;
  openAiPromptId?: string | null;
  openAiAssistantId?: string | null;
  versionTag?: string | null;
}

interface AssistantFunctionConfig {
  id?: string;
  name?: string;
  description?: string;
  provider?: string;
  modelConfigId?: string;
  apiKeyName?: string;
  prompt?: AssistantPrompt | null;
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  responseFormat?: "text" | "json" | "auto" | null;
  isEnabled?: boolean | null;
  invitationMessage?: string | null;
}

interface AssistantInvocationResult {
  success: boolean;
  message?: string;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  model?: string;
  threadId?: string;
  error?: string;
  code?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration for call-ai-assistant function.");
}

const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";

const modelAliasMap: Record<string, string> = {
  gpt4: "gpt-4o",
  "gpt-4": "gpt-4",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt4o": "gpt-4o",
  "gpt4o-mini": "gpt-4o-mini"
};

const languageInstructionMap: Record<string, string> = {
  fr: "Réponds uniquement en français clair et naturel, en respectant le ton professionnel de l'application.",
  en: "Answer strictly in natural, professional English.",
  ar: "أجب حصراً باللغة العربية الفصحى وبأسلوب مهني واضح." 
};

const mapModelIdToOpenAiModel = (modelId?: string | null): string | null => {
  if (!modelId) return null;
  const normalized = modelId.toLowerCase();
  if (modelAliasMap[normalized]) {
    return modelAliasMap[normalized];
  }
  return null;
};

const loadAssistantConfig = async (assistantId: string): Promise<AssistantFunctionConfig | null> => {
  const { data, error } = await supabaseClient
    .from("system_settings")
    .select("value")
    .eq("key", "llm_settings")
    .maybeSingle();

  if (error) {
    console.error("Unable to read llm_settings", error.message);
    return null;
  }

  const rawValue = (data as { value: string | null } | null)?.value ?? null;
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      assistantFunctions?: Record<string, AssistantFunctionConfig>;
    };

    const assistants = parsed?.assistantFunctions ?? {};
    const config = assistants[assistantId];

    if (!config || config.isEnabled === false) {
      return null;
    }

    return config;
  } catch (parseError) {
    console.error("Unable to parse llm_settings when searching assistant", parseError);
    return null;
  }
};

const buildInitialThreadMessages = (userMessage: string) => ([
  {
    role: "user",
    content: [
      {
        type: "text",
        text: userMessage,
      }
    ]
  }
]);

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = (await request.json()) as RequestPayload;
    const assistantId = body.assistantId?.trim();
    const message = body.message?.trim();

    if (!assistantId || !message) {
      return new Response(JSON.stringify({ success: false, error: "assistantId et message requis", code: "BAD_REQUEST" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const requestedLanguage = typeof body.language === "string"
      ? body.language.trim().toLowerCase()
      : null;

    const assistantConfig = await loadAssistantConfig(assistantId);
    if (!assistantConfig) {
      return new Response(JSON.stringify({ success: false, error: "Assistant introuvable ou désactivé", code: "ASSISTANT_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const provider = (assistantConfig.provider ?? "openai").toLowerCase();
    if (provider !== "openai") {
      return new Response(JSON.stringify({ success: false, error: "Fournisseur non supporté", code: "PROVIDER_UNSUPPORTED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const promptConfig = assistantConfig.prompt ?? { type: "local" };

    if (promptConfig.type !== "openai_assistant" || !promptConfig.openAiAssistantId) {
      return new Response(JSON.stringify({ success: false, error: "Cette fonction IA doit référencer un assistant OpenAI.", code: "ASSISTANT_ID_REQUIRED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKeyName = assistantConfig.apiKeyName?.trim() || "OPENAI_API_KEY";
    const apiKey = Deno.env.get(apiKeyName) ?? Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!apiKey) {
      console.error(`API key ${apiKeyName} introuvable dans l'environnement.`);
      return new Response(JSON.stringify({ success: false, error: "Clé API OpenAI manquante", code: "OPENAI_KEY_MISSING" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const resolvedModel = mapModelIdToOpenAiModel(assistantConfig.modelConfigId);
    const instructionsOverride = typeof assistantConfig.metadata?.instructionsOverride === "string"
      ? assistantConfig.metadata.instructionsOverride
      : null;

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2"
    };

    let threadId = typeof body.threadId === "string" && body.threadId.trim().length > 0
      ? body.threadId.trim()
      : null;

    if (!threadId) {
      const createThreadResponse = await fetch(`${OPENAI_BASE_URL}/threads`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: buildInitialThreadMessages(message)
        })
      });

      if (!createThreadResponse.ok) {
        const errorBody = await createThreadResponse.json().catch(() => null);
        console.error("Unable to create thread", errorBody);
        return new Response(JSON.stringify({ success: false, error: "Impossible de créer une nouvelle conversation.", code: "THREAD_CREATION_FAILED" }), {
          status: createThreadResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const threadData = await createThreadResponse.json();
      threadId = typeof threadData?.id === "string" ? threadData.id : null;

      if (!threadId) {
        return new Response(JSON.stringify({ success: false, error: "Réponse inattendue lors de la création de la conversation.", code: "THREAD_INVALID" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      const messageResponse = await fetch(`${OPENAI_BASE_URL}/threads/${threadId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          role: "user",
          content: [
            {
              type: "text",
              text: message
            }
          ]
        })
      });

      if (!messageResponse.ok) {
        const errorBody = await messageResponse.json().catch(() => null);
        console.error("Unable to append message", errorBody);
        return new Response(JSON.stringify({ success: false, error: "Impossible d'ajouter le message à la conversation.", code: "THREAD_MESSAGE_FAILED" }), {
          status: messageResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const languageInstruction = requestedLanguage && languageInstructionMap[requestedLanguage]
      ? languageInstructionMap[requestedLanguage]
      : null;

    const runPayload: Record<string, unknown> = {
      assistant_id: promptConfig.openAiAssistantId
    };

    const combinedInstructions = (() => {
      let buffer = instructionsOverride?.trim() ?? "";
      if (languageInstruction) {
        buffer = buffer.length > 0 ? `${buffer}\n\n${languageInstruction}` : languageInstruction;
      }
      return buffer.length > 0 ? buffer : null;
    })();

    if (combinedInstructions) {
      runPayload.instructions = combinedInstructions;
    }

    if (resolvedModel) {
      runPayload.model = resolvedModel;
    }

    if (typeof assistantConfig.temperature === "number") {
      runPayload.temperature = assistantConfig.temperature;
    }
    if (typeof assistantConfig.topP === "number") {
      runPayload.top_p = assistantConfig.topP;
    }
    const runResponse = await fetch(`${OPENAI_BASE_URL}/threads/${threadId}/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify(runPayload)
    });

    if (!runResponse.ok) {
      const errorBody = await runResponse.json().catch(() => null);
      console.error("Unable to create run", errorBody);
      return new Response(JSON.stringify({ success: false, error: "Impossible de démarrer le traitement IA.", code: "RUN_CREATION_FAILED" }), {
        status: runResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let runData = await runResponse.json();

    const maxAttempts = 40;
    let attempts = 0;
    while (runData?.status === "queued" || runData?.status === "in_progress") {
      if (attempts >= maxAttempts) {
        return new Response(JSON.stringify({ success: false, error: "Le traitement IA est plus long que prévu. Veuillez réessayer.", code: "RUN_TIMEOUT" }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      const statusResponse = await fetch(`${OPENAI_BASE_URL}/threads/${threadId}/runs/${runData.id}`, {
        method: "GET",
        headers,
      });

      if (!statusResponse.ok) {
        const errorBody = await statusResponse.json().catch(() => null);
        console.error("Unable to fetch run status", errorBody);
        return new Response(JSON.stringify({ success: false, error: "Impossible de récupérer l'état du traitement IA.", code: "RUN_STATUS_FAILED" }), {
          status: statusResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      runData = await statusResponse.json();
      attempts += 1;
    }

    if (runData?.status === "requires_action") {
      return new Response(JSON.stringify({ success: false, error: "L'assistant nécessite une action supplémentaire non supportée.", code: "RUN_REQUIRES_ACTION" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (runData?.status !== "completed") {
      const failureMessage = runData?.last_error?.message || "Le traitement a échoué.";
      return new Response(JSON.stringify({ success: false, error: failureMessage, code: runData?.status ?? "RUN_FAILED" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const messagesResponse = await fetch(`${OPENAI_BASE_URL}/threads/${threadId}/messages?limit=20`, {
      method: "GET",
      headers,
    });

    if (!messagesResponse.ok) {
      const errorBody = await messagesResponse.json().catch(() => null);
      console.error("Unable to fetch messages", errorBody);
      return new Response(JSON.stringify({ success: false, error: "Impossible de récupérer la réponse de l'assistant.", code: "MESSAGES_FETCH_FAILED" }), {
        status: messagesResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const messagesData = await messagesResponse.json();
    const messagesList = Array.isArray(messagesData?.data) ? messagesData.data : [];

    const latestAssistantMessage = messagesList.find((item: any) => item?.role === "assistant" && item?.run_id === runData.id)
      ?? messagesList.find((item: any) => item?.role === "assistant");

    const extractTextBlocks = (blocks: any[] | undefined) => (blocks ?? [])
      .filter((block) => block && (block.type === "output_text" || block.type === "text"))
      .map((block) => {
        if (block.type === "output_text") {
          return block?.text?.value ?? "";
        }
        if (typeof block.text === "string") {
          return block.text;
        }
        if (block?.text && typeof block.text?.value === "string") {
          return block.text.value;
        }
        if (typeof block?.value === "string") {
          return block.value;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    const outputText = extractTextBlocks(latestAssistantMessage?.content) || "(Aucune réponse retournée par l'assistant).";

    const usage = runData?.usage ?? {};

    const result: AssistantInvocationResult = {
      success: true,
      message: outputText,
      usage: {
        totalTokens: usage.total_tokens ?? usage.totalTokens ?? null,
        promptTokens: usage.prompt_tokens ?? usage.promptTokens ?? null,
        completionTokens: usage.completion_tokens ?? usage.completionTokens ?? null
      },
      model: runData?.model ?? resolvedModel ?? undefined,
      threadId,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error in call-ai-assistant", error);
    return new Response(JSON.stringify({ success: false, error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
