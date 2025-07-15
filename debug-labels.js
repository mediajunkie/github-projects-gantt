#!/usr/bin/env node

import GitHubRepository from './src/infrastructure/GitHubRepository.js';
import DependencyParser from './src/domain/DependencyParser.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugLabels() {
  console.log('🔍 Debugging labels in your GitHub project...\n');
  
  if (!process.env.GITHUB_TOKEN || !process.env.PROJECT_ID) {
    console.error('❌ Missing GITHUB_TOKEN or PROJECT_ID in .env file');
    process.exit(1);
  }

  try {
    const repository = new GitHubRepository({
      token: process.env.GITHUB_TOKEN,
      dependencyParser: new DependencyParser()
    });

    console.log(`📋 Fetching project: ${process.env.PROJECT_ID}`);
    const projectData = await repository.fetchProject(process.env.PROJECT_ID);
    
    console.log(`\n✅ Found ${projectData.tasks.length} tasks\n`);
    
    // Collect all unique labels
    const allLabels = new Set();
    const labelStats = {};
    
    // Analyze first 10 tasks in detail
    console.log('📊 DETAILED ANALYSIS OF FIRST 10 TASKS:');
    console.log('=' .repeat(80));
    
    projectData.tasks.slice(0, 10).forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.title}`);
      console.log(`   🏷️  Labels: ${task.labels.length > 0 ? task.labels.join(', ') : '(no labels)'}`);
      console.log(`   🔗 URL: ${task.githubUrl}`);
      
      // Add to stats
      task.labels.forEach(label => {
        allLabels.add(label);
        labelStats[label] = (labelStats[label] || 0) + 1;
      });
    });
    
    // Count labels across ALL tasks
    console.log('\n\n📈 LABEL STATISTICS ACROSS ALL TASKS:');
    console.log('=' .repeat(80));
    
    projectData.tasks.forEach(task => {
      task.labels.forEach(label => {
        allLabels.add(label);
        labelStats[label] = (labelStats[label] || 0) + 1;
      });
    });
    
    // Sort by frequency
    const sortedLabels = Object.entries(labelStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20); // Top 20 labels
    
    console.log('\nTop labels by frequency:');
    sortedLabels.forEach(([label, count]) => {
      const percentage = ((count / projectData.tasks.length) * 100).toFixed(1);
      console.log(`   ${label}: ${count} tasks (${percentage}%)`);
    });
    
    // Check for your expected labels
    console.log('\n\n🎯 CHECKING FOR YOUR EXPECTED LABELS:');
    console.log('=' .repeat(80));
    
    const expectedLabels = ['HCD', 'Engineering', 'Accessibility', 'a11y', 'Product'];
    expectedLabels.forEach(expected => {
      const count = labelStats[expected] || 0;
      const found = count > 0;
      console.log(`   ${expected}: ${found ? '✅' : '❌'} (${count} tasks)`);
    });
    
    console.log('\n\n🔍 ALL UNIQUE LABELS IN PROJECT:');
    console.log('=' .repeat(80));
    console.log([...allLabels].sort().join(', '));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.error('💡 Check your GITHUB_TOKEN permissions');
    }
  }
}

debugLabels();