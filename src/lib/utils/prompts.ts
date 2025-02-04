import inquirer from 'inquirer';
import chalk from 'chalk';
import { QuestionLLMResponse } from '../types';

export async function handleUserPrompt(content: QuestionLLMResponse): Promise<string> {
  let answers;
  const question = {
    name: `selected_${content.key}`,
    message: chalk.green(content.question),
  };

  switch(content.type) {
    case 'list':
      answers = await inquirer.prompt([{
        ...question,
        type: "list",
        choices: content.options,
      }]);
      break;
    case 'multiple':
      answers = await inquirer.prompt([{
        ...question,
        type: "checkbox",
        choices: content.options,
      }]);
      break;
    case 'text':
      answers = await inquirer.prompt([{
        ...question,
        type: "input",
      }]);
      break;
    default:
      throw new Error(`Unsupported question type: ${content.type}`);
  }

  return answers[`selected_${content.key}`];
} 