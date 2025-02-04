#!/usr/bin/env node
import { Command } from 'commander';
import { generate, configure } from './commands';

const program = new Command();

program
  .name('ai-consilium')
  .description('AI-powered project specification generator')
  .version('0.0.1');

program.addCommand(configure);
program.addCommand(generate);

program.parse(process.argv);