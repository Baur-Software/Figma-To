# Roadmap

This document outlines planned features and improvements for `@baur-software/figma-to`.

## Current Status (v0.5.0)

- Figma REST API and MCP server input support
- **MCP variable defs** - Direct support for `get_variable_defs` output including `Font()` and `Effect()` strings
- Tailwind CSS v4 `@theme` output with OKLCH/hex colors
- Ionic Framework CSS custom properties with full color variants
- Light/dark mode support from Figma variable modes
- W3C DTCG-aligned normalized token schema
- **CLI tool** - `figma-to sync` and `figma-to push` commands
- **SCSS/Sass output** - Variables, maps, and mixins
- **TokenTypeRegistry** - Extensible architecture for adding new token types (Open/Closed principle)
- **Token linting** - 19 built-in rules with dotfile config and presets
- **Bidirectional sync** - Push tokens back to Figma via figma-mcp-write-server
- **CSS/SCSS input** - Parse existing CSS variables and SCSS $variables/maps

## Priority Features

### 🔥 High Priority

| Feature | Category | Effort | Description |
|---------|----------|--------|-------------|
| **CSS-in-JS** | Output | Medium | styled-components, Emotion, vanilla-extract objects |
| **Watch mode** | DX | Medium | Auto-regenerate on Figma webhook events |

### 🎯 Medium Priority

| Feature | Category | Effort | Description |
|---------|----------|--------|-------------|
| **Tokens Studio** | Input | Medium | Import from Tokens Studio JSON format |
| **Style Dictionary** | Input | Medium | Parse Style Dictionary token files |
| **React Native** | Output | Medium | StyleSheet-compatible output for mobile |
| **Vite plugin** | Framework | Medium | Vite plugin with HMR support |
| **VS Code extension** | DX | Medium | Sync from editor command palette |

### 📋 Backlog

| Feature | Category | Effort | Description |
|---------|----------|--------|-------------|
| CSS Modules | Output | Small | Scoped CSS module files |
| Swift/Kotlin | Output | Medium | Native mobile platform constants |
| Android XML | Output | Small | Android resource XML format |
| Nuxt module | Framework | Medium | Vue project integration |
| Astro integration | Framework | Small | Astro integration |
| Figma plugin | DX | Large | Export directly from Figma UI |
| Adobe XD | Input | Medium | Adobe XD design tokens |
| Sketch | Input | Medium | Sketch document colors/styles |
| Migration helpers | Tooling | Small | Upgrade paths between versions |

## Completed Features

### Token Types ✅

- [x] Typography composites - Full text style tokens
- [x] Shadow tokens - Box shadow and drop shadow
- [x] Gradient tokens - Linear, radial, and conic
- [x] Border tokens - Width, style, and composites
- [x] Animation tokens - Keyframes and sequences

### Input Adapters ✅

- [x] Figma REST API - Direct Figma file access
- [x] Figma MCP Server - `get_variable_defs` integration
- [x] CSS Input - Parse CSS custom properties (`--var: value`)
- [x] SCSS Input - Parse `$variables` and Sass maps

### Output Adapters ✅

- [x] Tailwind CSS v4 - `@theme` with OKLCH/hex
- [x] Ionic Framework - CSS custom properties
- [x] SCSS/Sass - Variables, maps, and mixins
- [x] Figma Output - Push tokens to Figma via figma-mcp-write-server
- [x] Next.js - Build-time theme generation with TypeScript types

### Developer Experience ✅

- [x] CLI tool - `npx figma-to sync` and `npx figma-to push`
- [x] Diff output - Show changes between syncs
- [x] Dry run mode - Preview without writing
- [x] GitHub Actions - CI/CD with test workflow (release auth scope pending)

### Token Linting ✅

- [x] 19 built-in rules covering naming, values, structure, and references
- [x] Dotfile config (`.figmatorc`, `figma-to.config.js`, package.json)
- [x] Built-in presets: `recommended`, `strict`, `minimal`
- [x] Type validation: color, dimension, typography, shadow, gradient, border, cubic-bezier
- [x] Structural checks: circular references, mode consistency, broken references
- [x] Figma-specific: hidden from publishing detection

## Future Exploration

### Claude Agent SDK Integration

- **SCSS Agent** - Claude agent for SCSS output
- **React Native Agent** - Mobile StyleSheet generation
- **CSS-in-JS Agent** - styled-components/Emotion output
- **Multi-platform Agent** - Single agent, multiple formats

### Advanced Bidirectional Sync

Building on the Figma Output Adapter (v0.5.0), future enhancements could include:

- Conflict detection and resolution strategies
- Automatic sync triggers on file save
- Version history and rollback support
- Team collaboration workflows

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to implement new adapters and contribute to the project.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes to public API or output format
- **Minor**: New adapters, token types, or backward-compatible features
- **Patch**: Bug fixes and documentation updates

## Feedback

Have a feature request? Open an issue on [GitHub](https://github.com/Baur-Software/Figma-To/issues) or start a discussion.
