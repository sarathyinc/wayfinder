# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation under `/docs`
- Full implementation of core runtime, CLI, providers, widget, and Next.js adapter
- Capability graph with proactive tasks and reactive assistant support
- Command bus for agentic execution (Phase 3 foundations)
- Mock + real LLM providers (OpenAI, Anthropic, Ollama)
- Drift gate and source-hash based caching
- Working Next.js demo with donor management example
- Standard open source files: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, ROADMAP.md

### Changed
- Root README completely rewritten for clarity and discoverability

## [0.1.0] - 2026-06-26

### Added
- Initial monorepo structure with pnpm + Turborepo
- `@wayfinder/core`: Zod schema, validation, loadGraph, runtime primitives
- Basic CLI with init/discover/compile/gate
- Web Component widget
- Next.js adapter skeleton
- First working end-to-end demo

[Unreleased]: https://github.com/wayfinder/wayfinder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/wayfinder/wayfinder/releases/tag/v0.1.0
