import Task from '../domain/Task.js';
import Timeline from '../domain/Timeline.js';

export default class ProjectFetcher {
  constructor(options = {}) {
    this.repository = options.repository;
    this.timeline = options.timeline || new Timeline();
  }

  async fetchAndProcessProject(projectId) {
    // Fetch raw project data from GitHub
    const projectData = await this.repository.fetchProject(projectId);

    // Convert to domain objects
    const tasks = projectData.tasks.map(taskData => {
      const task = new Task(taskData);
      // Add dependencies from the raw data
      if (taskData.dependencies) {
        taskData.dependencies.forEach(dep => {
          task.addDependency(dep);
        });
      }
      return task;
    });

    // Estimate dates for tasks without them
    this.estimateDatesFromStoryPoints(tasks);

    // Adjust task dates based on dependencies
    this.timeline.adjustForDependencies(tasks);

    // Calculate critical path
    const criticalPath = this.timeline.calculateCriticalPath(tasks);

    // Convert to Gantt format
    const ganttTasks = tasks.map(task => task.toGanttFormat());

    // Calculate project statistics
    const stats = this.calculateStats(tasks);

    return {
      project: {
        id: projectData.id,
        title: projectData.title,
        lastUpdated: new Date().toISOString()
      },
      tasks: ganttTasks,
      criticalPath: criticalPath,
      stats: stats
    };
  }

  estimateDatesFromStoryPoints(tasks) {
    let currentDate = new Date();
    
    // Sort tasks by dependencies to estimate in order
    const sortedTasks = this.topologicalSort(tasks);
    
    for (const task of sortedTasks) {
      if (!task.startDate || !task.endDate) {
        if (task.storyPoints) {
          // Use timeline to calculate duration
          const duration = this.timeline.calculateDuration(task.storyPoints);
          const durationInDays = Math.ceil(duration * this.timeline.workingDaysPerWeek);
          
          task.startDate = new Date(currentDate.getTime());
          task.endDate = new Date(currentDate.getTime());
          task.endDate.setDate(task.endDate.getDate() + durationInDays);
          
          // Update current date for next task
          currentDate = new Date(task.endDate.getTime());
          currentDate.setDate(currentDate.getDate() + 1); // Add buffer day
        } else {
          // Default to 1 day if no story points
          task.startDate = new Date(currentDate.getTime());
          task.endDate = new Date(currentDate.getTime());
          task.endDate.setDate(task.endDate.getDate() + 1);
          
          currentDate = new Date(task.endDate.getTime());
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
  }

  topologicalSort(tasks) {
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    const visited = new Set();
    const visiting = new Set();
    const result = [];

    const visit = (task) => {
      if (visited.has(task.id)) return;
      if (visiting.has(task.id)) {
        // Circular dependency detected, skip
        return;
      }

      visiting.add(task.id);

      // Visit dependencies first
      for (const dep of task.dependencies || []) {
        const depTask = taskMap.get(dep.targetId);
        if (depTask) {
          visit(depTask);
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };

    tasks.forEach(task => visit(task));
    return result;
  }

  calculateStats(tasks) {
    const stats = {
      totalTasks: tasks.length,
      completedTasks: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      categories: {}
    };

    for (const task of tasks) {
      // Count completed tasks
      if (task.state === 'CLOSED') {
        stats.completedTasks++;
        stats.completedStoryPoints += task.storyPoints || 0;
      }

      // Sum story points
      stats.totalStoryPoints += task.storyPoints || 0;

      // Count by category
      const category = task.getCategoryFromLabels();
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }

    return stats;
  }
}