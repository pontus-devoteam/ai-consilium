# AI Consilium

AI Consilium is an intelligent CLI tool that helps you generate comprehensive project documentation by asking relevant questions about your project and generating detailed markdown documentation.
It can also be widely configured to support different LLM providers and models, both locally and hosted. It can all be shared with your team.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- LLM Studio or access to a hosted LLM provider

## Installation

```bash
npm i ai-consilium -g
```

This will make the `ai-consilium` command available globally on your system.

## Usage

### Available Commands

- `ai-consilium configure` - Set up your LLM provider, model & various settings
- `ai-consilium generate <project-name>` - Generate new project documentation

### Planned Commands

We're working on additional commands to improve the documentation workflow:
- `ai-consilium edit <doc-name>` - Edit specific documentation sections
- `ai-consilium remove <doc-name>` - Remove specific documentation sections

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

## Contributing

We welcome contributions to AI Consilium! Here's how you can help:

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ai-consilium.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Making Changes

1. Make your changes
2. Run tests:
   ```bash
   npm test
   ```
3. Commit your changes using conventional commits:
   ```bash
   git commit -m "feat: add new feature"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request

### Commit Convention

We use conventional commits to maintain a clear history:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Adding or updating tests
