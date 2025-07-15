#!/usr/bin/env node

// Enhanced script to find GitHub Project IDs from organizations
// Usage: GITHUB_TOKEN=your_token node scripts/find-org-projects.js [org_name]

async function findProjects(orgName) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Please set GITHUB_TOKEN environment variable');
    console.error('Usage: GITHUB_TOKEN=your_token node scripts/find-org-projects.js [org_name]');
    process.exit(1);
  }

  try {
    console.log('🔍 Searching for GitHub Projects v2...\n');

    // First, get user's personal projects
    const personalQuery = `
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

    const personalProjects = personalData.data.viewer.projectsV2.nodes;
    
    if (personalProjects.length > 0) {
      console.log('👤 Your Personal Projects:');
      personalProjects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.title}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   URL: ${project.url}`);
        if (project.shortDescription) {
          console.log(`   Description: ${project.shortDescription}`);
        }
        console.log('');
      });
    } else {
      console.log('👤 No personal projects found.');
    }

    // If organization name provided, search organization projects
    if (orgName) {
      console.log(`🏢 Searching ${orgName} organization projects...\n`);
      
      const orgQuery = `
        query($org: String!) {
          organization(login: $org) {
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

      const orgProjects = orgData.data.organization?.projectsV2.nodes || [];
      
      if (orgProjects.length > 0) {
        console.log(`🏢 ${orgName} Organization Projects:`);
        orgProjects.forEach((project, index) => {
          console.log(`${index + 1}. ${project.title}`);
          console.log(`   ID: ${project.id}`);
          console.log(`   URL: ${project.url}`);
          if (project.shortDescription) {
            console.log(`   Description: ${project.shortDescription}`);
          }
          console.log('');
        });
      } else {
        console.log(`🏢 No projects found in ${orgName} organization.`);
      }
    } else {
      console.log('💡 To search organization projects, run:');
      console.log('   GITHUB_TOKEN=your_token node scripts/find-org-projects.js your-org-name');
      console.log('');
    }

    console.log('💡 Copy the ID of the project you want to use and add it to your .env file as PROJECT_ID.');
    
  } catch (error) {
    console.error('Error fetching projects:', error.message);
  }
}

// Get organization name from command line arguments
const orgName = process.argv[2];
findProjects(orgName);