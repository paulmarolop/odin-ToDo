import { Task } from '../models/Task.js';
import { storageService } from './StorageService.js';
import { Validation } from '../utils/Validation.js';

/**
 * TaskService handles all task-related business logic operations
 */
export class TaskService {
  constructor() {
    this._tasks = [];
    this._initialized = false;
  }

  /**
   * Initialize the service by loading existing tasks
   */
  async initialize() {
    if (this._initialized) {
      return;
    }

    try {
      this._tasks = storageService.loadTasks();
      this._initialized = true;
    } catch (error) {
      console.error('Failed to initialize TaskService:', error);
      this._tasks = [];
      this._initialized = true;
    }
  }

  /**
   * Ensure service is initialized
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    await this._ensureInitialized();

    // Validate task data
    const validation = Validation.validateTaskData(taskData);
    if (!validation.valid) {
      throw new Error(`Task validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Create new task instance
      const task = new Task(validation.data);
      
      // Add to tasks array
      this._tasks.push(task);
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId, updates) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Validate updates
    const validation = Validation.validateTaskData(updates);
    if (!validation.valid) {
      throw new Error(`Task validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Update the task
      task.update(validation.data);
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    // Find task index
    const taskIndex = this._tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    try {
      // Remove task from array
      const deletedTask = this._tasks.splice(taskIndex, 1)[0];
      
      // Persist to storage
      await this._saveTasks();
      
      return deletedTask;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Toggle task completion status
   */
  async toggleTaskCompletion(taskId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // Toggle completion
      task.toggleCompletion();
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to toggle task completion: ${error.message}`);
    }
  }

  /**
   * Get all tasks for a specific project
   */
  async getTasksByProject(projectId = 'default') {
    await this._ensureInitialized();

    // For the default project, return all tasks (master view)
    if (projectId === 'default') {
      return [...this._tasks];
    }
    
    // For other projects, filter by project ID
    return this._tasks.filter(task => task.projectId === projectId);
  }

  /**
   * Move a task to a different project
   */
  async moveTaskToProject(taskId, projectId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // Update project ID
      task.update({ projectId });
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to move task to project: ${error.message}`);
    }
  }

  /**
   * Get all tasks with optional filtering
   */
  async getAllTasks(filters = {}) {
    await this._ensureInitialized();

    let filteredTasks = [...this._tasks];

    // Filter by completion status
    if (filters.completed !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.completed === filters.completed);
    }

    // Filter by priority
    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }

    // Filter by project
    if (filters.projectId) {
      filteredTasks = filteredTasks.filter(task => task.projectId === filters.projectId);
    }

    // Filter by due date
    if (filters.dueBefore) {
      const dueDate = new Date(filters.dueBefore);
      filteredTasks = filteredTasks.filter(task => 
        task.dueDate && task.dueDate <= dueDate
      );
    }

    if (filters.dueAfter) {
      const dueDate = new Date(filters.dueAfter);
      filteredTasks = filteredTasks.filter(task => 
        task.dueDate && task.dueDate >= dueDate
      );
    }

    // Filter overdue tasks
    if (filters.overdue === true) {
      filteredTasks = filteredTasks.filter(task => task.isOverdue());
    }

    // Search by text
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.notes.toLowerCase().includes(searchTerm)
      );
    }

    return filteredTasks;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    return this._tasks.find(task => task.id === taskId) || null;
  }

  /**
   * Get tasks sorted by various criteria
   */
  async getTasksSorted(sortBy = 'createdAt', sortOrder = 'desc', projectId = null) {
    await this._ensureInitialized();

    let tasks = projectId ? 
      this._tasks.filter(task => task.projectId === projectId) : 
      [...this._tasks];

    // Sort tasks
    tasks.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.dueDate || new Date(0);
          bValue = b.dueDate || new Date(0);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'completed':
          aValue = a.completed ? 1 : 0;
          bValue = b.completed ? 1 : 0;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return tasks;
  }

  /**
   * Get task statistics for a project
   */
  async getTaskStats(projectId = null) {
    await this._ensureInitialized();

    const tasks = projectId ? 
      this._tasks.filter(task => task.projectId === projectId) : 
      this._tasks;

    const stats = {
      total: tasks.length,
      completed: tasks.filter(task => task.completed).length,
      pending: tasks.filter(task => !task.completed).length,
      overdue: tasks.filter(task => task.isOverdue()).length,
      byPriority: {
        high: tasks.filter(task => task.priority === 'high').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        low: tasks.filter(task => task.priority === 'low').length
      },
      withDueDate: tasks.filter(task => task.dueDate).length,
      withChecklist: tasks.filter(task => task.checklist.length > 0).length
    };

    stats.completionRate = stats.total > 0 ? 
      Math.round((stats.completed / stats.total) * 100) : 0;

    return stats;
  }

  /**
   * Add checklist item to a task
   */
  async addChecklistItem(taskId, itemText) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    if (!itemText || typeof itemText !== 'string' || itemText.trim() === '') {
      throw new Error('Checklist item text is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // Add checklist item
      task.addChecklistItem(itemText);
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to add checklist item: ${error.message}`);
    }
  }

  /**
   * Update checklist item in a task
   */
  async updateChecklistItem(taskId, itemId, updates) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    if (!itemId) {
      throw new Error('Checklist item ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // Update checklist item
      task.updateChecklistItem(itemId, updates);
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to update checklist item: ${error.message}`);
    }
  }

  /**
   * Remove checklist item from a task
   */
  async removeChecklistItem(taskId, itemId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    if (!itemId) {
      throw new Error('Checklist item ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // Remove checklist item
      task.removeChecklistItem(itemId);
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to remove checklist item: ${error.message}`);
    }
  }

  /**
   * Toggle checklist item completion
   */
  async toggleChecklistItem(taskId, itemId) {
    await this._ensureInitialized();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    if (!itemId) {
      throw new Error('Checklist item ID is required');
    }

    // Find the task
    const task = this._tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Find the checklist item
    const item = task.checklist.find(item => item.id === itemId);
    if (!item) {
      throw new Error('Checklist item not found');
    }

    try {
      // Toggle completion
      task.updateChecklistItem(itemId, { completed: !item.completed });
      
      // Persist to storage
      await this._saveTasks();
      
      return task;
    } catch (error) {
      throw new Error(`Failed to toggle checklist item: ${error.message}`);
    }
  }

  /**
   * Get tasks that are due soon (within specified days)
   */
  async getTasksDueSoon(days = 7, projectId = null) {
    await this._ensureInitialized();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    let tasks = projectId ? 
      this._tasks.filter(task => task.projectId === projectId) : 
      this._tasks;

    return tasks.filter(task => 
      task.dueDate && 
      !task.completed && 
      task.dueDate <= cutoffDate &&
      task.dueDate >= new Date()
    );
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(projectId = null) {
    await this._ensureInitialized();

    let tasks = projectId ? 
      this._tasks.filter(task => task.projectId === projectId) : 
      this._tasks;

    return tasks.filter(task => task.isOverdue());
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(taskIds, updates) {
    await this._ensureInitialized();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Task IDs array is required');
    }

    const updatedTasks = [];
    const errors = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.updateTask(taskId, updates);
        updatedTasks.push(task);
      } catch (error) {
        errors.push({ taskId, error: error.message });
      }
    }

    return {
      updated: updatedTasks,
      errors: errors,
      success: errors.length === 0
    };
  }

  /**
   * Bulk delete tasks
   */
  async bulkDeleteTasks(taskIds) {
    await this._ensureInitialized();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Task IDs array is required');
    }

    const deletedTasks = [];
    const errors = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.deleteTask(taskId);
        deletedTasks.push(task);
      } catch (error) {
        errors.push({ taskId, error: error.message });
      }
    }

    return {
      deleted: deletedTasks,
      errors: errors,
      success: errors.length === 0
    };
  }

  /**
   * Clear all completed tasks for a project
   */
  async clearCompletedTasks(projectId = null) {
    await this._ensureInitialized();

    const completedTasks = this._tasks.filter(task => 
      task.completed && (projectId === null || task.projectId === projectId)
    );

    if (completedTasks.length === 0) {
      return { deleted: [], count: 0 };
    }

    try {
      // Remove completed tasks
      this._tasks = this._tasks.filter(task => 
        !task.completed || (projectId !== null && task.projectId !== projectId)
      );
      
      // Persist to storage
      await this._saveTasks();
      
      return {
        deleted: completedTasks,
        count: completedTasks.length
      };
    } catch (error) {
      throw new Error(`Failed to clear completed tasks: ${error.message}`);
    }
  }

  /**
   * Private method to save tasks to storage
   */
  async _saveTasks() {
    try {
      storageService.saveTasks(this._tasks);
    } catch (error) {
      throw new Error(`Failed to save tasks to storage: ${error.message}`);
    }
  }

  /**
   * Refresh tasks from storage (useful for syncing)
   */
  async refreshFromStorage() {
    try {
      this._tasks = storageService.loadTasks();
    } catch (error) {
      console.error('Failed to refresh tasks from storage:', error);
      throw new Error(`Failed to refresh tasks: ${error.message}`);
    }
  }

  /**
   * Get service status and information
   */
  getServiceInfo() {
    return {
      initialized: this._initialized,
      taskCount: this._tasks.length,
      storageAvailable: storageService.isAvailable(),
      usingFallback: storageService.isUsingFallback()
    };
  }
}

// Export singleton instance
export const taskService = new TaskService();