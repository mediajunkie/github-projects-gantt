class GitHubGanttApp {
  constructor() {
    this.gantt = null;
    this.currentView = "Week";
    this.tasks = [];
    this.filteredTasks = [];
    this.lastUpdated = null;
    this.cacheManager = new CacheManager();
    this.allCategories = new Set();
    this.allAssignees = new Set();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadData();
  }

  setupEventListeners() {
    // View mode buttons
    document
      .getElementById("view-day")
      .addEventListener("click", () => this.changeView("Day"));
    document
      .getElementById("view-week")
      .addEventListener("click", () => this.changeView("Week"));
    document
      .getElementById("view-month")
      .addEventListener("click", () => this.changeView("Month"));
    document
      .getElementById("view-quarter")
      .addEventListener("click", () => this.changeView("Quarter"));

    // Refresh button
    document
      .getElementById("refresh")
      .addEventListener("click", () => this.loadData());

    // Jump to today button
    document
      .getElementById("jump-to-today")
      .addEventListener("click", () => this.jumpToToday());

    // Cache management buttons
    document
      .getElementById("clear-cache")
      .addEventListener("click", () => this.clearCache());
    document
      .getElementById("cache-stats")
      .addEventListener("click", () => this.showCacheStats());

    // Filter and sort buttons
    document
      .getElementById("apply-filters")
      .addEventListener("click", () => this.applyFilters());
    document
      .getElementById("reset-filters")
      .addEventListener("click", () => this.resetFilters());

    // Test colors button
    document
      .getElementById("test-colors")
      .addEventListener("click", () => this.applyColorsManually());
  }

  changeView(viewMode) {
    this.currentView = viewMode;

    // Update active button
    document.querySelectorAll(".controls button").forEach((btn) => {
      btn.classList.remove("active");
    });

    const viewButtons = {
      Day: "view-day",
      Week: "view-week",
      Month: "view-month",
      Quarter: "view-quarter",
    };

    document.getElementById(viewButtons[viewMode]).classList.add("active");

    // Re-render gantt if it exists
    if (this.gantt && this.tasks.length > 0) {
      this.renderGantt();
    }
  }

  async loadData() {
    try {
      console.log("=== LOADING DATA ===");
      this.updateStatus("Loading project data...");

      // Use cache manager for multi-layer caching
      const data = await this.cacheManager.fetchWithCache("tasks.json");

      this.tasks = data.tasks || [];
      this.lastUpdated = data.lastUpdated;

      console.log("Loaded tasks:", this.tasks.length);
      console.log("First few tasks:", this.tasks.slice(0, 3));

      // Debug: Log task date ranges
      const taskDates = this.tasks
        .map((t) => new Date(t.start))
        .filter((d) => !isNaN(d));
      if (taskDates.length > 0) {
        const minDate = new Date(Math.min(...taskDates));
        const maxDate = new Date(Math.max(...taskDates));
        console.log(
          `Task date range: ${minDate.toDateString()} to ${maxDate.toDateString()}`
        );
        console.log(`Total tasks with valid dates: ${taskDates.length}`);
      }

      this.updateStatus(
        `Loaded ${this.tasks.length} tasks. Last updated: ${this.formatDate(
          this.lastUpdated
        )}. Scroll the chart to see all tasks.`
      );

      this.extractFilterOptions();
      this.populateFilterDropdowns();
      this.applyFilters();
    } catch (error) {
      console.error("Error loading data:", error);
      this.loadSampleData();
    }
  }

  loadSampleData() {
    this.updateStatus(
      "Using sample data - GitHub Actions workflow not yet configured"
    );

    // Generate sample tasks that demonstrate the features
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    this.tasks = [
      {
        id: "design-system",
        name: "Design System Updates",
        start: this.formatDateString(startDate),
        end: this.formatDateString(this.addDays(startDate, 14)),
        progress: 75,
        dependencies: "",
        custom_class: "hcd-task",
        github_url: "https://github.com/example/repo/issues/1",
      },
      {
        id: "api-integration",
        name: "GitHub API Integration",
        start: this.formatDateString(this.addDays(startDate, 7)),
        end: this.formatDateString(this.addDays(startDate, 21)),
        progress: 30,
        dependencies: "design-system",
        custom_class: "engineering-task",
        github_url: "https://github.com/example/repo/issues/2",
      },
      {
        id: "user-testing",
        name: "User Testing & Feedback",
        start: this.formatDateString(this.addDays(startDate, 14)),
        end: this.formatDateString(this.addDays(startDate, 28)),
        progress: 0,
        dependencies: "",
        custom_class: "product-task",
        github_url: "https://github.com/example/repo/issues/3",
      },
      {
        id: "accessibility-audit",
        name: "Accessibility Audit",
        start: this.formatDateString(this.addDays(startDate, 21)),
        end: this.formatDateString(this.addDays(startDate, 35)),
        progress: 0,
        dependencies: "api-integration",
        custom_class: "accessibility-task",
        github_url: "https://github.com/example/repo/issues/4",
      },
      {
        id: "content-review",
        name: "Content Review & Updates",
        start: this.formatDateString(this.addDays(startDate, 10)),
        end: this.formatDateString(this.addDays(startDate, 24)),
        progress: 50,
        dependencies: "",
        custom_class: "content-task",
        github_url: "https://github.com/example/repo/issues/5",
      },
      {
        id: "deployment",
        name: "Production Deployment",
        start: this.formatDateString(this.addDays(startDate, 35)),
        end: this.formatDateString(this.addDays(startDate, 42)),
        progress: 0,
        dependencies: "accessibility-audit,content-review",
        custom_class: "engineering-task",
        github_url: "https://github.com/example/repo/issues/6",
      },
    ];
  }

  groupTasksByDiscipline(tasks) {
    const disciplineGroups = {
      HCD: [],
      Engineering: [],
      Product: [],
      Accessibility: [],
      Content: [],
      General: [],
    };

    // Group tasks by their discipline
    tasks.forEach((task) => {
      const discipline = this.getDisciplineFromTask(task);
      if (disciplineGroups[discipline]) {
        disciplineGroups[discipline].push(task);
      } else {
        disciplineGroups["General"].push(task);
      }
    });

    // Create grouped tasks for Gantt
    const groupedTasks = [];

    Object.entries(disciplineGroups).forEach(([discipline, tasks]) => {
      if (tasks.length === 0) return;

      // Sort tasks by start date
      tasks.sort((a, b) => new Date(a.start) - new Date(b.start));

      // Find overall date range for this discipline
      const startDates = tasks
        .map((t) => new Date(t.start))
        .filter((d) => !isNaN(d));
      const endDates = tasks
        .map((t) => new Date(t.end))
        .filter((d) => !isNaN(d));

      if (startDates.length === 0 || endDates.length === 0) return;

      const earliestStart = new Date(Math.min(...startDates));
      const latestEnd = new Date(Math.max(...endDates));

      // Calculate average progress
      const avgProgress = Math.round(
        tasks.reduce((sum, task) => sum + (task.progress || 0), 0) /
          tasks.length
      );

      // Create a grouped task
      const groupedTask = {
        id: `${discipline.toLowerCase()}-group`,
        name: `${discipline} (${tasks.length} tasks)`,
        start: this.formatDateString(earliestStart),
        end: this.formatDateString(latestEnd),
        progress: avgProgress,
        dependencies: "",
        custom_class: `${discipline.toLowerCase().replace(/\s+/g, "-")}-task`,
        github_url: null,
        _subtasks: tasks, // Store original tasks for popup
        _isGroup: true,
      };

      groupedTasks.push(groupedTask);
    });

    return groupedTasks;
  }

  getDisciplineFromTask(task) {
    if (!task.custom_class) return "General";

    const classMap = {
      "hcd-task": "HCD",
      "engineering-task": "Engineering",
      "product-task": "Product",
      "accessibility-task": "Accessibility",
      "content-task": "Content",
      "general-task": "General",
    };

    return classMap[task.custom_class] || "General";
  }

  applyColorsManually() {
    console.log("=== APPLYING COLORS MANUALLY ===");
    const colorMap = {
      "hcd-task": "#6f42c1",
      "engineering-task": "#28a745",
      "product-task": "#0366d6",
      "accessibility-task": "#f66a0a",
      "content-task": "#d73a49",
      "general-task": "#6a737d",
    };

    const tasksToRender =
      this.filteredTasks.length > 0 ? this.filteredTasks : this.tasks;
    console.log("Tasks being rendered:", tasksToRender.length);
    console.log(
      "Sample task classes:",
      tasksToRender.slice(0, 5).map((t) => t.custom_class)
    );

    // Multiple attempts to apply colors with different timing
    const applyColors = () => {
      // Method 1: Target bar-wrapper elements
      const barElements = document.querySelectorAll("#gantt .bar-wrapper");
      console.log(`Found ${barElements.length} bar elements`);

      barElements.forEach((barWrapper, index) => {
        if (index < tasksToRender.length) {
          const task = tasksToRender[index];
          const color = colorMap[task.custom_class] || "#6a737d";

          // Find all rect elements within this bar wrapper
          const rects = barWrapper.querySelectorAll("rect");
          rects.forEach((rect) => {
            rect.style.fill = color;
            rect.setAttribute("fill", color);
          });

          // Also add CSS class for additional styling
          barWrapper.classList.add(task.custom_class || "general-task");

          console.log(
            `Applied ${color} to task: ${task.name} (${task.custom_class})`
          );
        }
      });

      // Method 2: Target all rects directly and map by position
      const allRects = document.querySelectorAll("#gantt rect");
      console.log(`Found ${allRects.length} total rects`);

      // Only apply if we have a reasonable number of rects
      if (allRects.length >= tasksToRender.length) {
        allRects.forEach((rect, index) => {
          if (index < tasksToRender.length) {
            const task = tasksToRender[index];
            const color = colorMap[task.custom_class] || "#6a737d";
            rect.style.fill = color;
            rect.setAttribute("fill", color);
          }
        });
      }

      // Method 3: Try to find elements by data attributes
      tasksToRender.forEach((task, index) => {
        const color = colorMap[task.custom_class] || "#6a737d";
        const taskElement = document.querySelector(`[data-id="${task.id}"]`);
        if (taskElement) {
          const rects = taskElement.querySelectorAll("rect");
          rects.forEach((rect) => {
            rect.style.fill = color;
            rect.setAttribute("fill", color);
          });
        }
      });
    };

    // Try immediately
    applyColors();

    // Try again after a short delay
    setTimeout(applyColors, 100);

    // Try again after Frappe Gantt has fully rendered
    setTimeout(applyColors, 500);

    // Final attempt after everything should be ready
    setTimeout(applyColors, 1000);
  }

  renderGantt() {
    console.log("=== STARTING RENDERGANTT ===");
    const tasksToRender =
      this.filteredTasks.length > 0 ? this.filteredTasks : this.tasks;

    console.log("Tasks to render:", tasksToRender.length);

    if (tasksToRender.length === 0) {
      console.log("No tasks to display");
      document.getElementById("gantt").innerHTML =
        '<div class="loading">No tasks to display</div>';
      return;
    }

    // Check if Gantt is defined before using it
    if (typeof Gantt === "undefined") {
      console.error("Gantt library not loaded yet");
      document.getElementById("gantt").innerHTML =
        '<div class="error">Error rendering Gantt chart: Gantt is not defined</div>';
      return;
    }

    console.log("Gantt library is defined, proceeding with render");

    try {
      // Clear the container before rendering
      document.getElementById("gantt").innerHTML = "";

      // Group tasks by discipline
      const groupedTasks = this.groupTasksByDiscipline(tasksToRender);

      // Log first few tasks to see their structure
      console.log("Sample tasks:", tasksToRender.slice(0, 3));
      console.log("Grouped tasks:", groupedTasks);

      console.log("Creating Gantt instance...");
      this.gantt = new Gantt("#gantt", groupedTasks, {
        view_mode: this.currentView,
        bar_height: 30,
        arrow_curve: 5,
        padding: 18,
        popup: (task) => this.createPopup(task),
        on_click: (task) => this.onTaskClick(task),
        on_date_change: (task, start, end) =>
          this.onDateChange(task, start, end),
        on_progress_change: (task, progress) =>
          this.onProgressChange(task, progress),
        on_view_change: (mode) => this.onViewChange(mode),
        date_format: "YYYY-MM-DD",
        language: "en",
      });

      console.log("Gantt instance created successfully");

      // Debug: Log the actual DOM structure and apply colors manually
      setTimeout(() => {
        console.log("=== DEBUGGING GANTT DOM ===");
        const ganttContainer = document.getElementById("gantt");
        console.log("Gantt container:", ganttContainer);
        console.log(
          "Gantt container innerHTML length:",
          ganttContainer.innerHTML.length
        );

        const allElements = ganttContainer.querySelectorAll("*");
        console.log("Total elements in gantt:", allElements.length);

        const rects = ganttContainer.querySelectorAll("rect");
        console.log("Found rect elements:", rects.length);

        const svgs = ganttContainer.querySelectorAll("svg");
        console.log("Found SVG elements:", svgs.length);

        if (rects.length > 0) {
          console.log("First 5 rects:");
          for (let i = 0; i < Math.min(5, rects.length); i++) {
            const rect = rects[i];
            console.log(`Rect ${i}:`, {
              className: rect.className,
              classList: rect.classList,
              fill: rect.getAttribute("fill"),
              style: rect.style.fill,
              parentElement:
                rect.parentElement.className || rect.parentElement.tagName,
            });
          }
        } else {
          console.log(
            "No rect elements found - checking what IS in the container:"
          );
          console.log(
            "Container HTML:",
            ganttContainer.innerHTML.substring(0, 500)
          );
        }

        // Apply colors manually if CSS isn't working
        this.applyColorsManually();
      }, 500);
    } catch (error) {
      console.error("Error rendering Gantt chart:", error);
      console.error("Error details:", error.stack);
      document.getElementById("gantt").innerHTML =
        '<div class="error">Error rendering Gantt chart: ' +
        error.message +
        "</div>";
    }
  }

  createPopup(task) {
    const progress = task.progress || 0;
    const startDate = this.formatDate(task.start);
    const endDate = this.formatDate(task.end);

    // Handle grouped tasks differently
    if (task._isGroup && task._subtasks) {
      const subtaskList = task._subtasks
        .map((subtask) => {
          const subtaskProgress = subtask.progress || 0;
          return `<li>${subtask.name} (${subtaskProgress}%)</li>`;
        })
        .join("");

      return `
        <div class="popup-content">
          <h3>${task.name}</h3>
          <p><strong>Progress:</strong> ${progress}%</p>
          <p><strong>Start:</strong> ${startDate}</p>
          <p><strong>End:</strong> ${endDate}</p>
          <p><strong>Tasks:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px; max-height: 200px; overflow-y: auto;">
            ${subtaskList}
          </ul>
        </div>
      `;
    }

    return `
      <div class="popup-content">
        <h3>${task.name}</h3>
        <p><strong>Progress:</strong> ${progress}%</p>
        <p><strong>Start:</strong> ${startDate}</p>
        <p><strong>End:</strong> ${endDate}</p>
        ${
          task.github_url
            ? `<p><a href="${task.github_url}" target="_blank">View on GitHub</a></p>`
            : ""
        }
      </div>
    `;
  }

  onTaskClick(task) {
    // For grouped tasks, don't open a URL (they don't have one)
    if (task._isGroup) {
      // Could implement a drill-down view here in the future
      console.log("Clicked on group:", task.name);
      return;
    }

    if (task.github_url) {
      window.open(task.github_url, "_blank");
    }
  }

  onDateChange(task, start, end) {
    console.log("Date changed:", task.name, start, end);
    // In a real implementation, this would update the GitHub issue
  }

  onProgressChange(task, progress) {
    console.log("Progress changed:", task.name, progress);
    // In a real implementation, this would update the GitHub issue
  }

  onViewChange(mode) {
    console.log("View changed to:", mode);
  }

  updateStatus(message) {
    document.getElementById("status").textContent = message;
  }

  formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async clearCache() {
    try {
      await this.cacheManager.clearCache();
      this.updateStatus("Cache cleared successfully");
      setTimeout(() => this.loadData(), 1000);
    } catch (error) {
      console.error("Error clearing cache:", error);
      this.updateStatus("Error clearing cache");
    }
  }

  async showCacheStats() {
    try {
      const stats = await this.cacheManager.getCacheStats();
      const message = `Cache Stats:
• Cache API: ${stats.cacheAPI.entries} entries (${
        stats.cacheAPI.supported ? "supported" : "not supported"
      })
• LocalStorage: ${stats.localStorage.entries} entries
• Service Worker: ${
        stats.serviceWorker.registered ? "registered" : "not registered"
      }`;

      alert(message);
    } catch (error) {
      console.error("Error getting cache stats:", error);
      alert("Error getting cache stats");
    }
  }

  extractFilterOptions() {
    this.allCategories.clear();
    this.allAssignees.clear();

    this.tasks.forEach((task) => {
      // Extract category from custom_class
      if (task.custom_class) {
        const category = task.custom_class
          .replace("-task", "")
          .replace("-", " ");
        this.allCategories.add(category.toUpperCase());
      }

      // Extract assignee (if available in task data)
      if (task.assignee) {
        this.allAssignees.add(task.assignee);
      }
    });
  }

  populateFilterDropdowns() {
    // Populate category dropdown
    const categorySelect = document.getElementById("category-filter");
    categorySelect.innerHTML = '<option value="">All Categories</option>';

    [...this.allCategories].sort().forEach((category) => {
      const option = document.createElement("option");
      option.value = category.toLowerCase();
      option.textContent = category;
      categorySelect.appendChild(option);
    });

    // Populate assignee dropdown
    const assigneeSelect = document.getElementById("assignee-filter");
    assigneeSelect.innerHTML = '<option value="">All Assignees</option>';

    [...this.allAssignees].sort().forEach((assignee) => {
      const option = document.createElement("option");
      option.value = assignee;
      option.textContent = assignee;
      assigneeSelect.appendChild(option);
    });
  }

  applyFilters() {
    const categoryFilter = document.getElementById("category-filter").value;
    const statusFilter = document.getElementById("status-filter").value;
    const assigneeFilter = document.getElementById("assignee-filter").value;
    const sortBy = document.getElementById("sort-by").value;
    const sortDirection = document.getElementById("sort-direction").value;

    // Filter tasks
    this.filteredTasks = this.tasks.filter((task) => {
      // Category filter
      if (categoryFilter && task.custom_class) {
        const taskCategory = task.custom_class
          .replace("-task", "")
          .replace("-", " ");
        if (taskCategory.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter (based on progress - 100% = closed, <100% = open)
      if (statusFilter) {
        const isCompleted = task.progress === 100;
        if (statusFilter === "closed" && !isCompleted) return false;
        if (statusFilter === "open" && isCompleted) return false;
      }

      // Assignee filter
      if (assigneeFilter && task.assignee !== assigneeFilter) {
        return false;
      }

      return true;
    });

    // Sort tasks
    this.filteredTasks.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "start":
          comparison = new Date(a.start || 0) - new Date(b.start || 0);
          break;
        case "end":
          comparison = new Date(a.end || 0) - new Date(b.end || 0);
          break;
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "progress":
          comparison = (a.progress || 0) - (b.progress || 0);
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    // Update status message
    const totalTasks = this.tasks.length;
    const filteredCount = this.filteredTasks.length;

    if (filteredCount < totalTasks) {
      this.updateStatus(
        `Showing ${filteredCount} of ${totalTasks} tasks (filtered)`
      );
    } else {
      this.updateStatus(
        `Loaded ${totalTasks} tasks. Last updated: ${this.formatDate(
          this.lastUpdated
        )}`
      );
    }

    // Re-render the gantt chart
    this.renderGantt();
  }

  resetFilters() {
    // Reset all filter dropdowns
    document.getElementById("category-filter").value = "";
    document.getElementById("status-filter").value = "";
    document.getElementById("assignee-filter").value = "";
    document.getElementById("sort-by").value = "start";
    document.getElementById("sort-direction").value = "asc";

    // Apply filters to reset view
    this.applyFilters();
  }

  jumpToToday() {
    if (!this.gantt) {
      console.warn("Gantt chart not initialized");
      return;
    }

    try {
      // Get today's date
      const today = new Date();

      // Find the task closest to today
      let closestTask = null;
      let closestDistance = Infinity;

      this.tasks.forEach((task) => {
        if (task.start) {
          const taskDate = new Date(task.start);
          const distance = Math.abs(taskDate - today);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestTask = task;
          }
        }
      });

      if (closestTask) {
        // Scroll to the closest task
        const taskElement = document.querySelector(
          `[data-id="${closestTask.id}"]`
        );
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: "smooth", inline: "center" });
        }
      }

      console.log("Jumped to tasks near:", today.toDateString());
    } catch (error) {
      console.error("Error jumping to today:", error);
    }
  }
}

// Initialize the app when the DOM is loaded and Gantt library is available
document.addEventListener("DOMContentLoaded", () => {
  // Wait for Gantt library to load
  function waitForGantt() {
    if (typeof Gantt !== "undefined") {
      new GitHubGanttApp();
    } else {
      console.log("Waiting for Gantt library to load...");
      setTimeout(waitForGantt, 100);
    }
  }

  waitForGantt();
});
