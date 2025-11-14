export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  llmUsed?: string[];
  source?: {
    type: 'file' | 'url' | 'file_url' | 'voice';
    name: string;
    path?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DocumentState {
  content: string;
  filename: string;
  fullPath: string;
  language: 'fr' | 'en' | 'ar';
  isModified: boolean;
  originalFilename?: string;
  originalFullPath?: string;
}

export type AIAgentType = string;

export interface AIAgent {
  id: AIAgentType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export type LLMType = string;

export interface LLMModel {
  id: LLMType;
  name: string;
  provider: string;
  description: string;
  color: string;
  isPremium?: boolean;
}

export type PromptSourceType = 'local' | 'openai_prompt' | 'openai_assistant';

export interface AssistantPromptConfig {
  type: PromptSourceType;
  localPromptId?: string;
  openAiPromptId?: string;
  openAiAssistantId?: string;
  versionTag?: string;
}

export interface AssistantFunctionConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  modelConfigId: LLMType;
  apiKeyName?: string;
  prompt: AssistantPromptConfig;
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  responseFormat?: 'text' | 'json' | 'auto';
  isEnabled: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  invitationMessage?: string | null;
}

export interface PublicAssistantFunctionConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  modelConfigId: LLMType;
  prompt: AssistantPromptConfig;
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  responseFormat?: 'text' | 'json' | 'auto';
  tags?: string[];
  metadata?: Record<string, unknown>;
  invitationMessage?: string | null;
  hasOpenAiReference?: boolean;
}

export interface PublicLLMSettings {
  models: Record<LLMType, LLMModel>;
  defaultModels: LLMType[];
  maxSimultaneousModels: number;
  allowModelSelection: boolean;
  defaultModelId: LLMType | null;
  assistantFunctions?: Record<string, PublicAssistantFunctionConfig>;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  subscriptionType: 'free' | 'premium' | 'admin' | 'pro' | 'trial';
  subscriptionStatus: 'active' | 'inactive' | 'expired' | 'pending';
  tokens: number;
  trialUsed?: boolean;
  role?: 'user' | 'admin' | 'collaborateur';
  secondaryEmail?: string | null;
  phone?: string | null;
  address?: Address | null;
  billingAddress?: Address | null;
}

export type InvoiceStatus = 'paid' | 'pending' | 'bank_pending' | 'cancelled' | 'free';

export interface InvoiceLine {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface Invoice {
  id: string;
  orderNumber: string;
  createdAt: string;
  dueDate?: string | null;
  amount: number;
  currency: 'EUR' | 'DZD';
  status: InvoiceStatus;
  type: 'subscription' | 'tokens' | 'custom';
  description: string;
  paymentMethod: string;
  paymentDate?: string | null;
  paymentReference?: string | null;
  lines: InvoiceLine[];
  notes?: string;
  billingAddress?: Address | null;
}

export interface CartItem {
  id: string;
  type: 'subscription' | 'tokens';
  name: string;
  description: string;
  quantity: number;
  unitPriceHT: number; // Prix unitaire Hors Taxe en DA
  totalHT: number; // Total HT pour cet item en DA
  discount?: number; // Pourcentage de remise appliquée
  tokensIncluded?: number; // Jetons inclus (pour abonnements)
  planType?: 'pro' | 'premium' | 'trial';
}

export interface OrderSummary {
  subtotalHT: number; // Sous-total HT en DA
  totalDiscount: number; // Total des remises en DA
  discountedSubtotal: number; // Sous-total après remises HT en DA
  vat: number; // TVA en DA (20%)
  totalTVA: number; // Alias TVA
  totalTTC: number; // Total TTC en DA
  totalTokens?: number; // Jetons inclus
}

export type PaymentMethod = 'card_cib' | 'paypal' | 'bank_transfer' | 'mobile_payment' | 'card_international';


export interface BankAccountInfo {
  id: string;
  label: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  notes?: string;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  label: string;
  description?: string;
  instructions?: string;
  bankAccounts?: BankAccountInfo[];
}

export interface PaymentSettings {
  methods: Record<PaymentMethod, PaymentMethodConfig>;
  exchangeRates?: {
    eur: number;
    usd: number;
  };
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  transactionId?: string;
  paymentDate?: string | null;
  operatorName?: string; // Pour les paiements mobiles
  reference?: string;
  message?: string;
  invoiceId?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  summary: OrderSummary;
  payment: PaymentInfo;
  billingInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Language {
  name: string;
  dir: 'ltr' | 'rtl';
}

export type LanguageCode = 'fr' | 'en' | 'ar';

// Nouveaux types pour l'administration
export interface AdminUser extends UserInfo {
  createdAt: string;
  lastLogin: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'expired' | 'suspended' | 'pending';
}

export interface AdminOrder extends Order {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  brevoApiKey: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  freeTrialDays: number;
  freeTrialTokens: number;
}

export interface PricingSettings {
  subscription: {
    monthlyPrice: number;
    monthlyTokens: number;
    currency: string;
  };
  tokens: {
    pricePerMillion: number;
    currency: string;
  };
  discounts: {
    threshold: number;
    percentage: number;
  }[];
  vat: {
    enabled: boolean;
    rate: number;
  };
}

export interface SubscriptionSettings {
  free: {
    durationDays: number;
    tokensIncluded: number;
    features: string[];
  };
  premium: {
    monthlyPrice: number;
    tokensIncluded: number;
    features: string[];
  };
}

export type AlertTriggerType = 'login' | 'assistant_access' | 'scheduled';
export type AlertTargetType = 'subscription' | 'tokens' | 'general';
export type AlertComparator = '<' | '<=' | '=' | '>=' | '>';
export type AlertSeverity = 'info' | 'warning' | 'error';
export type AlertAppliesRole = 'pro' | 'premium' | 'any';

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: AlertTriggerType;
  target: AlertTargetType;
  comparator: AlertComparator;
  threshold: number;
  severity: AlertSeverity;
  messageTemplate: string;
  appliesToRole: AlertAppliesRole;
  isBlocking: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRuleInput {
  name: string;
  description?: string | null;
  triggerType: AlertTriggerType;
  target: AlertTargetType;
  comparator: AlertComparator;
  threshold: number;
  severity: AlertSeverity;
  messageTemplate: string;
  appliesToRole: AlertAppliesRole;
  isBlocking?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export type EmailTemplateRecipient = 'user' | 'admin' | 'both';

export interface EmailTemplateMetadata {
  allowAttachments?: boolean;
  plainBody?: string;
  headline?: string;
  intro?: string;
  summary?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerLinks?: string;
  [key: string]: unknown;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  recipients: EmailTemplateRecipient;
  cc: string[];
  bcc: string[];
  body: string;
  signature: string;
  isActive: boolean;
  metadata: EmailTemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  recipients: EmailTemplateRecipient;
  cc: string[];
  bcc: string[];
  body: string;
  signature: string;
  isActive: boolean;
  metadata?: EmailTemplateMetadata;
}

// Configuration LLM pour l'administration
export interface LLMConfig {
  id: LLMType;
  name: string;
  provider: string;
  description: string;
  color: string;
  isPremium: boolean;
  isEnabled: boolean;
  requiresApiKey: boolean;
  apiKeyName?: string;
  apiKeyDescription?: string;
  baseUrl?: string;
  maxTokensPerRequest: number;
  costPerToken: number;
  rateLimitPerMinute: number;
  temperature: number;
  timeout: number;
  systemPromptId?: string;
  systemPromptText?: string;
  assistantId?: string;
  notes?: string;
  tags?: string[];
  supportedFeatures: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
    embeddings: boolean;
  };
  modelVariants?: {
    id: string;
    name: string;
    maxTokens: number;
    costMultiplier: number;
  }[];
}

export interface LLMSettings {
  models: Record<LLMType, LLMConfig>;
  defaultModels: LLMType[];
  maxSimultaneousModels: number;
  apiKeys: Record<string, {
    value: string;
    isConfigured: boolean;
    lastTested: string | null;
    status: 'valid' | 'invalid' | 'untested';
  }>;
  globalSettings: {
    allowUserOverrides: boolean;
    defaultTimeout: number;
    maxRetries: number;
    enableCaching: boolean;
    allowModelSelection: boolean;
    defaultModelId?: LLMType | null;
  };
  assistantFunctions: Record<string, AssistantFunctionConfig>;
}
