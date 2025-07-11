#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import GitHubRepository from '../src/infrastructure/GitHubRepository.js';
import DependencyParser from '../src/domain/DependencyParser.js';
import ProjectFetcher from '../src/application/ProjectFetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FetchProjectsScript {
  constructor() {
    this.validateEnvironment();
    this.setupDependencies();
  }

  validateEnvironment() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    if (!process.env.PROJECT_ID) {
      throw new Error('PROJECT_ID environment variable is required');
    }
  }

  setupDependencies() {
    const dependencyParser = new DependencyParser();
    
    const repository = new GitHubRepository({
      token: process.env.GITHUB_TOKEN,
      dependencyParser: dependencyParser
    });

    this.fetcher = new ProjectFetcher({
      repository: repository
    });
  }

  async run() {
    try {
      console.log('🚀 Starting GitHub Projects Gantt data fetch...');
      console.log(`📋 Project ID: ${process.env.PROJECT_ID}`);
      
      // Fetch and process project data
      const result = await this.fetcher.fetchAndProcessProject(process.env.PROJECT_ID);
      
      // Log statistics
      console.log(`📊 Project: ${result.project.title}`);
      console.log(`📈 Statistics:`);
      console.log(`   - Total tasks: ${result.stats.totalTasks}`);
      console.log(`   - Completed tasks: ${result.stats.completedTasks}`);
      console.log(`   - Total story points: ${result.stats.totalStoryPoints}`);
      console.log(`   - Completed story points: ${result.stats.completedStoryPoints}`);
      console.log(`   - Categories: ${Object.keys(result.stats.categories).join(', ')}`);
      
      if (result.criticalPath.length > 0) {
        console.log(`🔴 Critical path: ${result.criticalPath.join(' → ')}`);
      }
      
      // Write to docs/tasks.json for GitHub Pages
      const outputPath = path.join(__dirname, '..', 'docs', 'tasks.json');
      const outputData = {
        project: result.project,
        tasks: result.tasks,
        criticalPath: result.criticalPath,
        stats: result.stats,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`✅ Data written to ${outputPath}`);
      
      // Write metadata file
      const metadataPath = path.join(__dirname, '..', 'docs', 'metadata.json');
      const metadata = {
        lastUpdated: new Date().toISOString(),
        taskCount: result.tasks.length,
        projectId: process.env.PROJECT_ID,
        projectTitle: result.project.title
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`📄 Metadata written to ${metadataPath}`);
      
      console.log('🎉 Data fetch completed successfully!');
      
    } catch (error) {
      console.error('❌ Error fetching project data:', error.message);
      
      // Log detailed error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error:', error);
      }
      
      // Write error info to a file for GitHub Actions
      const errorPath = path.join(__dirname, '..', 'docs', 'error.json');
      const errorData = {
        error: error.message,
        timestamp: new Date().toISOString(),
        projectId: process.env.PROJECT_ID
      };
      
      fs.writeFileSync(errorPath, JSON.stringify(errorData, null, 2));
      
      process.exit(1);
    }
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const script = new FetchProjectsScript();
  script.run();
}