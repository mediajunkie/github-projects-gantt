export default class Timeline {
  constructor(options = {}) {
    this.teamSize = options.teamSize || 10;
    this.pointsPerPersonPerWeek = options.pointsPerPersonPerWeek || 8;
    this.velocityPerWeek = options.velocityPerWeek || (this.teamSize * this.pointsPerPersonPerWeek);
    this.workingDaysPerWeek = options.workingDaysPerWeek || 5;
  }

  calculateEndDate(storyPoints, startDate) {
    if (!storyPoints || storyPoints === 0) {
      return new Date(startDate.getTime());
    }

    const durationInWeeks = this.calculateDuration(storyPoints);
    // Convert weeks to working days
    const durationInDays = Math.round(durationInWeeks * this.workingDaysPerWeek);
    
    const endDate = new Date(startDate.getTime());
    endDate.setUTCDate(startDate.getUTCDate() + durationInDays);
    
    return endDate;
  }

  calculateDuration(storyPoints) {
    if (!storyPoints || storyPoints === 0) {
      return 0;
    }
    
    return storyPoints / this.velocityPerWeek;
  }

  adjustForDependencies(tasks) {
    // Create a map for quick task lookup
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // Process tasks in dependency order
    const processed = new Set();
    const processing = new Set();

    const processTask = (task) => {
      if (processed.has(task.id)) {
        return;
      }

      if (processing.has(task.id)) {
        throw new Error(`Circular dependency detected involving task ${task.id}`);
      }

      processing.add(task.id);

      // First, process all dependencies
      for (const dependency of task.dependencies || []) {
        const dependentTask = taskMap.get(dependency.targetId);
        if (dependentTask) {
          processTask(dependentTask);
        }
      }

      // Now adjust this task based on its dependencies
      this.adjustTaskForDependencies(task, taskMap);

      processing.delete(task.id);
      processed.add(task.id);
    };

    // Process all tasks
    tasks.forEach(task => processTask(task));
  }

  adjustTaskForDependencies(task, taskMap) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return;
    }

    let latestStart = new Date(task.startDate.getTime());
    const originalDuration = task.endDate.getTime() - task.startDate.getTime();

    for (const dependency of task.dependencies) {
      const dependentTask = taskMap.get(dependency.targetId);
      if (!dependentTask) {
        continue;
      }

      let requiredStart;
      
      switch (dependency.type) {
        case 'finish-to-start':
          // This task must start after the dependent task finishes
          requiredStart = new Date(dependentTask.endDate.getTime());
          requiredStart.setUTCDate(requiredStart.getUTCDate() + 1);
          break;
          
        case 'start-to-start':
          // This task must start when the dependent task starts
          requiredStart = new Date(dependentTask.startDate.getTime());
          break;
          
        case 'finish-to-finish':
          // This task must finish when the dependent task finishes
          requiredStart = new Date(dependentTask.endDate.getTime() - originalDuration);
          break;
          
        case 'start-to-finish':
          // This task must finish when the dependent task starts
          requiredStart = new Date(dependentTask.startDate.getTime() - originalDuration);
          break;
          
        default:
          // Default to finish-to-start
          requiredStart = new Date(dependentTask.endDate.getTime());
          requiredStart.setUTCDate(requiredStart.getUTCDate() + 1);
      }

      if (requiredStart > latestStart) {
        latestStart = requiredStart;
      }
    }

    // Update the task dates if they need to be adjusted
    if (latestStart.getTime() !== task.startDate.getTime()) {
      task.startDate = latestStart;
      task.endDate = new Date(latestStart.getTime() + originalDuration);
    }
  }

  calculateCriticalPath(tasks) {
    // Simple approach: find the longest path through the dependency graph
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // Calculate longest path to each task
    const longestPath = new Map();
    const visited = new Set();
    
    const calculateLongestPath = (taskId) => {
      if (visited.has(taskId)) {
        return longestPath.get(taskId) || [];
      }
      
      visited.add(taskId);
      const task = taskMap.get(taskId);
      
      if (!task.dependencies || task.dependencies.length === 0) {
        longestPath.set(taskId, [taskId]);
        return [taskId];
      }
      
      let longest = [];
      for (const dep of task.dependencies) {
        const depPath = calculateLongestPath(dep.targetId);
        if (depPath.length > longest.length) {
          longest = depPath;
        }
      }
      
      const fullPath = [...longest, taskId];
      longestPath.set(taskId, fullPath);
      return fullPath;
    };
    
    // Find the longest path among all tasks
    let criticalPath = [];
    tasks.forEach(task => {
      const path = calculateLongestPath(task.id);
      if (path.length > criticalPath.length) {
        criticalPath = path;
      }
    });
    
    return criticalPath;
  }
}