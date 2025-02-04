import { ProjectContext, LLMResponse, isQuestionResponse } from '../types';
import { loadConfig, saveConfig } from './config';
import chalk from 'chalk';

export class ContextManager {
  private context: ProjectContext;

  constructor() {
    try {
      const config = loadConfig();

      let answeredQuestions = new Set<string>();
      
      // Safely handle answeredQuestions from config
      if (config.context?.answeredQuestions) {
        const questions = config.context.answeredQuestions;
        if (Array.isArray(questions)) {
          answeredQuestions = new Set(questions);
        } else if (typeof questions === 'object') {
          // If it's somehow an object, try to get its values
          answeredQuestions = new Set(Object.values(questions));
        }
      }

      this.context = {
        infrastructure: config.context?.infrastructure || {},
        answeredQuestions,
        dependencies: config.context?.dependencies || {}
      };

    } catch (error) {
      console.error(chalk.red('Error initializing context:'), error);
      // Fallback to empty context if initialization fails
      this.context = {
        infrastructure: {},
        answeredQuestions: new Set<string>(),
        dependencies: {}
      };
    }
  }

  public updateContext(response: LLMResponse, answer: string | string[]) {
    try {
      // Ensure we're dealing with a question response
      if (!isQuestionResponse(response)) {
        throw new Error('Cannot update context with non-question response');
      }

      // Update infrastructure
      this.context.infrastructure[response.key] = answer;
      
      // Mark question as answered
      this.context.answeredQuestions.add(response.key);
      
      // Update dependencies
      if (response.dependencies) {
        this.context.dependencies = {
          ...this.context.dependencies,
          ...response.dependencies
        };
      }

      this.persist();
    } catch (error) {
      console.error(chalk.red('Error updating context:'), error);
      throw error;
    }
  }

  public hasAnswered(key: string): boolean {
    return this.context.answeredQuestions.has(key);
  }

  public getDependencies(key: string): string[] {
    return this.context.dependencies[key] || [];
  }

  public getInfrastructure(): Record<string, string | string[]> {
    return this.context.infrastructure;
  }

  public getContext(): ProjectContext {
    return {
      ...this.context,
      answeredQuestions: new Set(this.context.answeredQuestions)
    };
  }

  private persist() {
    try {
      const config = loadConfig();
      // Convert Set to Array for JSON serialization
      config.context = {
        ...this.context,
        answeredQuestions: Array.from(this.context.answeredQuestions)
      };
      saveConfig(config);
    } catch (error) {
      console.error(chalk.red('Error persisting context:'), error);
      throw error;
    }
  }

  public validateDependencies(key: string): boolean {
    const dependencies = this.getDependencies(key);
    return dependencies.every(dep => this.hasAnswered(dep));
  }
} 