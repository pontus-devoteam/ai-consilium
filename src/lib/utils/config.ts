import { DEFAULT_CONFIG, CONFIG_FILE } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

export interface HostedProviderConfig {
  name: string;
  apiKey: string;
  selectedModel?: string;
  parameters?: {
    maxTokens: number;
    temperature: number;
    topK: number;
  };
}

export const DEFAULT_PARAMETERS = {
  maxTokens: 4096,
  temperature: 0.2,
  topK: 40,
};

export function loadConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  try {
    if (fs.existsSync(configPath)) {
      const rawConfig = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(rawConfig);
      return {
        ...DEFAULT_CONFIG,
        ...config,
        context: {
          infrastructure: {},
          answeredQuestions: [],
          dependencies: {},
          ...(config.context || {})
        }
      };
    }
  } catch (error) {

  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: object) {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config:'), error);
    throw error;
  }
}

export async function configureHostedMode(): Promise<HostedProviderConfig> {
  const provider = await inquirer.prompt([
    {
      type: 'list',
      name: 'name',
      message: 'Select a provider:',
      choices: ['OpenAI', 'Anthropic', 'Google AI', 'Cohere', 'AI21 Labs', 'Mistral AI', 'Amazon Bedrock'],
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter your API key:',
      validate: (input) => input.length > 0 || 'API key is required',
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Enter max tokens (default: 4096):',
      default: DEFAULT_PARAMETERS.maxTokens,
    },
    {
      type: 'number',
      name: 'temperature',
      message: 'Enter temperature (0-1, default: 0.2):',
      default: DEFAULT_PARAMETERS.temperature,
      validate: (input) => (input >= 0 && input <= 1) || 'Temperature must be between 0 and 1',
    },
    {
      type: 'number',
      name: 'topK',
      message: 'Enter top K (default: 40):',
      default: DEFAULT_PARAMETERS.topK,
    },
  ]);

  return {
    name: provider.name,
    apiKey: provider.apiKey,
    parameters: {
      maxTokens: provider.maxTokens,
      temperature: provider.temperature,
      topK: provider.topK,
    },
  };
} 