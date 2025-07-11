import GitHubRepository from '../../../src/infrastructure/GitHubRepository';
import DependencyParser from '../../../src/domain/DependencyParser';

// Mock fetch for testing
global.fetch = jest.fn();

describe('GitHubRepository', () => {
  let repository;
  let mockDependencyParser;

  beforeEach(() => {
    mockDependencyParser = {
      extractFromIssueBody: jest.fn()
    };
    
    repository = new GitHubRepository({
      token: 'test-token',
      dependencyParser: mockDependencyParser
    });
    
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should create repository with required configuration', () => {
      expect(repository.token).toBe('test-token');
      expect(repository.apiUrl).toBe('https://api.github.com/graphql');
    });

    it('should throw error if no token provided', () => {
      expect(() => new GitHubRepository()).toThrow('GitHub token is required');
    });
  });

  describe('fetchProject', () => {
    it('should fetch project data successfully', async () => {
      const mockResponse = {
        data: {
          node: {
            id: 'PROJECT_ID',
            title: 'Test Project',
            items: {
              nodes: [
                {
                  id: 'ITEM_1',
                  content: {
                    title: 'Test Issue',
                    url: 'https://github.com/org/repo/issues/1',
                    number: 1,
                    state: 'OPEN',
                    body: 'This is a test issue\\n\\nDepends on #2',
                    assignees: {
                      nodes: [{ login: 'testuser' }]
                    },
                    labels: {
                      nodes: [{ name: 'Engineering', color: 'green' }]
                    }
                  },
                  fieldValues: {
                    nodes: [
                      {
                        field: { name: 'Start Date' },
                        date: '2024-01-01'
                      },
                      {
                        field: { name: 'Target Date' },
                        date: '2024-01-15'
                      },
                      {
                        field: { name: 'Story Points' },
                        number: 8
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      mockDependencyParser.extractFromIssueBody.mockReturnValue([
        { type: 'finish-to-start', targetId: '2' }
      ]);

      const result = await repository.fetchProject('PROJECT_ID');

      expect(fetch).toHaveBeenCalledWith('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('PROJECT_ID')
      });

      expect(result).toEqual({
        id: 'PROJECT_ID',
        title: 'Test Project',
        tasks: [
          {
            id: 'ITEM_1',
            title: 'Test Issue',
            githubUrl: 'https://github.com/org/repo/issues/1',
            number: 1,
            state: 'OPEN',
            body: 'This is a test issue\\n\\nDepends on #2',
            assignee: 'testuser',
            labels: ['Engineering'],
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-15'),
            storyPoints: 8,
            dependencies: [{ type: 'finish-to-start', targetId: '2' }]
          }
        ]
      });
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(repository.fetchProject('PROJECT_ID')).rejects.toThrow('GitHub API error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(repository.fetchProject('PROJECT_ID')).rejects.toThrow('Network error');
    });

    it('should handle missing project data', async () => {
      const mockResponse = {
        data: {
          node: null
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(repository.fetchProject('PROJECT_ID')).rejects.toThrow('Project not found');
    });

    it('should handle pagination', async () => {
      const mockResponse1 = {
        data: {
          node: {
            id: 'PROJECT_ID',
            title: 'Test Project',
            items: {
              pageInfo: {
                hasNextPage: true,
                endCursor: 'CURSOR_1'
              },
              nodes: [
                {
                  id: 'ITEM_1',
                  content: {
                    title: 'Test Issue 1',
                    url: 'https://github.com/org/repo/issues/1',
                    number: 1,
                    state: 'OPEN',
                    body: 'First issue',
                    assignees: { nodes: [] },
                    labels: { nodes: [] }
                  },
                  fieldValues: { nodes: [] }
                }
              ]
            }
          }
        }
      };

      const mockResponse2 = {
        data: {
          node: {
            id: 'PROJECT_ID',
            title: 'Test Project',
            items: {
              pageInfo: {
                hasNextPage: false,
                endCursor: null
              },
              nodes: [
                {
                  id: 'ITEM_2',
                  content: {
                    title: 'Test Issue 2',
                    url: 'https://github.com/org/repo/issues/2',
                    number: 2,
                    state: 'OPEN',
                    body: 'Second issue',
                    assignees: { nodes: [] },
                    labels: { nodes: [] }
                  },
                  fieldValues: { nodes: [] }
                }
              ]
            }
          }
        }
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2
        });

      mockDependencyParser.extractFromIssueBody.mockReturnValue([]);

      const result = await repository.fetchProject('PROJECT_ID');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe('Test Issue 1');
      expect(result.tasks[1].title).toBe('Test Issue 2');
    });
  });

  describe('buildGraphQLQuery', () => {
    it('should build query without cursor', () => {
      const query = repository.buildGraphQLQuery('PROJECT_ID');
      
      expect(query).toContain('PROJECT_ID');
      expect(query).toContain('first: 50');
      expect(query).not.toContain('after:');
    });

    it('should build query with cursor', () => {
      const query = repository.buildGraphQLQuery('PROJECT_ID', 'CURSOR_123');
      
      expect(query).toContain('PROJECT_ID');
      expect(query).toContain('first: 50');
      expect(query).toContain('after: "CURSOR_123"');
    });
  });

  describe('parseFieldValues', () => {
    it('should parse date fields correctly', () => {
      const fieldValues = [
        {
          field: { name: 'Start Date' },
          date: '2024-01-01'
        },
        {
          field: { name: 'Target Date' },
          date: '2024-01-15'
        },
        {
          field: { name: 'Story Points' },
          number: 8
        }
      ];

      const result = repository.parseFieldValues(fieldValues);

      expect(result).toEqual({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        storyPoints: 8
      });
    });

    it('should handle missing fields gracefully', () => {
      const fieldValues = [
        {
          field: { name: 'Unknown Field' },
          text: 'some value'
        }
      ];

      const result = repository.parseFieldValues(fieldValues);

      expect(result).toEqual({
        startDate: null,
        endDate: null,
        storyPoints: null
      });
    });

    it('should handle different field name variations', () => {
      const fieldValues = [
        {
          field: { name: 'Start' },
          date: '2024-01-01'
        },
        {
          field: { name: 'Due Date' },
          date: '2024-01-15'
        },
        {
          field: { name: 'Points' },
          number: 5
        }
      ];

      const result = repository.parseFieldValues(fieldValues);

      expect(result).toEqual({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        storyPoints: 5
      });
    });
  });
});