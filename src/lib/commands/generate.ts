import { Message, QuestionLLMResponse, isQuestionResponse } from '../types';
import inquirer from 'inquirer';
import { prompt } from '../config';
import { ContextManager } from '../utils/context';
import { LLMHandler } from '../utils/llm';
import { DocumentationGenerator } from '../utils/docgen';
import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs';

const MAX_QUESTIONS = 10;

async function handleQuestion(response: QuestionLLMResponse): Promise<string | string[]> {
  let answer: string | string[];

  switch (response.type) {
  case 'text': {
    answer = await new Promise<string>((resolve) => {
      process.stdout.write(chalk.blue(`\n${response.question}: `));
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
    break;
  }

  case 'list': {
    const result = await inquirer.prompt<{ answer: string }>([{
      type: 'list',
      name: 'answer',
      message: response.question,
      choices: response.options,
    }]);
    answer = result.answer;
    break;
  }

  case 'multiple': {
    const result = await inquirer.prompt<{ answers: string[] }>([{
      type: 'checkbox',
      name: 'answers',
      message: response.question,
      choices: response.options,
    }]);
    answer = result.answers;
    break;
  }

  default:
    throw new Error(`Unsupported question type: ${response.type}`);
  }

  return answer;
}

export async function handleGenerate(projectName: string): Promise<void> {
  // Create project directory
  const projectDir = path.join(process.cwd(), projectName);
  try {
    await fs.promises.mkdir(projectDir, { recursive: true });
    chalk.blue(`\nCreating new project in ${projectDir}`);
  } catch (error) {
    console.error(chalk.red('Error creating project directory:'), error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
  
  // Initialize context manager
  const contextManager = new ContextManager();
  
  // Initialize with project name
  const projectNameResponse: QuestionLLMResponse = { 
    key: 'project_name', 
    type: 'text' as const,
    question: 'What is the name of your project?',
    satisfied: false,
    documents: [],
    options: [],
    dependencies: {},
  };
  contextManager.updateContext(projectNameResponse, projectName);

  const llmHandler = new LLMHandler();
  let questionCount = 0;
  let satisfied = false;

  // Initialize messages with system prompt and context
  const messages: Message[] = [
    { role: 'system', content: prompt },
    { role: 'system', content: JSON.stringify(projectNameResponse) },
    { role: 'user', content: projectName },
    { role: 'user', content: 'Continue with the next question. Note that project_name is already answered.' },
  ];

  // Gather information through questions
  while (!satisfied && questionCount < MAX_QUESTIONS) {
    questionCount++;

    try {
      const response = await llmHandler.getResponse(messages);

      if (!isQuestionResponse(response)) {
        chalk.red('Invalid response type - expected QuestionResponse');
        throw new Error('Invalid response type');
      }

      // Skip if question was already answered
      if (contextManager.hasAnswered(response.key)) {
        messages.push(
          { role: 'system', content: JSON.stringify(response) },
          { role: 'user', content: `${response.key} was already answered. Please ask a different question.` },
        );
        continue;
      }

      // Update satisfied state from response
      satisfied = response.satisfied;

      if (!satisfied && questionCount < MAX_QUESTIONS) {
        // Handle the question based on its type
        const answer = await handleQuestion(response);
        contextManager.updateContext(response, answer);
        
        // Add the interaction to messages with current context
        messages.push(
          { role: 'system', content: JSON.stringify(response) },
          { role: 'user', content: Array.isArray(answer) ? answer.join(', ') : answer },
          { role: 'system', content: JSON.stringify({ 
            type: 'context',
            infrastructure: contextManager.getInfrastructure(),
            answeredQuestions: Array.from(contextManager.getContext().answeredQuestions),
          })},
          { role: 'user', content: 'Continue with the next question.' },
        );
      }
    } catch (error) {
      chalk.red('Error in question loop:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Force satisfaction after max questions to prevent loops
  if (!satisfied) {
    chalk.yellow('\nReached maximum questions, proceeding with documentation generation.');
    satisfied = true;
  }

  // Save context to project directory
  try {
    const configPath = path.join(projectDir, '.ai-consilium.json');
    await fs.promises.writeFile(
      configPath,
      JSON.stringify({
        projectName,
        context: contextManager.getContext(),
        messages,
      }, null, 2),
    );
  } catch (error) {
    chalk.red('Error saving project context:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }

  // Generate documentation in project directory
  try {
    const generator = new DocumentationGenerator(projectDir, contextManager.getContext());
    await generator.generate();
    chalk.green('\nDocumentation generation completed successfully');
    chalk.blue(`Project files can be found in: ${projectDir}`);
  } catch (error) {
    chalk.red('Error generating documentation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export const generate = new Command()
  .command('generate')
  .argument('<projectName>', 'Name of the project')
  .description('Generate documentation for your codebase')
  .action(async (projectName: string) => {
    try {
      await handleGenerate(projectName);
    } catch (error) {
      console.error(chalk.red('Error in generate command:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }); 