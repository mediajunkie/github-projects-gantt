export default class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.storyPoints = data.storyPoints;
    this.assignee = data.assignee;
    this.labels = data.labels || [];
    this.githubUrl = data.githubUrl;
    this.progress = data.progress || 0;
    this.state = data.state;
    this.dependencies = [];
  }

  addDependency(dependency) {
    this.dependencies.push(dependency);
  }

  calculateDuration(velocityPerWeek) {
    if (!this.storyPoints) {
      return null;
    }
    return this.storyPoints / velocityPerWeek;
  }

  getCategoryFromLabels() {
    const categoryPriority = ['HCD', 'Engineering', 'Product', 'Accessibility', 'Content'];
    
    for (const category of categoryPriority) {
      if (this.labels.includes(category)) {
        return category;
      }
    }
    
    return 'General';
  }

  toGanttFormat() {
    const formatDate = (date) => {
      if (!date) return null;
      // Use UTC to avoid timezone issues
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const category = this.getCategoryFromLabels();
    const cssClass = category.toLowerCase().replace(/\s+/g, '-') + '-task';

    return {
      id: this.id,
      name: this.title,
      start: formatDate(this.startDate),
      end: formatDate(this.endDate),
      progress: this.progress,
      dependencies: this.dependencies.map(d => d.targetId).join(','),
      custom_class: cssClass,
      github_url: this.githubUrl
    };
  }
}