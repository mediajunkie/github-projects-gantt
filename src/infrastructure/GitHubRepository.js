export default class GitHubRepository {
  constructor(options = {}) {
    if (!options.token) {
      throw new Error('GitHub token is required');
    }
    
    this.token = options.token;
    this.apiUrl = options.apiUrl || 'https://api.github.com/graphql';
    this.dependencyParser = options.dependencyParser;
  }

  async fetchProject(projectId) {
    const allTasks = [];
    let cursor = null;
    let hasNextPage = true;
    let projectTitle = null;

    while (hasNextPage) {
      const query = this.buildGraphQLQuery(projectId, cursor);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      const project = data.data?.node;
      if (!project) {
        throw new Error('Project not found');
      }

      // Store project title from first response
      if (!projectTitle) {
        projectTitle = project.title;
      }

      // Process tasks from this page
      const tasks = this.processProjectItems(project.items.nodes);
      allTasks.push(...tasks);

      // Check pagination
      const pageInfo = project.items?.pageInfo;
      hasNextPage = pageInfo?.hasNextPage || false;
      cursor = pageInfo?.endCursor || null;
    }

    return {
      id: projectId,
      title: projectTitle,
      tasks: allTasks
    };
  }

  buildGraphQLQuery(projectId, cursor = null) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    
    return `
      query getProject {
        node(id: "${projectId}") {
          ... on ProjectV2 {
            id
            title
            items(first: 50${afterClause}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                content {
                  ... on Issue {
                    title
                    url
                    number
                    state
                    body
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    labels(first: 10) {
                      nodes {
                        name
                        color
                      }
                    }
                  }
                  ... on DraftIssue {
                    title
                    body
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  processProjectItems(items) {
    const tasks = [];

    for (const item of items) {
      const content = item.content;
      if (!content) continue;

      const fieldData = this.parseFieldValues(item.fieldValues?.nodes || []);
      const dependencies = this.dependencyParser ? 
        this.dependencyParser.extractFromIssueBody(content.body || '') : [];

      const task = {
        id: item.id,
        title: content.title,
        githubUrl: content.url,
        number: content.number,
        state: content.state,
        body: content.body,
        assignee: content.assignees?.nodes?.[0]?.login || null,
        labels: content.labels?.nodes?.map(label => label.name) || [],
        startDate: fieldData.startDate,
        endDate: fieldData.endDate,
        storyPoints: fieldData.storyPoints,
        dependencies: dependencies
      };

      tasks.push(task);
    }

    return tasks;
  }

  parseFieldValues(fieldValues) {
    const result = {
      startDate: null,
      endDate: null,
      storyPoints: null
    };

    for (const fieldValue of fieldValues) {
      const fieldName = fieldValue.field?.name?.toLowerCase() || '';
      
      // Handle date fields
      if (fieldValue.date) {
        if (this.isStartDateField(fieldName)) {
          result.startDate = new Date(fieldValue.date);
        } else if (this.isEndDateField(fieldName)) {
          result.endDate = new Date(fieldValue.date);
        }
      }
      
      // Handle number fields
      if (fieldValue.number !== undefined) {
        if (this.isStoryPointsField(fieldName)) {
          result.storyPoints = fieldValue.number;
        }
      }
    }

    return result;
  }

  isStartDateField(fieldName) {
    const startDatePatterns = [
      'start',
      'start date',
      'begin',
      'begin date',
      'started',
      'started date'
    ];
    
    return startDatePatterns.some(pattern => 
      fieldName.includes(pattern)
    );
  }

  isEndDateField(fieldName) {
    const endDatePatterns = [
      'end',
      'end date',
      'due',
      'due date',
      'target',
      'target date',
      'finish',
      'finish date',
      'deadline'
    ];
    
    return endDatePatterns.some(pattern => 
      fieldName.includes(pattern)
    );
  }

  isStoryPointsField(fieldName) {
    const storyPointsPatterns = [
      'story points',
      'points',
      'estimate',
      'effort',
      'size'
    ];
    
    return storyPointsPatterns.some(pattern => 
      fieldName.includes(pattern)
    );
  }
}