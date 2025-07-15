#!/usr/bin/env node

// Script to find GitHub Classic Projects
// Usage: GITHUB_TOKEN=your_token node scripts/find-classic-projects.js [org_name]

async function findClassicProjects(orgName) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Please set GITHUB_TOKEN environment variable');
    console.error('Usage: GITHUB_TOKEN=your_token node scripts/find-classic-projects.js [org_name]');
    process.exit(1);
  }

  try {
    console.log('🔍 Searching for GitHub Classic Projects...\n');

    // Search personal projects first
    const personalQuery = `
      query {
        viewer {
          projects(first: 10) {
            nodes {
              id
              name
              url
              body
              state
            }
          }
        }
      }
    `;

    const personalResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: personalQuery })
    });

    const personalData = await personalResponse.json();
    
    if (personalData.errors) {
      console.error('GraphQL errors:', personalData.errors);
      return;
    }

    const personalProjects = personalData.data.viewer.projects.nodes;
    
    if (personalProjects.length > 0) {
      console.log('👤 Your Personal Classic Projects:');
      personalProjects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   URL: ${project.url}`);
        console.log(`   State: ${project.state}`);
        if (project.body) {
          console.log(`   Description: ${project.body}`);
        }
        console.log('');
      });
    } else {
      console.log('👤 No personal classic projects found.');
    }

    // If organization name provided, search organization projects
    if (orgName) {
      console.log(`🏢 Searching ${orgName} organization classic projects...\n`);
      
      const orgQuery = `
        query($org: String!) {
          organization(login: $org) {
            projects(first: 10) {
              nodes {
                id
                name
                url
                body
                state
              }
            }
          }
        }
      `;

      const orgResponse = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: orgQuery,
          variables: { org: orgName }
        })
      });

      const orgData = await orgResponse.json();
      
      if (orgData.errors) {
        console.error('Organization GraphQL errors:', orgData.errors);
        return;
      }

      const orgProjects = orgData.data.organization?.projects.nodes || [];
      
      if (orgProjects.length > 0) {
        console.log(`🏢 ${orgName} Organization Classic Projects:`);
        orgProjects.forEach((project, index) => {
          console.log(`${index + 1}. ${project.name}`);
          console.log(`   ID: ${project.id}`);
          console.log(`   URL: ${project.url}`);
          console.log(`   State: ${project.state}`);
          if (project.body) {
            console.log(`   Description: ${project.body}`);
          }
          console.log('');
        });
      } else {
        console.log(`🏢 No classic projects found in ${orgName} organization.`);
      }
    } else {
      console.log('💡 To search organization projects, run:');
      console.log('   GITHUB_TOKEN=your_token node scripts/find-classic-projects.js your-org-name');
      console.log('');
    }

    console.log('⚠️  WARNING: This application is built for GitHub Projects v2.');
    console.log('   Classic Projects have a different API structure.');
    console.log('   You may need to migrate to Projects v2 or modify the code.');
    console.log('');
    console.log('💡 To create a new Projects v2:');
    console.log('   1. Go to github.com/your-org/projects');
    console.log('   2. Click "New project"');
    console.log('   3. Choose "Table" or "Board" view');
    console.log('   4. Import your issues from the classic project');
    
  } catch (error) {
    console.error('Error fetching projects:', error.message);
  }
}

// Get organization name from command line arguments
const orgName = process.argv[2];
findClassicProjects(orgName);