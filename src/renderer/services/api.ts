import axios, { AxiosInstance } from 'axios';
import { EdenResponse, ModelInfo, ApiError } from '../types';
import { useAuthStore } from '../store/authStore';

/**
 * Quark API 클라이언트 (구 EdenApi)
 */
class QuarkApi {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://100.110.157.32:9000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request Interceptor: Auth Token Injection
    this.client.interceptors.request.use(async (config) => {
      // 1. Dynamic Base URL Check
      const storeUrl = useAuthStore.getState().backendUrl;
      if (storeUrl && config.baseURL !== storeUrl) {
        config.baseURL = storeUrl;
      }

      // 2. Token Injection
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }

  /**
   * 서버 상태 확인
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * LLM 채팅 요청 (단발성)
   */
  async chat(
    message: string,
    model: string = 'Quark-v2',
    stream: boolean = false
  ): Promise<EdenResponse> {
    try {
      const response = await this.client.post<EdenResponse>('/chat', {
        message,
        model,
        stream,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * LLM 채팅 요청 (스트리밍)
   * Async Generator를 사용하여 스트리밍 데이터를 반환
   */
  async *chatStream(
    message: string,
    model: string = 'Quark-v2',
    signal?: AbortSignal,
    mode?: string,
    cwd?: string,
    systemPrompt?: string,
    history?: any[]
  ): AsyncGenerator<string, void, unknown> {
    const storeUrl = useAuthStore.getState().backendUrl || this.baseURL;
    const token = useAuthStore.getState().token;

    // Check if running in Electron with IPC available
    if (window.electron && window.electron.chat) {
      const streamId = Date.now().toString() + Math.random().toString(36).substring(7);
      const url = `${storeUrl}/chat/stream`;
      const body = {
        message,
        model,
        mode,
        cwd,
        system_prompt: systemPrompt,
        history
      };
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      try {
        // Setup listeners before starting
        let resolveQueue: Function;
        const queue: any[] = [];
        let isDone = false;
        let error: any = null;

        const offData = window.electron.chat.onData((sid, data) => {
          if (sid === streamId) queue.push({ type: 'data', value: data });
        });
        const offEnd = window.electron.chat.onEnd((sid) => {
          if (sid === streamId) { isDone = true; } // Queue might still have data
        });
        const offError = window.electron.chat.onError((sid, err) => {
          if (sid === streamId) { error = err; isDone = true; }
        });

        // Start Stream
        const startResult = await window.electron.chat.startStream(streamId, url, body, headers);
        if (!startResult.success) {
          throw new Error(startResult.error || 'Failed to start stream proxy');
        }

        // Handle AbortSignal
        if (signal) {
          signal.addEventListener('abort', () => {
            window.electron.chat.stopStream(streamId);
          });
        }

        // Generator Loop
        while (true) {
          // If we have items in queue, yield them
          if (queue.length > 0) {
            const items = [...queue];
            queue.length = 0; // clear
            for (const item of items) {
              // Parse Logic Copied from previous impl
              const lines = item.value.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') return;

                try {
                  const data = JSON.parse(dataStr);
                  if (data.error) throw new Error(data.error);
                  if (data.content !== undefined) yield data.content;
                } catch (e) { /* ignore parse error for partial chunks */ }
              }
            }
          }

          if (error) throw new Error(error);
          if (isDone) {
            // Check queue once more
            if (queue.length === 0) break;
            // otherwise continue to drain
            continue;
          }

          // Simple polling or wait (implementing true async queue is complex in single function)
          // For MVP, just wait a bit (10ms)
          await new Promise(r => setTimeout(r, 10));
        }

        // Cleanup
        offData(); offEnd(); offError();

      } catch (e) {
        throw this.handleError(e);
      }

    } else {
      // Fallback to fetch (Web Mode)
      try {
        const response = await fetch(`${storeUrl}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            message,
            model,
            mode,
            cwd,
            system_prompt: systemPrompt,
          }),
          signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
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
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') return;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              if (data.content !== undefined) yield data.content;
            } catch (e) {
              console.warn('Failed to parse stream chunk:', e);
            }
          }
        }
      } catch (error) {
        throw this.handleError(error);
      }
    }
  }

  /**
   * 이미지 분석 요청 (Vision)
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string = '이미지를 분석해주세요'
  ): Promise<EdenResponse> {
    try {
      const response = await this.client.post<EdenResponse>('/vision/analyze-base64', {
        image: imageBase64,
        prompt,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<ModelInfo[]>('/models/list');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 에러 핸들링
   */
  private handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      return {
        message: error.response?.data?.message || error.message,
        code: error.code,
        details: error.response?.data,
      };
    }
    return {
      message: error.message || 'Unknown error occurred',
    };
  }

  /**
   * Base URL 변경
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }
}

// 싱글톤 인스턴스 export
export const quarkApi = new QuarkApi();
export default quarkApi;
