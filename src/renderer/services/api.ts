import { AIProvider, ApiError, EdenResponse, ModelInfo } from '../types';

// 프로바이더별 기본 모델
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-opus-4-5',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o',
  local: 'llama3',
};

// 프로바이더별 모델 목록 (선택용)
export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
  local: [],
};

// 스토어에서 프로바이더 설정 읽기
async function readProviderConfig(): Promise<{
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}> {
  const defaults = { provider: 'anthropic' as AIProvider, apiKey: '', model: '', baseUrl: 'http://localhost:11434' };
  if (!(window.electron && window.electron.store)) return defaults;

  const p = await window.electron.store.get('ai_provider');
  const provider: AIProvider = (p.success && p.value ? String(p.value) : 'anthropic') as AIProvider;

  const k = await window.electron.store.get(`ai_${provider}_key`);
  const apiKey = k.success && k.value ? String(k.value).trim() : '';

  const m = await window.electron.store.get(`ai_${provider}_model`);
  const model = m.success && m.value ? String(m.value).trim() : DEFAULT_MODELS[provider];

  const u = await window.electron.store.get('ai_local_url');
  const baseUrl = u.success && u.value ? String(u.value).replace(/\/$/, '') : 'http://localhost:11434';

  return { provider, apiKey, model, baseUrl };
}

// SSE 청크에서 텍스트 추출 (프로바이더별 파싱)
function extractText(provider: AIProvider, data: any): string | null {
  try {
    switch (provider) {
      case 'anthropic':
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          return data.delta.text ?? null;
        }
        return null;
      case 'gemini':
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      case 'openai':
      case 'local':
        return data.choices?.[0]?.delta?.content ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// 프로바이더별 요청 빌드
function buildRequest(
  provider: AIProvider,
  apiKey: string,
  model: string,
  baseUrl: string,
  message: string,
  systemPrompt?: string,
  history?: any[]
): { url: string; body: any; headers: Record<string, string> } {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // history + current message 조합
  const prior = (history || []).filter((m: any) => m.role === 'user' || m.role === 'assistant');

  switch (provider) {
    case 'anthropic': {
      const messages = [
        ...prior.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: message },
      ];
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers,
        body: {
          model,
          messages,
          max_tokens: 8192,
          stream: true,
          ...(systemPrompt ? { system: systemPrompt } : {}),
        },
      };
    }

    case 'gemini': {
      const contents = [
        ...prior.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        headers,
        body: {
          contents,
          ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        },
      };
    }

    case 'openai': {
      headers['Authorization'] = `Bearer ${apiKey}`;
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push(...prior.map((m: any) => ({ role: m.role, content: m.content })));
      messages.push({ role: 'user', content: message });
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers,
        body: { model, messages, stream: true },
      };
    }

    case 'local': {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push(...prior.map((m: any) => ({ role: m.role, content: m.content })));
      messages.push({ role: 'user', content: message });
      return {
        url: `${baseUrl}/v1/chat/completions`,
        headers,
        body: { model, messages, stream: true },
      };
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

class QuarkApi {
  /**
   * LLM 채팅 스트리밍 — 설정된 프로바이더로 직접 연결
   */
  async *chatStream(
    message: string,
    _model?: string,
    signal?: AbortSignal,
    _mode?: string,
    _cwd?: string,
    systemPrompt?: string,
    history?: any[]
  ): AsyncGenerator<string, void, unknown> {
    const { provider, apiKey, model, baseUrl } = await readProviderConfig();

    if (!apiKey && provider !== 'local') {
      throw new Error(`${provider} API Key가 설정되지 않았습니다. 설정(Connection)에서 API Key를 입력해주세요.`);
    }

    const { url, body, headers } = buildRequest(provider, apiKey, model, baseUrl, message, systemPrompt, history);

    // Electron IPC 경로 (CORS 우회)
    if (window.electron && window.electron.chat) {
      const streamId = Date.now().toString() + Math.random().toString(36).substring(7);
      const queue: string[] = [];
      let isDone = false;
      let streamError: any = null;

      const offData = window.electron.chat.onData((sid, data) => {
        if (sid === streamId) queue.push(data);
      });
      const offEnd = window.electron.chat.onEnd((sid) => {
        if (sid === streamId) isDone = true;
      });
      const offError = window.electron.chat.onError((sid, err) => {
        if (sid === streamId) { streamError = err; isDone = true; }
      });

      try {
        const startResult = await window.electron.chat.startStream(streamId, url, body, headers);
        if (!startResult.success) {
          throw new Error(startResult.error || 'Failed to start stream');
        }

        if (signal) {
          signal.addEventListener('abort', () => window.electron.chat.stopStream(streamId));
        }

        while (true) {
          if (queue.length > 0) {
            const items = queue.splice(0);
            for (const raw of items) {
              for (const line of raw.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') { offData(); offEnd(); offError(); return; }
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) throw new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
                  const text = extractText(provider, parsed);
                  if (text) yield text;
                } catch (e: any) {
                  if (e.message && !e.message.includes('JSON')) throw e;
                }
              }
            }
          }

          if (streamError) throw new Error(streamError);
          if (isDone && queue.length === 0) break;
          await new Promise(r => setTimeout(r, 10));
        }
      } finally {
        offData(); offEnd(); offError();
      }

    } else {
      // 웹 폴백 (fetch)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }
      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) throw new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
            const text = extractText(provider, parsed);
            if (text) yield text;
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
    }
  }

  /** @deprecated 직접 API 연결로 대체됨 */
  async checkHealth(): Promise<boolean> { return false; }
  async listModels(): Promise<ModelInfo[]> { return []; }
  async analyzeImage(_img: string, _prompt?: string): Promise<EdenResponse> {
    throw new Error('Not implemented');
  }
}

export const quarkApi = new QuarkApi();
export default quarkApi;
