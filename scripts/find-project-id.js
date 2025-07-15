#!/usr/bin/env node

// Simple script to help find GitHub Project IDs
// Usage: GITHUB_TOKEN=your_token node scripts/find-project-id.js

async function findProjects() {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Please set GITHUB_TOKEN environment variable');
    console.error('Usage: GITHUB_TOKEN=your_token node scripts/find-project-id.js');
    process.exit(1);
  }

  try {
    const query = `
      query {
        viewer {
          projectsV2(first: 10) {
            nodes {
              id
              title
              url
              shortDescription
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return;
    }

    const projects = data.data.viewer.projectsV2.nodes;
    
    if (projects.length === 0) {
      console.log('No projects found. Make sure you have GitHub Projects v2 created.');
      return;
    }

    console.log('📋 Your GitHub Projects v2:');
    console.log('');
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   URL: ${project.url}`);
      if (project.shortDescription) {
        console.log(`   Description: ${project.shortDescription}`);
      }
      console.log('');
    });

    console.log('💡 Copy the ID of the project you want to use and add it as PROJECT_ID secret in your repository.');
    
  } catch (error) {
    console.error('Error fetching projects:', error.message);
  }
}

findProjects();