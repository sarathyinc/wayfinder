# Contributing to Wayfinder

Thank you for your interest in contributing to Wayfinder! We welcome contributions from everyone.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (we use pnpm workspaces + Turborepo)

```bash
pnpm install
pnpm --filter @wayfinder/core build
```

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run typecheck: `pnpm typecheck`
6. Commit your changes (we use conventional commits)
7. Push to your fork and open a Pull Request

## Project Structure

```
packages/
  core/                 # Core schema, runtime, primitives (framework-agnostic)
  providers/            # LLM providers (OpenAI, Anthropic, Ollama, mock)
  cli/                  # `assist` CLI tool
  widget/               # <assist-widget> Web Component
  adapter-nextjs/       # Next.js adapter (discover, React wrapper, etc.)

examples/
  nextjs-demo/          # Reference implementation

docs/                   # Documentation
```

## What to Work On

Good first contributions:

- Improve route discovery for complex routing patterns
- Add more tests
- Improve documentation
- Add adapter examples for other stacks (Remix, SvelteKit, etc.)
- Enhance the mock provider
- Add better error messages

See the [Roadmap](docs/roadmap.md) and open issues for priorities.

## Pull Request Guidelines

- Keep PRs focused and reasonably sized
- Update documentation when changing behavior
- Add tests for new functionality
- Ensure `pnpm test && pnpm typecheck` passes
- Follow the existing code style

## Questions?

Open a discussion or issue. We're happy to help!

Thank you for contributing! 🚀
