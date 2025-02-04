import inquirer from 'inquirer';
import axios from 'axios';
import { saveConfig, loadConfig } from '../utils/config';
import chalk from 'chalk';
import { Command } from 'commander';

interface LMStudioModel {
  id: string;
}

interface OpenAIModel {
  id: string;
  created: number;
  owned_by: string;
}

const MAJOR_LLM_PROVIDERS = [
  'OpenAI',
] as const;

type LLMProvider = typeof MAJOR_LLM_PROVIDERS[number];

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await axios.get<{ data: OpenAIModel[] }>('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Filter for chat models only and sort by newest first
    return response.data.data
      .filter(model => model.id.includes('gpt'))
      .sort((a, b) => b.created - a.created)
      .map(model => model.id);
  } catch (error) {
    console.error(chalk.red('Failed to fetch OpenAI models:'), error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function handleConfigure(): Promise<void> {
  const config = loadConfig();
  
  // Step 1: Select mode
  const { mode } = await inquirer.prompt<{ mode: 'Local' | 'Hosted' }>([{
    type: 'list',
    name: 'mode',
    message: 'Select your preferred mode:',
    choices: ['Local', 'Hosted'],
    default: config.mode || 'Local',
  }]);

  config.mode = mode;

  if (mode === 'Local') {
    // Step 2a: LM Studio configuration
    const { useLMStudio } = await inquirer.prompt<{ useLMStudio: boolean }>([{
      type: 'confirm',
      name: 'useLMStudio',
      message: 'Would you like to use LM Studio?',
      default: true,
    }]);

    if (useLMStudio) {
      // Get LM Studio domain
      const { domain } = await inquirer.prompt<{ domain: string }>([{
        type: 'input',
        name: 'domain',
        message: 'Enter your LM Studio domain:',
        default: 'localhost:1234',
      }]);

      // Get model parameters
      const { temperature } = await inquirer.prompt<{ temperature: number }>([{
        type: 'number',
        name: 'temperature',
        message: 'Enter temperature (0.0-1.0, lower means more deterministic):',
        default: 0.2,
        validate: (value) => {
          if (value >= 0 && value <= 1) return true;
          return 'Temperature must be between 0 and 1';
        }
      }]);

      const { maxTokens } = await inquirer.prompt<{ maxTokens: number }>([{
        type: 'number',
        name: 'maxTokens',
        message: 'Enter max tokens (higher means longer responses):',
        default: 4096,
        validate: (value) => {
          if (value > 0) return true;
          return 'Max tokens must be greater than 0';
        }
      }]);

      const { topK } = await inquirer.prompt<{ topK: number }>([{
        type: 'number',
        name: 'topK',
        message: 'Enter top K (number of tokens to consider for each step):',
        default: 40,
        validate: (value) => {
          if (value > 0) return true;
          return 'Top K must be greater than 0';
        }
      }]);

      config.lmStudio = {
        domain,
        selectedModel: null,
        parameters: {
          temperature,
          maxTokens,
          topK
        }
      };

      // Fetch available models from LM Studio
      try {
        const response = await axios.get<{ data: LMStudioModel[] }>(`http://${domain}/v1/models`);
        const models = response.data.data.map((model) => model.id);

        if (models.length > 0) {
          const { model } = await inquirer.prompt<{ model: string }>([{
            type: 'list',
            name: 'model',
            message: 'Select a model:',
            choices: models,
          }]);
          config.lmStudio.selectedModel = model;
        } else {
          console.log(chalk.yellow('No models found in LM Studio'));
        }
      } catch (error) {
        console.log(chalk.red('Failed to fetch models from LM Studio. Please ensure the server is running and try again.'));
      }
    }
  } else {
    // Step 2b: Hosted provider configuration
    const { provider } = await inquirer.prompt<{ provider: LLMProvider }>([{
      type: 'list',
      name: 'provider',
      message: 'Select your LLM provider:',
      choices: MAJOR_LLM_PROVIDERS,
      default: 'OpenAI',
    }]);

    // Get API key
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([{
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${provider} API key:`,
      mask: '*',
    }]);

    // Get model parameters
    const { temperature } = await inquirer.prompt<{ temperature: number }>([{
      type: 'number',
      name: 'temperature',
      message: 'Enter temperature (0.0-1.0, lower means more deterministic):',
      default: 0.2, // Recommended for code generation
      validate: (value) => {
        if (value >= 0 && value <= 1) return true;
        return 'Temperature must be between 0 and 1';
      }
    }]);

    const { maxTokens } = await inquirer.prompt<{ maxTokens: number }>([{
      type: 'number',
      name: 'maxTokens',
      message: 'Enter max tokens (higher means longer responses):',
      default: 4096, // Good default for most code generation tasks
      validate: (value) => {
        if (value > 0) return true;
        return 'Max tokens must be greater than 0';
      }
    }]);

    const { topK } = await inquirer.prompt<{ topK: number }>([{
      type: 'number',
      name: 'topK',
      message: 'Enter top K (number of tokens to consider for each step):',
      default: 40, // Good default for code generation
      validate: (value) => {
        if (value > 0) return true;
        return 'Top K must be greater than 0';
      }
    }]);

    config.hostedProvider = {
      name: provider,
      apiKey,
      selectedModel: null,
      parameters: {
        temperature,
        maxTokens,
        topK
      }
    };

    // Fetch and select model if OpenAI
    if (provider === 'OpenAI') {
      try {
        const models = await fetchOpenAIModels(apiKey);
        
        if (models.length > 0) {
          const { model } = await inquirer.prompt<{ model: string }>([{
            type: 'list',
            name: 'model',
            message: 'Select an OpenAI model:',
            choices: models,
            default: 'gpt-4-turbo-preview',
          }]);
          config.hostedProvider.selectedModel = model;
        } else {
          console.log(chalk.yellow('No GPT models found in your OpenAI account'));
        }
      } catch (error) {
        console.log(chalk.red('Failed to fetch OpenAI models. Please check your API key and try again.'));
        return;
      }
    }
  }

  saveConfig(config);
  console.log(chalk.green('Configuration saved successfully!'));
}

export const configure = new Command()
  .command('configure')
  .description('Configure your preferred mode (Local/Hosted) and provider settings')
  .action(async () => {
    try {
      await handleConfigure();
    } catch (error) {
      console.error(chalk.red('Error in configure command:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }); 