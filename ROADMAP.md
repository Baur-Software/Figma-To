# Roadmap

This document outlines planned features and improvements for `@baur-software/figma-to`.

## Current Status (v1.0)

- Figma REST API and MCP server input support
- Tailwind CSS v4 `@theme` output with OKLCH/hex colors
- Ionic Framework CSS custom properties with full color variants
- Light/dark mode support from Figma variable modes
- W3C DTCG-aligned normalized token schema

## Planned Features

### Input Adapters

- [ ] **Tokens Studio** - Import from Tokens Studio JSON format
- [ ] **Style Dictionary** - Parse Style Dictionary token files
- [ ] **Adobe XD** - Support Adobe XD design tokens (if API available)
- [ ] **Sketch** - Parse Sketch document colors and styles

### Output Adapters

- [ ] **CSS Modules** - Generate scoped CSS module files
- [ ] **SCSS/Sass** - Output as Sass variables and maps
- [ ] **CSS-in-JS** - Generate objects for styled-components, Emotion, vanilla-extract
- [ ] **React Native** - StyleSheet-compatible output for mobile
- [ ] **Swift/Kotlin** - Native mobile platform color constants
- [ ] **Android XML** - Android resource XML format

### Framework Integrations

- [ ] **Next.js** - Plugin for automatic theme generation at build time
- [ ] **Vite** - Vite plugin with HMR support
- [ ] **Nuxt** - Nuxt module for Vue projects
- [ ] **Astro** - Astro integration

### Token Types

- [ ] **Typography composites** - Full text style tokens (font, size, weight, line-height)
- [ ] **Shadow tokens** - Box shadow and drop shadow support
- [ ] **Gradient tokens** - Linear and radial gradient support
- [ ] **Animation tokens** - Duration, easing, and keyframe tokens
- [ ] **Border tokens** - Border width, style, and composite borders

### Developer Experience

- [ ] **CLI tool** - `npx figma-to sync` command
- [ ] **Watch mode** - Auto-regenerate on Figma webhook events
- [ ] **Figma plugin** - Export directly from Figma UI
- [ ] **VS Code extension** - Sync from editor command palette
- [ ] **GitHub Action** - CI/CD integration for automated PRs

### Validation & Tooling

- [ ] **Token linting** - Warn on naming inconsistencies
- [ ] **Diff output** - Show what changed between syncs
- [ ] **Dry run mode** - Preview output without writing files
- [ ] **Migration helpers** - Upgrade paths between major versions

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to implement new adapters and contribute to the project.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes to public API or output format
- **Minor**: New adapters, token types, or backward-compatible features
- **Patch**: Bug fixes and documentation updates

## Feedback

Have a feature request? Open an issue on [GitHub](https://github.com/Baur-Software/Figma-To-Tailwind/issues) or start a discussion.
