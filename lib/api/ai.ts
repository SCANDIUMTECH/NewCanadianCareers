/**
 * AI Services API functions.
 * Endpoints for AI-powered SEO meta generation and social content generation.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type AIProviderType =
  | 'anthropic'
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'mistral'
  | 'deepseek'
  | 'groq'
  | 'xai'
  | 'together'

export interface AIProviderConfig {
  id: number
  name: string
  provider: AIProviderType
  provider_display: string
  base_url: string
  model: string
  is_active: boolean
  api_key_set: boolean
  max_requests_per_minute: number
  max_requests_per_day: number
  cost_per_1k_input_tokens: string
  cost_per_1k_output_tokens: string
  seo_generation_enabled: boolean
  social_generation_enabled: boolean
  auto_generate_on_publish: boolean
  created_at: string
  updated_at: string
}

export interface AIProviderConfigCreate {
  name: string
  provider: AIProviderType
  base_url?: string
  api_key: string
  model: string
  is_active?: boolean
  max_requests_per_minute?: number
  max_requests_per_day?: number
  cost_per_1k_input_tokens?: string
  cost_per_1k_output_tokens?: string
  seo_generation_enabled?: boolean
  social_generation_enabled?: boolean
  auto_generate_on_publish?: boolean
}

export interface AIProviderConfigUpdate {
  name?: string
  base_url?: string
  api_key?: string
  model?: string
  is_active?: boolean
  max_requests_per_minute?: number
  max_requests_per_day?: number
  cost_per_1k_input_tokens?: string
  cost_per_1k_output_tokens?: string
  seo_generation_enabled?: boolean
  social_generation_enabled?: boolean
  auto_generate_on_publish?: boolean
}

export interface AIProviderDefaults {
  base_url: string
  models: string[]
}

export interface AIUsageLog {
  id: number
  feature: 'seo_meta' | 'seo_meta_bulk' | 'social_content' | 'connection_test'
  status: 'success' | 'error' | 'rate_limited'
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: string
  duration_ms: number
  user: number | null
  user_email: string | null
  job: number | null
  job_title: string | null
  company: number | null
  company_name: string | null
  error_message: string
  created_at: string
}

export interface AIUsageStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  total_tokens: number
  total_cost: number
  avg_duration_ms: number
  seo_requests: number
  seo_bulk_requests: number
  social_requests: number
  test_requests: number
}

export interface SEOMetaResult {
  meta_title: string
  meta_description: string
}

export interface SocialContentResult {
  content: Record<string, string>
  posts_created?: Array<{
    id: number
    platform: string
    status: string
  }>
}

export interface BulkSEOResult {
  message: string
  task_id: string
  total: number
  processing: number
}

export interface AITestResult {
  success: boolean
  response?: string
  tokens?: number
  duration_ms?: number
  error?: string
}

// =============================================================================
// Provider Registry (client-side defaults, mirrors backend PROVIDER_DEFAULTS)
// =============================================================================

export const PROVIDER_REGISTRY: Record<AIProviderType, {
  label: string
  baseUrl: string
  models: { value: string; label: string }[]
  defaultCosts: { input: string; output: string }
}> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: '',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    ],
    defaultCosts: { input: '3.00', output: '15.00' },
  },
  openai: {
    label: 'OpenAI (GPT)',
    baseUrl: '',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    ],
    defaultCosts: { input: '2.50', output: '10.00' },
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      // ── Free: General Purpose (20 req/min, 200 req/day) ──
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
      { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 Llama 405B (Free)' },
      { value: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 24B (Free)' },
      { value: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'NVIDIA Nemotron 3 Nano 30B (Free)' },
      { value: 'nvidia/nemotron-nano-9b-v2:free', label: 'NVIDIA Nemotron Nano 9B v2 (Free)' },
      { value: 'z-ai/glm-4.5-air:free', label: 'GLM-4.5 Air (Free)' },
      { value: 'upstage/solar-pro-3:free', label: 'Solar Pro 3 (Free)' },
      { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B Instruct (Free)' },
      { value: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', label: 'Dolphin Mistral 24B (Free)' },
      // ── Free: Reasoning ──
      { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1 Reasoning (Free)' },
      { value: 'qwen/qwen3-235b-a22b-thinking-2507', label: 'Qwen3 235B Thinking (Free)' },
      { value: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B Instruct (Free)' },
      { value: 'liquid/lfm-2.5-1.2b-thinking:free', label: 'LFM 2.5 1.2B Thinking (Free)' },
      { value: 'liquid/lfm-2.5-1.2b-instruct:free', label: 'LFM 2.5 1.2B Instruct (Free)' },
      // ── Free: Coding & Agentic ──
      { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder 480B (Free)' },
      { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
      { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (Free)' },
      { value: 'arcee-ai/trinity-large-preview:free', label: 'Arcee Trinity Large 400B (Free)' },
      { value: 'arcee-ai/trinity-mini:free', label: 'Arcee Trinity Mini 26B (Free)' },
      { value: 'stepfun/step-3.5-flash:free', label: 'Step 3.5 Flash 196B MoE (Free)' },
      { value: 'qwen/qwen3-4b:free', label: 'Qwen3 4B (Free)' },
      // ── Free: Vision & Multimodal ──
      { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B Vision (Free)' },
      { value: 'google/gemma-3-12b-it:free', label: 'Gemma 3 12B Vision (Free)' },
      { value: 'google/gemma-3-4b-it:free', label: 'Gemma 3 4B Vision (Free)' },
      { value: 'google/gemma-3n-e4b-it:free', label: 'Gemma 3n E4B (Free)' },
      { value: 'google/gemma-3n-e2b-it:free', label: 'Gemma 3n E2B (Free)' },
      { value: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'NVIDIA Nemotron Nano 12B Vision (Free)' },
      { value: 'qwen/qwen3-vl-235b-a22b-thinking', label: 'Qwen3 VL 235B Thinking (Free)' },
      { value: 'qwen/qwen3-vl-30b-a3b-thinking', label: 'Qwen3 VL 30B Thinking (Free)' },
      // ── Free: Auto Router ──
      { value: 'openrouter/free', label: 'Auto Router — Best Free Model (Free)' },

      // ── Paid: Frontier ($1–$25/M tokens) ──
      { value: 'anthropic/claude-4.6-opus-20260205', label: 'Claude 4.6 Opus ($5/$25)' },
      { value: 'anthropic/claude-4.5-sonnet-20250929', label: 'Claude 4.5 Sonnet ($3/$15)' },
      { value: 'anthropic/claude-4.5-opus-20251124', label: 'Claude 4.5 Opus ($5/$25)' },
      { value: 'anthropic/claude-haiku-4.5', label: 'Claude 4.5 Haiku ($1/$5)' },
      { value: 'openai/gpt-5.2-20251211', label: 'GPT-5.2 ($1.75/$14)' },
      { value: 'openai/gpt-5', label: 'GPT-5 ($1.25/$10)' },
      { value: 'openai/gpt-5-nano-2025-08-07', label: 'GPT-5 Nano ($0.05/$0.40)' },
      { value: 'openai/gpt-4.1', label: 'GPT-4.1 ($2/$8)' },
      { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini ($0.40/$1.60)' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini ($0.15/$0.60)' },
      { value: 'google/gemini-3-flash-preview-20251217', label: 'Gemini 3 Flash Preview ($0.50/$3)' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro ($1.25/$10)' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash ($0.30/$2.50)' },
      { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast ($0.20/$0.50)' },
      { value: 'x-ai/grok-4-fast', label: 'Grok 4 Fast ($3/$15)' },
      { value: 'z-ai/glm-5-20260211', label: 'GLM-5 ($0.40/$2)' },
      { value: 'mistralai/mistral-large', label: 'Mistral Large ($2/$6)' },
      // ── Paid: Coding & Agentic ──
      { value: 'openai/gpt-5.3-codex', label: 'GPT-5.3 Codex ($3/$12)' },
      { value: 'x-ai/grok-code-fast-1', label: 'Grok Code Fast ($0.20/$0.50)' },
      { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 ($3/$15)' },
      { value: 'mistralai/devstral-2-2512', label: 'Devstral 2 ($0.05/$0.22)' },
      // ── Paid: Cost-Effective ──
      { value: 'deepseek/deepseek-v3.2-20251201', label: 'DeepSeek V3.2 ($0.25/$0.38)' },
      { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3 ($0.32/$0.89)' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1 ($0.70/$2.50)' },
      { value: 'minimax/minimax-m2.5-20260211', label: 'MiniMax M2.5 ($0.28/$1.20)' },
      { value: 'moonshotai/kimi-k2.5-0127', label: 'Kimi K2.5 ($0.50/$2.40)' },
      { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick ($0.10/$0.32)' },
      { value: 'qwen/qwen3.5-plus', label: 'Qwen 3.5 Plus ($0.40/$2)' },
    ],
    defaultCosts: { input: '0.00', output: '0.00' },
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    defaultCosts: { input: '0.15', output: '0.60' },
  },
  mistral: {
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    models: [
      { value: 'mistral-small-latest', label: 'Mistral Small' },
      { value: 'open-mistral-nemo', label: 'Mistral Nemo' },
      { value: 'mistral-medium-latest', label: 'Mistral Medium' },
      { value: 'mistral-large-latest', label: 'Mistral Large' },
    ],
    defaultCosts: { input: '0.03', output: '0.11' },
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek V3 Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1 Reasoner' },
    ],
    defaultCosts: { input: '0.28', output: '0.42' },
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { value: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout' },
      { value: 'qwen-qwq-32b', label: 'Qwen QwQ 32B' },
      { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick' },
    ],
    defaultCosts: { input: '0.05', output: '0.08' },
  },
  xai: {
    label: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    models: [
      { value: 'grok-3-fast', label: 'Grok 3 Fast' },
      { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast' },
      { value: 'grok-3', label: 'Grok 3' },
      { value: 'grok-3-mini', label: 'Grok 3 Mini' },
    ],
    defaultCosts: { input: '0.20', output: '0.50' },
  },
  together: {
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      { value: 'meta-llama/Llama-3.2-3B-Instruct-Turbo', label: 'Llama 3.2 3B Turbo' },
      { value: 'mistralai/Mistral-Small-24B-Instruct-2501', label: 'Mistral Small 24B' },
      { value: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Turbo' },
    ],
    defaultCosts: { input: '0.06', output: '0.06' },
  },
}

// =============================================================================
// Admin: Provider Config
// =============================================================================

export async function getAIProviders(): Promise<AIProviderConfig[]> {
  const data = await apiClient<AIProviderConfig[] | PaginatedResponse<AIProviderConfig>>('/api/admin/ai/providers/')
  // Handle both paginated and plain array responses from DRF
  return Array.isArray(data) ? data : data.results
}

export async function getAIProvider(id: number): Promise<AIProviderConfig> {
  return apiClient<AIProviderConfig>(`/api/admin/ai/providers/${id}/`)
}

export async function createAIProvider(data: AIProviderConfigCreate): Promise<AIProviderConfig> {
  return apiClient<AIProviderConfig>('/api/admin/ai/providers/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAIProvider(id: number, data: AIProviderConfigUpdate): Promise<AIProviderConfig> {
  return apiClient<AIProviderConfig>(`/api/admin/ai/providers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteAIProvider(id: number): Promise<void> {
  return apiClient<void>(`/api/admin/ai/providers/${id}/`, {
    method: 'DELETE',
  })
}

export async function testAIProvider(id: number): Promise<AITestResult> {
  try {
    return await apiClient<AITestResult>(`/api/admin/ai/providers/${id}/test/`, {
      method: 'POST',
    })
  } catch (err: unknown) {
    // The backend returns 400 with { success: false, error: "..." } on test failure.
    // apiClient throws on non-2xx, so we catch and extract the real error.
    const apiErr = err as { message?: string; errors?: Record<string, string[]> }
    return {
      success: false,
      error: apiErr.message || 'Connection test failed',
    }
  }
}

export async function getAIProviderDefaults(): Promise<Record<string, AIProviderDefaults>> {
  return apiClient<Record<string, AIProviderDefaults>>('/api/admin/ai/defaults/')
}

// =============================================================================
// Admin: Usage & Stats
// =============================================================================

export async function getAIUsageLogs(params?: {
  feature?: string
  status?: string
  page?: number
  page_size?: number
  ordering?: string
}): Promise<PaginatedResponse<AIUsageLog>> {
  const searchParams = new URLSearchParams()
  if (params?.feature) searchParams.set('feature', params.feature)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.ordering) searchParams.set('ordering', params.ordering)

  const query = searchParams.toString()
  return apiClient<PaginatedResponse<AIUsageLog>>(
    `/api/admin/ai/usage/${query ? `?${query}` : ''}`
  )
}

export async function getAIUsageStats(days?: number): Promise<AIUsageStats> {
  const query = days ? `?days=${days}` : ''
  return apiClient<AIUsageStats>(`/api/admin/ai/stats/${query}`)
}

// =============================================================================
// SEO Generation (available to employers, agencies, admins)
// =============================================================================

export async function generateSEOMeta(jobId: string): Promise<SEOMetaResult> {
  return apiClient<SEOMetaResult>('/api/ai/seo/generate/', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

export async function bulkGenerateSEOMeta(params: {
  scope: 'missing' | 'all' | 'company'
  limit?: number
  company_id?: number
}): Promise<BulkSEOResult> {
  return apiClient<BulkSEOResult>('/api/admin/ai/seo/bulk/', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// =============================================================================
// Social Content Generation (available to employers, agencies, admins)
// =============================================================================

export async function generateSocialContent(params: {
  job_id: string
  platforms?: string[]
  create_posts?: boolean
}): Promise<SocialContentResult> {
  return apiClient<SocialContentResult>('/api/ai/social/generate/', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
