/**
 * 채팅 메시지 타입
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
}

/**
 * Eden API 응답 타입
 */
export interface EdenResponse {
  response: string;
  model: string;
  done: boolean;
}

/**
 * Eden 모델 정보
 */
export interface ModelInfo {
  name: string;
  description: string;
  size: string;
  type: 'reasoning' | 'chat' | 'coding' | 'vision';
}

/**
 * API 에러 타입
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * 터미널 명령어 타입
 */
export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  exitCode?: number;
  timestamp: Date;
}
