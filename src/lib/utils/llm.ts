import { LLMResponse, AppConfig } from '../types';
import axios, { AxiosError } from 'axios';
import { loadConfig } from './config';
import chalk from 'chalk';

const PROVIDER_API_URLS = {
    'OpenAI': 'https://api.openai.com/v1/chat/completions',
    'Google AI': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', // Correct URL
} as const;

export class LLMHandler {
    private config: AppConfig;

    constructor() {
        this.config = loadConfig();
    }

    private getApiUrl(): string {
        if (this.config.mode === 'Local' && this.config.lmStudio?.domain) {
            return `http://${this.config.lmStudio.domain}/v1/chat/completions`;
        } else if (this.config.mode === 'Hosted' && this.config.hostedProvider?.name) {
            const baseUrl = PROVIDER_API_URLS[this.config.hostedProvider.name as keyof typeof PROVIDER_API_URLS];
            return baseUrl;
        }
        throw new Error('No valid LLM configuration found. Please run "ai-consilium configure" first.');
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.config.mode === 'Hosted' && this.config.hostedProvider?.name) {
            const providerName = this.config.hostedProvider.name;
            switch (providerName) {
                case 'OpenAI':
                    headers['Authorization'] = `Bearer ${this.config.hostedProvider.apiKey}`;
                    break;
                case 'Google AI':
                    // Use environment variable for Google AI, and provide a helpful error message
                    const apiKey = process.env.GOOGLE_API_KEY;
                    if (!apiKey) {
                        console.error(chalk.red('GOOGLE_API_KEY environment variable not set!'));
                        throw new Error('GOOGLE_API_KEY environment variable not set!'); //  Throw an error
                    }
                    headers['x-goog-api-key'] = apiKey; // Correct header name
                    break;
                default:
                    throw new Error(`Unsupported hosted provider: ${providerName}`);
            }
        }

        return headers;
    }

    private validateResponse(parsed: any): parsed is LLMResponse {

        // Basic required fields that all responses must have
        const baseRequiredFields = ['key', 'question', 'type', 'satisfied'];
        const validTypes = ['list', 'multiple', 'text'];

        // Check base required fields exist
        const missingFields = baseRequiredFields.filter(f => !(f in parsed));
        if (missingFields.length > 0) {
            console.error(chalk.red('Missing required fields:'), missingFields.join(', '));
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate type
        if (!validTypes.includes(parsed.type)) {
            console.error(chalk.red('Invalid question type:'), parsed.type);
            throw new Error(`Invalid question type: ${parsed.type}`);
        }

        // Validate options array only for list/multiple types
        if (['list', 'multiple'].includes(parsed.type)) {
            if (!Array.isArray(parsed.options)) {
                console.error(chalk.red('Options must be an array for list/multiple types'));
                throw new Error('Options must be an array for list/multiple types');
            }
            if (parsed.options.length === 0) {
                console.error(chalk.red('Options array cannot be empty for list/multiple types'));
                throw new Error('Options array cannot be empty for list/multiple types');
            }
        }

        // Ensure dependencies is an object
        if (parsed.dependencies && typeof parsed.dependencies !== 'object') {
            console.error(chalk.red('Dependencies must be an object'));
            throw new Error('Dependencies must be an object');
        }

        // Ensure documents is an array
        if (!Array.isArray(parsed.documents)) {
            console.error(chalk.red('Documents must be an array'));
            throw new Error('Documents must be an array');
        }

        return true;
    }
    private generateKeyFromQuestion(question: string): string {
        return question
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 50);
    }

    private transformResponse(parsed: any): LLMResponse {

        // Ensure all required fields exist with proper defaults
        const transformed = {
          key: parsed.key || this.generateKeyFromQuestion(parsed.question),
          question: parsed.question,
          type: parsed.type,
          options: Array.isArray(parsed.options) ? parsed.options : [],
          satisfied: Boolean(parsed.satisfied),
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          dependencies: typeof parsed.dependencies === 'object' ? parsed.dependencies : {}
        };

        return transformed;
      }
      private extractJSONFromCodeBlock(content: string): any {
        const trimmed = content.trim();
        const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);

        if (jsonMatch) {
          const jsonContent = jsonMatch[1].trim();
          try {
            return JSON.parse(jsonContent);
          } catch (error) {
            console.error(chalk.red('Failed to parse JSON from code block:'), error instanceof Error ? error.message : 'Unknown error');
            throw error; // Re-throw the error to be caught by the caller
          }
        }
        try {
            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}') + 1;
            if (start >= 0 && end > start) {
              const jsonContent = trimmed.slice(start, end);
              return JSON.parse(jsonContent);
            }
            return JSON.parse(trimmed);
          } catch (error) {
            console.error(chalk.red('Failed to parse JSON:'), error instanceof Error ? error.message : 'Unknown error');
            console.error(chalk.yellow('Raw content:'), trimmed);
            throw new Error('Invalid JSON in response');
          }
      }

    private getRequestBody(messages: { role: string; content: string; }[]): any {
        const defaultParameters = {
            temperature: 0.2,
            maxTokens: 4096,
            topK: 40
        };

        if (this.config.mode === 'Local') {
            const parameters = this.config.lmStudio?.parameters || defaultParameters;
            return {
                messages,
                temperature: parameters.temperature,
                max_tokens: parameters.maxTokens,
                top_k: parameters.topK,
            };
        }

        if (this.config.mode === 'Hosted' && this.config.hostedProvider?.name) {
            const parameters = this.config.hostedProvider.parameters || defaultParameters;
            const providerName = this.config.hostedProvider.name;
            const selectedModel = this.config.hostedProvider.selectedModel;

            switch (providerName) {
                case 'OpenAI':
                    return {
                        messages,
                        model: selectedModel || 'gpt-4-turbo-preview', // Use the selected model
                        temperature: parameters.temperature,
                        max_tokens: parameters.maxTokens,
                    };
                case 'Google AI':
                // Use the selected model, but remove 'models/' prefix if present
                const model = selectedModel ? selectedModel.replace(/^models\//, '') : 'gemini-pro';
                return {
                    contents: messages.map(m => ({
                    role: m.role === 'system' ? 'user' : m.role, // Gemini Pro does not have system role.
                    parts: [{ text: m.content }],
                    })),
                    generationConfig: { // Use generationConfig for parameters
                    temperature: parameters.temperature,
                    maxOutputTokens: parameters.maxTokens,
                    topK: parameters.topK,
                    }
                };
                default:
                    throw new Error(`Unsupported hosted provider: ${providerName}`);
            }
        }

        throw new Error('No valid LLM configuration found. Please run "ai-consilium configure" first.');
    }

    public async getResponse(messages: { role: string; content: string; }[]): Promise<LLMResponse> {
    try {
      const apiUrl = this.getApiUrl();
      const headers = this.getHeaders();
      const requestBody = this.getRequestBody(messages);

      const response = await axios.post(apiUrl, requestBody, { headers });

      let content: string | undefined;

      // Extract content based on provider
      if (this.config.mode === 'Hosted' && this.config.hostedProvider?.name) {
        switch (this.config.hostedProvider.name) {
          case 'OpenAI':
            content = response.data.choices[0]?.message?.content;
            break;
          case 'Google AI':
            content = response.data.candidates[0]?.content?.parts[0]?.text;
            break;
          default:
            throw new Error(`Unsupported hosted provider in getResponse: ${this.config.hostedProvider.name}`);
        }
      }
      else {
        // Local LM Studio format
        content = response.data.choices[0]?.message?.content;
      }

      if (!content) {
        console.error(chalk.red('Empty response from LLM'));
        throw new Error('Empty response from LLM');
      }

      try {
        const parsed = this.extractJSONFromCodeBlock(content);
        const transformed = this.transformResponse(parsed);

        if (this.validateResponse(transformed)) {
          return transformed;
        }

        throw new Error('Invalid response structure');
      } catch (error) {
        console.error(chalk.red('JSON Parse Error:'), error instanceof Error ? error.message : 'Unknown error');
        console.error(chalk.yellow('Raw response:'), content);
        throw new Error('Invalid JSON in response');
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(chalk.red('API Error:'), error.message);
        console.error(chalk.red('Response data:'), error.response?.data);
        console.error(chalk.red('Request URL:'), error.config?.url); // Debug log
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

    public async getRawCompletion(messages: { role: string; content: string; }[]): Promise<string> {
        try {
            const apiUrl = this.getApiUrl();
            const headers = this.getHeaders();
            const requestBody = this.getRequestBody(messages);
            //Crucial for google, but breaks other apis.
            const shouldAddStreamParam = !apiUrl.includes('generativelanguage.googleapis.com');

            const response = await axios.post(apiUrl, shouldAddStreamParam ? { ...requestBody, stream: false } : requestBody, { headers });

            let content: string | undefined;

            // Extract content based on provider
            if (this.config.mode === 'Hosted' && this.config.hostedProvider?.name) {
                switch (this.config.hostedProvider.name) {
                    case 'OpenAI':
                        content = response.data.choices[0]?.message?.content;
                        break;
                    case 'Google AI':
                        content = response.data.candidates[0]?.content?.parts[0]?.text;
                        break;
                    default:
                        throw new Error(`Unsupported hosted provider in getRawCompletion: ${this.config.hostedProvider.name}`);
                }
            }
            else {
                // Local LM Studio format
                content = response.data.choices[0]?.message?.content;
            }

            if (!content) {
                throw new Error('Empty response from LLM');
            }

            return content;

        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(chalk.red('API Error:'), error.message);
                console.error(chalk.red('Response data:'), error.response?.data);
                throw new Error(`API request failed: ${error.message}`);
            }
            throw error;
        }
    }
}