import inquirer from 'inquirer';
import axios from 'axios';
import { saveConfig, loadConfig } from '../utils/config';
import chalk from 'chalk';
import { Command } from 'commander';

interface OpenAIModel {
  id: string;
  created: number;
  owned_by: string;
}

// No changes needed for the OpenAI interface

const SUPPORTED_PROVIDERS = [
  'OpenAI',
  'Google AI',
] as const;

type LLMProvider = typeof SUPPORTED_PROVIDERS[number];

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
    // ... (Your existing fetchOpenAIModels function - no changes needed here) ...
    try {
        const response = await axios.get<{ data: OpenAIModel[] }>('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        return response.data.data
          .filter(model => model.id.includes('gpt'))
          .sort((a, b) => b.created - a.created)
          .map(model => model.id);
      } catch (error) {
        console.error(chalk.red('Failed to fetch OpenAI models:'), error instanceof Error ? error.message : 'Unknown error');
        throw error; // Re-throw the error
      }
}

// Add a function to fetch Gemini models
async function fetchGeminiModels(): Promise<string[]> { // No API key needed here
  try {
    const response = await axios.get(
      'https://generativelanguage.googleapis.com/v1beta/models', { // Correct URL
        headers: {
          'Content-Type': 'application/json',
           //crucial to add here for this specific endpoint.
          'x-goog-api-key': process.env.GOOGLE_API_KEY  // Use environment variable
        },
      });
      // console.log(response.data); //good for debugging

      // Filter for models that support 'generateContent' (chat models)
      return response.data.models
        .filter((model: { name: string; supportedGenerationMethods: string[ ]}) =>
    model.supportedGenerationMethods.includes("generateContent")
)
.map((model: { name: string; supportedGenerationMethods: string[] }) => model.name);

  } catch (error) {
    console.error(chalk.red('Failed to fetch Gemini models:'), error instanceof Error ? error.message : 'Unknown error', error);
    throw error; // Re-throw the error
  }
}

export async function handleConfigure(): Promise<void> {
  const config = loadConfig();

  const { mode } = await inquirer.prompt<{ mode: 'Local' | 'Hosted' }>([{
    type: 'list',
    name: 'mode',
    message: 'Select your preferred mode:',
    choices: ['Local', 'Hosted'],
    default: config.mode || 'Local',
  }]);

  config.mode = mode;

  if (mode === 'Local') {
      // LM Studio configuration (same as before, no changes needed)
      const { useLMStudio } = await inquirer.prompt<{ useLMStudio: boolean }>([{
          type: 'confirm',
          name: 'useLMStudio',
          message: 'Would you like to use LM Studio?',
          default: true,
        }]);

        if (useLMStudio) {
          // ... (rest of LM Studio config, same as before) ...
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
            const response = await axios.get<{ data: {id: string}[] }>(`http://${domain}/v1/models`);
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
    }
     else {
    // Hosted provider configuration
    const { provider } = await inquirer.prompt<{ provider: LLMProvider }>([{
      type: 'list',
      name: 'provider',
      message: 'Select your LLM provider:',
      choices: SUPPORTED_PROVIDERS,
      default: 'OpenAI',
    }]);

    const apiKeyPrompt = {
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${provider} API key:`,
      mask: '*',
      validate: (input: string) => input.length > 0 || 'API key is required',
    };

    // Only prompt for API key if not Google AI (which uses environment variable)
    const { apiKey } = (provider !== 'Google AI') ? await inquirer.prompt<{ apiKey: string }>([apiKeyPrompt]) : { apiKey: '' };

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

    config.hostedProvider = {
      name: provider,
      apiKey: provider === 'Google AI' ? '' : apiKey,  // Only store if NOT Google AI
      selectedModel: null, // Initialize to null
      parameters: {
        temperature,
        maxTokens,
        topK
      }
    };

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
          console.log(chalk.yellow('No suitable OpenAI models found.'));
        }
      } catch (error) {
        console.error(chalk.red('Failed to fetch OpenAI models.'));
      }
    } else if (provider === 'Google AI') {
      // --- Google AI Model Selection ---
      if (!process.env.GOOGLE_API_KEY) {
          console.log(chalk.yellow('\nWARNING: GOOGLE_API_KEY environment variable is not set.'));
          console.log(chalk.yellow('The Google AI provider requires the GOOGLE_API_KEY environment variable to be set.'));
          console.log(chalk.yellow('Please set this environment variable.'));
      }
      else{
        try {
          const models = await fetchGeminiModels(); // No API key needed here
          if (models.length > 0) {
            const { model } = await inquirer.prompt<{ model: string }>([{
              type: 'list',
              name: 'model',
              message: 'Select a Google AI model:',
              choices: models,
              default: 'models/gemini-pro', // Default to gemini-pro
            }]);
            config.hostedProvider.selectedModel = model;
          } else {
            console.log(chalk.yellow('No suitable Google AI models found.'));
          }
        } catch (error) {
          console.error(chalk.red('Failed to fetch Google AI models.'));
        }
    }
    }
  }

  saveConfig(config);
  console.log(chalk.green('Configuration saved successfully!'));
}

export const configure = new Command()
  .command('configure')
  .description('Configure your preferred mode (Local/Hosted) and provider settings')
  .action(handleConfigure);
