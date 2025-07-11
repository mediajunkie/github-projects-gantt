import ProjectFetcher from '../../../src/application/ProjectFetcher';
import Task from '../../../src/domain/Task';
import Timeline from '../../../src/domain/Timeline';

describe('ProjectFetcher', () => {
  let fetcher;
  let mockRepository;
  let mockTimeline;

  beforeEach(() => {
    mockRepository = {
      fetchProject: jest.fn()
    };
    
    mockTimeline = {
      adjustForDependencies: jest.fn(),
      calculateCriticalPath: jest.fn().mockReturnValue(['task1', 'task2']),
      calculateDuration: jest.fn().mockReturnValue(0.5), // 0.5 weeks
      workingDaysPerWeek: 5
    };
    
    fetcher = new ProjectFetcher({
      repository: mockRepository,
      timeline: mockTimeline
    });
  });

  describe('fetchAndProcessProject', () => {
    it('should fetch and process project successfully', async () => {
      const mockProjectData = {
        id: 'PROJECT_ID',
        title: 'Test Project',
        tasks: [
          {
            id: 'task1',
            title: 'First Task',
            githubUrl: 'https://github.com/org/repo/issues/1',
            number: 1,
            state: 'OPEN',
            body: 'First task body',
            assignee: 'user1',
            labels: ['Engineering'],
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            storyPoints: 8,
            dependencies: []
          },
          {
            id: 'task2',
            title: 'Second Task',
            githubUrl: 'https://github.com/org/repo/issues/2',
            number: 2,
            state: 'OPEN',
            body: 'Second task body',
            assignee: 'user2',
            labels: ['Product'],
            startDate: new Date('2024-01-06'),
            endDate: new Date('2024-01-10'),
            storyPoints: 5,
            dependencies: [{ type: 'finish-to-start', targetId: 'task1' }]
          }
        ]
      };

      mockRepository.fetchProject.mockResolvedValue(mockProjectData);

      const result = await fetcher.fetchAndProcessProject('PROJECT_ID');

      expect(mockRepository.fetchProject).toHaveBeenCalledWith('PROJECT_ID');
      expect(mockTimeline.adjustForDependencies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'task1' }),
          expect.objectContaining({ id: 'task2' })
        ])
      );

      expect(result).toEqual({
        project: {
          id: 'PROJECT_ID',
          title: 'Test Project',
          lastUpdated: expect.any(String)
        },
        tasks: expect.arrayContaining([
          expect.objectContaining({
            id: 'task1',
            name: 'First Task',
            start: '2024-01-01',
            end: '2024-01-05',
            progress: 0,
            dependencies: '',
            custom_class: 'engineering-task',
            github_url: 'https://github.com/org/repo/issues/1'
          }),
          expect.objectContaining({
            id: 'task2',
            name: 'Second Task',
            start: '2024-01-06',
            end: '2024-01-10',
            progress: 0,
            dependencies: 'task1',
            custom_class: 'product-task',
            github_url: 'https://github.com/org/repo/issues/2'
          })
        ]),
        criticalPath: ['task1', 'task2'],
        stats: {
          totalTasks: 2,
          completedTasks: 0,
          totalStoryPoints: 13,
          completedStoryPoints: 0,
          categories: {
            Engineering: 1,
            Product: 1
          }
        }
      });
    });

    it('should handle tasks with estimated dates from story points', async () => {
      const mockProjectData = {
        id: 'PROJECT_ID',
        title: 'Test Project',
        tasks: [
          {
            id: 'task1',
            title: 'Task without dates',
            githubUrl: 'https://github.com/org/repo/issues/1',
            number: 1,
            state: 'OPEN',
            body: 'Task without dates',
            assignee: 'user1',
            labels: ['Engineering'],
            startDate: null,
            endDate: null,
            storyPoints: 16,
            dependencies: []
          }
        ]
      };

      mockRepository.fetchProject.mockResolvedValue(mockProjectData);

      const result = await fetcher.fetchAndProcessProject('PROJECT_ID');

      // Should have estimated dates based on story points
      expect(result.tasks[0].start).toBeDefined();
      expect(result.tasks[0].end).toBeDefined();
      expect(result.tasks[0].start).not.toBeNull();
      expect(result.tasks[0].end).not.toBeNull();
    });

    it('should handle repository errors', async () => {
      mockRepository.fetchProject.mockRejectedValue(new Error('API Error'));

      await expect(fetcher.fetchAndProcessProject('PROJECT_ID')).rejects.toThrow('API Error');
    });

    it('should calculate statistics correctly', async () => {
      const mockProjectData = {
        id: 'PROJECT_ID',
        title: 'Test Project',
        tasks: [
          {
            id: 'task1',
            title: 'Completed Task',
            githubUrl: 'https://github.com/org/repo/issues/1',
            number: 1,
            state: 'CLOSED',
            body: 'Completed task',
            assignee: 'user1',
            labels: ['Engineering'],
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            storyPoints: 8,
            dependencies: []
          },
          {
            id: 'task2',
            title: 'Open Task',
            githubUrl: 'https://github.com/org/repo/issues/2',
            number: 2,
            state: 'OPEN',
            body: 'Open task',
            assignee: 'user2',
            labels: ['Engineering'],
            startDate: new Date('2024-01-06'),
            endDate: new Date('2024-01-10'),
            storyPoints: 5,
            dependencies: []
          }
        ]
      };

      mockRepository.fetchProject.mockResolvedValue(mockProjectData);

      const result = await fetcher.fetchAndProcessProject('PROJECT_ID');

      expect(result.stats).toEqual({
        totalTasks: 2,
        completedTasks: 1,
        totalStoryPoints: 13,
        completedStoryPoints: 8,
        categories: {
          Engineering: 2
        }
      });
    });
  });

  describe('estimateDatesFromStoryPoints', () => {
    it('should estimate dates for tasks without dates', () => {
      const tasks = [
        new Task({
          id: 'task1',
          title: 'Task 1',
          storyPoints: 10
        }),
        new Task({
          id: 'task2',
          title: 'Task 2',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          storyPoints: 8
        })
      ];

      fetcher.estimateDatesFromStoryPoints(tasks);

      // Task 1 should have estimated dates
      expect(tasks[0].startDate).toBeDefined();
      expect(tasks[0].endDate).toBeDefined();
      
      // Task 2 should keep its original dates
      expect(tasks[1].startDate).toEqual(new Date('2024-01-01'));
      expect(tasks[1].endDate).toEqual(new Date('2024-01-05'));
    });

    it('should handle sequential estimation', () => {
      const tasks = [
        new Task({
          id: 'task1',
          title: 'Task 1',
          storyPoints: 10
        }),
        new Task({
          id: 'task2',
          title: 'Task 2',
          storyPoints: 8,
          dependencies: [{ type: 'finish-to-start', targetId: 'task1' }]
        })
      ];

      fetcher.estimateDatesFromStoryPoints(tasks);

      // Task 2 should start after task 1
      expect(tasks[1].startDate.getTime()).toBeGreaterThan(tasks[0].endDate.getTime());
    });
  });

  describe('calculateStats', () => {
    it('should calculate project statistics', () => {
      const tasks = [
        new Task({
          id: 'task1',
          title: 'Task 1',
          labels: ['Engineering'],
          storyPoints: 8
        }),
        new Task({
          id: 'task2',
          title: 'Task 2',
          labels: ['Product'],
          storyPoints: 5
        })
      ];

      // Mock one task as completed
      tasks[0].state = 'CLOSED';

      const stats = fetcher.calculateStats(tasks);

      expect(stats).toEqual({
        totalTasks: 2,
        completedTasks: 1,
        totalStoryPoints: 13,
        completedStoryPoints: 8,
        categories: {
          Engineering: 1,
          Product: 1
        }
      });
    });
  });
});