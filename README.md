# AI Consilium

AI Consilium is an intelligent CLI tool that helps you generate comprehensive project documentation by asking relevant questions about your project and generating detailed markdown documentation.
It can also be widely configured to support different LLM providers and models, both locally and hosted. It can all be shared with your team.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- LLM Studio or access to a hosted LLM provider

## Installation

1. Clone the repository:
```bash
git clone https://github.com/pontus-devoteam/ai-consilium.git
```

2. Install dependencies:
```bash
npm install
```

3. Build and link the CLI tool:
```bash
npm run build
```

This will make the `ai-consilium` command available globally on your system.

## Usage

### Select LLM Model

Before generating documentation, run configure to set up your LLM provider and model & various settings.

```bash
ai-consilium configure
```

### Generate Project Documentation

To generate documentation for a new project:

```bash
ai-consilium generate <project-name>
```

For example:
```bash
ai-consilium generate my-awesome-project
```

This will:
1. Create a new directory `my-awesome-project/`
2. Ask you a series of questions about your project
3. Generate comprehensive documentation in `my-awesome-project/docs/`
4. Save project context in `my-awesome-project/.ai-consilium.json`

### Generated Documentation Structure

The generated documentation includes:

- `docs/navigation.md` - Project navigation and structure
- `docs/infrastructure.md` - Infrastructure overview
- `docs/architecture.md` - System architecture
- `docs/api.md` - API documentation
- `docs/security.md` - Security documentation
- `docs/operations.md` - Operations guide
- `docs/cost.md` - Cost analysis

## Configuration

The tool creates a `.ai-consilium.json` file in your project directory that stores:
- Project context and settings
- Question/answer history
- Infrastructure choices

## License

This project is licensed under MIT with Commons Clause - see the [LICENSE.md](license.md) file for details.

The license allows for:
- Free usage of the software
- Commercial use (with restrictions on competing products)
- Modifications for personal/internal use

While requiring:
- Permission for redistribution of source code
- No creation of competing products or services
- Inclusion of the original license and copyright notice 