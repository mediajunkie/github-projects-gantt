import Task from '../../../src/domain/Task';

describe('Task', () => {
  describe('constructor', () => {
    it('should create a task with required properties', () => {
      const taskData = {
        id: '1',
        title: 'Implement authentication',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
        storyPoints: 8
      };

      const task = new Task(taskData);

      expect(task.id).toBe('1');
      expect(task.title).toBe('Implement authentication');
      expect(task.startDate).toEqual(new Date('2024-01-15'));
      expect(task.endDate).toEqual(new Date('2024-01-20'));
      expect(task.storyPoints).toBe(8);
      expect(task.dependencies).toEqual([]);
    });

    it('should handle optional properties', () => {
      const taskData = {
        id: '2',
        title: 'Design system updates',
        assignee: 'john.doe',
        labels: ['HCD', 'Priority'],
        githubUrl: 'https://github.com/org/repo/issues/123',
        progress: 30
      };

      const task = new Task(taskData);

      expect(task.assignee).toBe('john.doe');
      expect(task.labels).toEqual(['HCD', 'Priority']);
      expect(task.githubUrl).toBe('https://github.com/org/repo/issues/123');
      expect(task.progress).toBe(30);
    });
  });

  describe('addDependency', () => {
    it('should add a dependency to the task', () => {
      const task = new Task({ id: '1', title: 'Task 1' });
      const dependency = { type: 'finish-to-start', targetId: '2' };

      task.addDependency(dependency);

      expect(task.dependencies).toHaveLength(1);
      expect(task.dependencies[0]).toEqual(dependency);
    });

    it('should add multiple dependencies', () => {
      const task = new Task({ id: '1', title: 'Task 1' });
      
      task.addDependency({ type: 'finish-to-start', targetId: '2' });
      task.addDependency({ type: 'start-to-start', targetId: '3' });

      expect(task.dependencies).toHaveLength(2);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration from story points and velocity', () => {
      const task = new Task({ 
        id: '1', 
        title: 'Task 1',
        storyPoints: 16 
      });

      const duration = task.calculateDuration(8); // 8 points per week

      expect(duration).toBe(2); // 2 weeks
    });

    it('should handle fractional weeks', () => {
      const task = new Task({ 
        id: '1', 
        title: 'Task 1',
        storyPoints: 10 
      });

      const duration = task.calculateDuration(8);

      expect(duration).toBe(1.25); // 1.25 weeks
    });

    it('should return null if no story points', () => {
      const task = new Task({ id: '1', title: 'Task 1' });

      const duration = task.calculateDuration(8);

      expect(duration).toBeNull();
    });
  });

  describe('getCategoryFromLabels', () => {
    it('should extract category from labels', () => {
      const task = new Task({
        id: '1',
        title: 'Task 1',
        labels: ['HCD', 'bug', 'priority']
      });

      expect(task.getCategoryFromLabels()).toBe('HCD');
    });

    it('should prioritize known categories', () => {
      const task = new Task({
        id: '1',
        title: 'Task 1',
        labels: ['bug', 'Engineering', 'HCD']
      });

      expect(task.getCategoryFromLabels()).toBe('HCD');
    });

    it('should return default if no category labels', () => {
      const task = new Task({
        id: '1',
        title: 'Task 1',
        labels: ['bug', 'priority']
      });

      expect(task.getCategoryFromLabels()).toBe('General');
    });
  });

  describe('toGanttFormat', () => {
    it('should convert task to Frappe Gantt format', () => {
      const task = new Task({
        id: '1',
        title: 'Implement feature',
        startDate: new Date(Date.UTC(2024, 0, 15)),
        endDate: new Date(Date.UTC(2024, 0, 20)),
        progress: 50,
        labels: ['Engineering'],
        githubUrl: 'https://github.com/org/repo/issues/1'
      });

      task.addDependency({ type: 'finish-to-start', targetId: '2' });

      const ganttData = task.toGanttFormat();

      expect(ganttData).toEqual({
        id: '1',
        name: 'Implement feature',
        start: '2024-01-15',
        end: '2024-01-20',
        progress: 50,
        dependencies: '2',
        custom_class: 'engineering-task',
        github_url: 'https://github.com/org/repo/issues/1'
      });
    });

    it('should handle multiple dependencies', () => {
      const task = new Task({
        id: '1',
        title: 'Task 1',
        startDate: new Date(Date.UTC(2024, 0, 15)),
        endDate: new Date(Date.UTC(2024, 0, 20))
      });

      task.addDependency({ type: 'finish-to-start', targetId: '2' });
      task.addDependency({ type: 'finish-to-start', targetId: '3' });

      const ganttData = task.toGanttFormat();

      expect(ganttData.dependencies).toBe('2,3');
    });
  });
});