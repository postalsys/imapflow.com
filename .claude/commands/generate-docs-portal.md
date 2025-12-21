# Generate Documentation Portal

You are a documentation portal generator. Your task is to create a complete Docusaurus 3.x documentation site for an open source project.

## Input

The user will provide:
- **Project path**: $ARGUMENTS (or current directory if not specified)
- The project should contain source code, README, and ideally JSDoc/TSDoc comments

## Process

### Phase 1: Project Analysis

1. **Analyze the project structure**:
   - Read `package.json` to understand the project name, description, dependencies
   - Read `README.md` for project overview and existing documentation
   - Identify the main entry points and exports
   - Look for existing documentation in `/docs`, `/documentation`, or similar folders
   - Scan source files for JSDoc/TSDoc comments

2. **Identify key components**:
   - Main classes and their methods
   - Configuration options
   - Events and callbacks
   - TypeScript types/interfaces
   - Examples in the codebase

3. **Determine the project's purpose and audience**:
   - What problem does it solve?
   - Who are the target users (developers, end-users)?
   - What are the key features?

### Phase 2: Documentation Site Setup

1. **Create Docusaurus project** in a new directory (e.g., `{project-name}-docs`):

```bash
npx create-docusaurus@latest {project-name}-docs classic --typescript
cd {project-name}-docs
npm install @docusaurus/theme-mermaid
```

2. **Configure `docusaurus.config.ts`**:
   - Set title, tagline from package.json
   - Configure URL and baseUrl
   - Enable Mermaid for diagrams
   - Set up navbar with Documentation link and GitHub/npm links
   - Configure footer with relevant links
   - Set organizationName and projectName for GitHub

3. **Create `CLAUDE.md`** with project-specific instructions

### Phase 3: Content Generation

Generate the following documentation structure:

```
docs/
├── index.md                    # Introduction/Overview
├── getting-started/
│   ├── installation.md         # npm install, requirements
│   ├── quick-start.md          # Minimal working example
│   └── configuration.md        # Configuration options
├── guides/
│   ├── {feature-1}.md          # Feature-specific guides
│   ├── {feature-2}.md
│   └── ...
├── api/
│   ├── {main-class}.md         # API reference for main class
│   ├── {types}.md              # TypeScript types/interfaces
│   └── ...
├── examples/
│   └── {example-name}.md       # Code examples with explanations
└── advanced/
    ├── {advanced-topic-1}.md
    └── ...
```

### Phase 4: Custom Graphics

1. **Create logo.svg** - Simple, professional logo representing the project's purpose:
   - Use project's primary color or derive from existing branding
   - Keep it simple and recognizable at small sizes

2. **Create feature illustrations** (replace undraw_docusaurus_*.svg):
   - `undraw_docusaurus_mountain.svg` - First key feature visualization
   - `undraw_docusaurus_tree.svg` - Second key feature visualization
   - `undraw_docusaurus_react.svg` - Third key feature visualization

3. **Create social card** (`{project-name}-social-card.svg`):
   - 1200x630 dimensions
   - Project name and tagline
   - Key feature highlights
   - npm install command

4. **Update color scheme** in `src/css/custom.css`:
   - Derive primary color from project branding or create appropriate palette
   - Update both light and dark mode colors

### Phase 5: Homepage Customization

Update `src/pages/index.tsx`:
- Customize hero section with project name and tagline
- Update feature list with actual project features
- Add call-to-action buttons (Get Started, Quick Start)
- Optionally add a banner for related projects/services

Update `src/components/HomepageFeatures/index.tsx`:
- Replace feature titles and descriptions
- Reference the new feature SVGs

### Phase 6: Sidebar Configuration

Update `sidebars.ts`:
- Organize documentation into logical categories
- Set appropriate ordering
- Add category labels and collapsible sections

## Documentation Content Guidelines

When writing documentation content:

1. **Introduction**: Clear problem statement, what the library does, when to use it

2. **Installation**:
   - Package manager commands (npm, yarn, pnpm)
   - Node.js version requirements
   - Peer dependencies if any

3. **Quick Start**:
   - Minimal working example (copy-paste ready)
   - Expected output
   - Link to more detailed guides

4. **API Reference**:
   - Document all public methods with parameters and return types
   - Include code examples for each method
   - Note any async behavior, events, or callbacks
   - Document configuration options with defaults

5. **Code Examples**:
   - Use syntax highlighting with language specifier
   - Add descriptive titles to code blocks
   - Include both minimal and real-world examples

6. **Use Mermaid diagrams** for:
   - Architecture overviews
   - Data flow
   - State machines
   - Sequence diagrams

## Output

After completion, provide:
1. Summary of generated documentation structure
2. Instructions to run the documentation site locally
3. Suggestions for additional documentation that could be added
4. Any areas where manual review/enhancement is recommended

## Example Commands

```bash
# Start dev server
npm start

# Build for production
npm run build

# Type check
npm run typecheck
```

---

Begin by analyzing the project at the specified path and asking clarifying questions if needed.
