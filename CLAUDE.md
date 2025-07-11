# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Projects Gantt chart visualization tool that automatically fetches data from GitHub Projects v2 and displays it as an interactive Gantt chart. The project uses a hybrid architecture with GitHub Actions for secure data fetching and GitHub Pages for hosting.

## Architecture

### Domain-Driven Design (DDD)
- **Domain Layer**: `src/domain/` - Core business logic (Task, DependencyParser, Timeline)
- **Application Layer**: `src/application/` - Use cases and orchestration (ProjectFetcher)
- **Infrastructure Layer**: `src/infrastructure/` - External integrations (GitHubRepository)

### Test-Driven Development (TDD)
- Comprehensive unit tests for all domain logic
- Tests use Jest with ES modules
- Run tests: `npm test`
- Coverage: `npm run test:coverage`

## Development Commands

- **Run tests**: `npm test`
- **Run tests in watch mode**: `npm test:watch`
- **Run with coverage**: `npm run test:coverage`
- **Build data locally**: `npm run build` (requires environment variables)
- **Serve locally**: `npm run serve`

## Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# GitHub Personal Access Token (needs repo and project permissions)
GITHUB_TOKEN=ghp_your_token_here

# GitHub Project ID (from project URL)
PROJECT_ID=PVT_kwDOBrK-Qs4AB2bc
```

## Key Components

### Domain Models
- **Task**: Represents a GitHub issue with dates, dependencies, and metadata
- **DependencyParser**: Extracts dependencies from issue bodies ("depends on #123")
- **Timeline**: Calculates durations, adjusts dates, and finds critical path

### Data Flow
1. **GitHub Actions** runs `scripts/fetch-projects.js` every 30 minutes
2. **GitHubRepository** fetches data via GitHub Projects v2 GraphQL API
3. **ProjectFetcher** processes data, calculates timelines, and converts to Gantt format
4. **Data is written** to `docs/tasks.json` and committed to repository
5. **GitHub Pages** serves the updated visualization

### Frontend
- **Frappe Gantt**: Renders the interactive Gantt chart
- **Dynamic loading**: Loads `tasks.json` or falls back to sample data
- **View modes**: Day, Week, Month, Quarter
- **Clickable tasks**: Link directly to GitHub issues

## Dependency Parsing

The system parses dependencies from issue bodies using these formats:
- `depends on #123`
- `blocked by #456`
- `depends on: #123, #456`
- `finish-to-start: #123` (advanced)

## GitHub Integration

### Projects v2 API
- Uses GraphQL for efficient data fetching
- Handles pagination automatically
- Parses custom fields (Start Date, Target Date, Story Points)
- Extracts labels, assignees, and issue metadata

### Field Mapping
- **Start Date**: Any field containing "start", "begin"
- **End Date**: Any field containing "end", "due", "target", "deadline"
- **Story Points**: Any field containing "points", "estimate", "effort"

## Deployment

The project auto-deploys via GitHub Actions:
1. Scheduled runs every 30 minutes
2. Manual trigger via workflow dispatch
3. GitHub Pages deployment after data update

## Future Enhancements

- Integration tests with real GitHub data
- DHTMLX Gantt for advanced features
- Real-time updates via webhooks
- Multi-project support
- Advanced filtering and sorting