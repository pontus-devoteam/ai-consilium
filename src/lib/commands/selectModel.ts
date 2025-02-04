import inquirer from 'inquirer';
import { saveConfig, loadConfig } from '../utils/config';

export async function handleSelectModel() {
  const config = loadConfig();
  const { selectedModel } = await inquirer.prompt([{
    type: "list",
    name: "selectedModel",
    message: "Select LLM model:",
    choices: ["Local", "Cloud"],
  }]);
  config.selectedModel = selectedModel;
  saveConfig(config);
} 