#!/usr/bin/env node

// Script to get GitHub Project details by project number
// Usage: GITHUB_TOKEN=your_token node scripts/get-project-by-number.js org_name project_number

async function getProjectByNumber(orgName, projectNumber) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Please set GITHUB_TOKEN environment variable');
    console.error('Usage: GITHUB_TOKEN=your_token node scripts/get-project-by-number.js org_name project_number');
    process.exit(1);
  }

  if (!orgName || !projectNumber) {
    console.error('Usage: GITHUB_TOKEN=your_token node scripts/get-project-by-number.js org_name project_number');
    console.error('Example: GITHUB_TOKEN=your_token node scripts/get-project-by-number.js department-of-veterans-affairs 1434');
    process.exit(1);
  }

  try {
    console.log(`🔍 Fetching project ${projectNumber} from ${orgName}...\n`);

    const query = `
      query($org: String!, $number: Int!) {
        organization(login: $org) {
          projectV2(number: $number) {
            id
            title
            url
            shortDescription
            public
            closed
            createdAt
            updatedAt
            items(first: 5) {
              totalCount
              nodes {
                id
                type
                content {
                  ... on Issue {
                    id
                    number
                    title
                    state
                    url
                  }
                  ... on PullRequest {
                    id
                    number
                    title
                    state
                    url
                  }
                }
              }
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
      body: JSON.stringify({ 
        query: query,
        variables: { 
          org: orgName, 
          number: parseInt(projectNumber) 
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return;
    }

    const project = data.data.organization?.projectV2;
    
    if (!project) {
      console.log(`❌ Project ${projectNumber} not found in ${orgName} organization.`);
      console.log('   Make sure the project number is correct and you have access to it.');
      return;
    }

    console.log('✅ Project found!');
    console.log(`📋 Title: ${project.title}`);
    console.log(`🆔 ID: ${project.id}`);
    console.log(`🔗 URL: ${project.url}`);
    console.log(`📝 Description: ${project.shortDescription || 'No description'}`);
    console.log(`🌍 Public: ${project.public ? 'Yes' : 'No'}`);
    console.log(`📅 Created: ${new Date(project.createdAt).toLocaleDateString()}`);
    console.log(`📅 Updated: ${new Date(project.updatedAt).toLocaleDateString()}`);
    console.log(`📊 Total items: ${project.items.totalCount}`);
    
    if (project.items.nodes.length > 0) {
      console.log('\n📝 Sample items:');
      project.items.nodes.forEach((item, index) => {
        if (item.content) {
          console.log(`   ${index + 1}. #${item.content.number} - ${item.content.title} (${item.content.state})`);
        }
      });
    }

    console.log('\n💡 To use this project, add this to your .env file:');
    console.log(`PROJECT_ID=${project.id}`);
    
  } catch (error) {
    console.error('Error fetching project:', error.message);
  }
}

// Get organization name and project number from command line arguments
const orgName = process.argv[2];
const projectNumber = process.argv[3];
getProjectByNumber(orgName, projectNumber);