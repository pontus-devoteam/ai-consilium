export interface Message {
  role: 'system' | 'user';
  content: string;
}

export type Messages = Message[];

export interface BaseLLMResponse {
  key: string;
  type: 'list' | 'multiple' | 'text';
  satisfied: boolean;
  documents: string[];
  options: string[];
}

export interface QuestionLLMResponse extends BaseLLMResponse {
  question: string;
  dependencies?: {
    [key: string]: string[];
  };
  previousAnswers?: {
    [key: string]: string | string[];
  };
}

export interface DocumentationLLMResponse extends BaseLLMResponse {
  content: string;
}

export type LLMResponse = QuestionLLMResponse | DocumentationLLMResponse;

export interface ProjectContext {
  infrastructure: Record<string, string | string[]>;
  answeredQuestions: Set<string>;
  dependencies: Record<string, string[]>;
}

export interface InfrastructureConfig {
  [key: string]: string | string[];
}

export interface AppConfig {
  mode?: 'Local' | 'Hosted';
  lmStudio?: {
    domain: string;
    selectedModel: string | null;
    parameters?: {
      maxTokens: number;
      temperature: number;
      topK: number;
    };
  };
  hostedProvider?: {
    name: string;
    apiKey: string | null;
    selectedModel: string | null;
    parameters?: {
      maxTokens: number;
      temperature: number;
      topK: number;
    };
  };
  infrastructure?: Record<string, string>;
  selectedModel?: string;
  selectedType?: string;
  context?: ProjectContext;
}

// Type guards
export function isDocumentationResponse(response: LLMResponse | string): response is DocumentationLLMResponse {
  return typeof response !== 'string' && response.key === 'documentation' && 'content' in response;
}

export function isQuestionResponse(response: LLMResponse | string): response is QuestionLLMResponse {
  return typeof response !== 'string' && 'question' in response;
}

export function isLLMResponse(response: LLMResponse | string): response is LLMResponse {
  return typeof response !== 'string';
}
