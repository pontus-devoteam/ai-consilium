import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ProjectContext, LLMResponse } from '../types';
import axios, { AxiosError } from 'axios';
import { loadConfig } from './config';
import { mkdir, writeFile } from 'fs/promises';
import cliProgress from 'cli-progress';
import { LLMHandler } from './llm';

type SectionKey = 'navigation' | 'infrastructure' | 'architecture' | 'api' | 'security' | 'operations' | 'cost';
type SectionInfo = {
  title: string;
  subsections: string[];
};

const MAX_TOKENS = 4000; // Increased token limit for larger sections
const SECTIONS_MAP: Record<SectionKey, SectionInfo> = {
  navigation: {
    title: 'Project Navigation',
    subsections: ['Overview', 'Directory Structure', 'Quick Links']
  },
  infrastructure: {
    title: 'Infrastructure Overview',
    subsections: ['Cloud Provider', 'Deployment Model', 'Database', 'Architecture Diagram', 'Service Dependencies']
  },
  architecture: {
    title: 'System Architecture',
    subsections: ['Components', 'Data Flow', 'Integrations', 'Scalability', 'Security']
  },
  api: {
    title: 'API Documentation',
    subsections: ['Endpoints', 'Authentication', 'Error Handling', 'Examples', 'Schemas']
  },
  security: {
    title: 'Security Documentation',
    subsections: ['Authentication', 'Authorization', 'Data Protection', 'Compliance', 'Best Practices']
  },
  operations: {
    title: 'Operations Guide',
    subsections: ['Deployment', 'Monitoring', 'Scaling', 'Backup', 'Disaster Recovery']
  },
  cost: {
    title: 'Cost Analysis',
    subsections: ['Components', 'Scaling Factors', 'Optimization', 'Breakdown']
  }
};

export class DocumentationGenerator {
  private basePath: string;
  private context: ProjectContext;
  private llmHandler: LLMHandler;

  constructor(projectPath: string, context: ProjectContext) {
    this.basePath = path.join(projectPath, 'docs');
    this.context = context;
    this.llmHandler = new LLMHandler();
  }

  private async generateSubsection(section: string, subsection: string, context: any): Promise<string> {
    const messages = [{
      role: 'system',
      content: `You are AI Consilium, a technical documentation expert. Generate detailed markdown documentation for the ${subsection} subsection of the ${section} section.
Focus ONLY on the ${subsection} aspect - do not try to document everything.
Use the following context to generate comprehensive documentation with proper sections, diagrams, and explanations.
Include mermaid diagrams where appropriate.
Make it detailed and professional, following best practices for technical documentation.

Context:
${JSON.stringify(context, null, 2)}

Requirements:
1. Use proper markdown formatting with headers, lists, and code blocks
2. Include relevant mermaid diagrams where applicable
3. Add cross-references to related sections
4. Provide detailed explanations
5. Include best practices and considerations
6. Add examples where appropriate
7. Focus ONLY on ${subsection} - other aspects will be covered in their own sections

Respond with markdown content for this section.`
    }];

    try {
      const content = await this.llmHandler.getRawCompletion(messages);
      return this.extractMarkdown(content);
    } catch (error) {
      throw new Error(`Failed to generate ${section}/${subsection} documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractMarkdown(response: string): string {
    // Try to extract markdown content between markdown code blocks
    const markdownMatch = response.match(/```markdown\n([\s\S]*?)```/);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }
    
    // If no markdown block found, try to clean up the response
    return response
      .replace(/```\w*\n?/g, '') // Remove code block markers
      .replace(/^\s*[\r\n]/gm, '\n') // Clean up empty lines
      .trim();
  }

  private async generateSection(section: SectionKey): Promise<string> {
    const sectionInfo = SECTIONS_MAP[section];
    if (!sectionInfo) {
      throw new Error(`Unknown section: ${section}`);
    }

    let content = `# ${sectionInfo.title}\n\n`;
    
    // Generate each subsection
    for (const subsection of sectionInfo.subsections) {
      try {
        const subsectionContent = await this.generateSubsection(section, subsection, {
          section,
          subsection,
          infrastructure: this.context.infrastructure,
          requirements: {
            [subsection.toLowerCase().replace(/\s+/g, '_')]: true
          }
        });
        content += subsectionContent + '\n\n';
      } catch (error) {
        content += `## ${subsection}\n\nContent generation failed for this section.\n\n`;
      }
    }

    return content;
  }

  public async generate() {
    console.log(chalk.blue('\nAI Consilium is generating your documentation...'));
    
    // Get all sections from the map
    const sections = Object.keys(SECTIONS_MAP) as SectionKey[];
    
    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} sections || {section}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    try {
      // Create docs directory if it doesn't exist
      await mkdir(this.basePath, { recursive: true });
      
      // Start the progress bar
      progressBar.start(sections.length, 0, { section: 'Initializing...' });
      
      // Generate each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        progressBar.update(i, { section: `Generating ${section}.md...` });
        
        try {
          const content = await this.generateSection(section);
          await writeFile(path.join(this.basePath, `${section}.md`), content);
        } catch (error) {
          throw error;
        }
      }
      
      // Complete the progress bar
      progressBar.update(sections.length, { section: 'Completed!' });
      progressBar.stop();
      
      console.log(chalk.green('\nDocumentation generated successfully!'));
      console.log(chalk.blue('Documentation files can be found in the docs/ directory'));
      
    } catch (error) {
      progressBar.stop();
      throw error;
    }
  }
} 