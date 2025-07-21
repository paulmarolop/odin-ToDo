import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '../../src/modules/services/TaskService.js';
import { Task } from '../../src/modules/models/Task.js';

// Mock the StorageService
vi.mock('../../src/modules/services/StorageService.js', () => ({
  storageService: {
    loadTasks: vi.fn(() => []),
    saveTasks: vi.fn(),
    isAvailable: vi.fn(() => true),
    isUsingFallback: vi.fn(() => false)
  }
}));

// Mock the Validation utility
vi.mock('../../src/modules/utils/Validation.js', () => ({
  Validation: {
    validateTaskData: vi.fn((data) => ({
      valid: true,
      errors: [],
      data: { ...data, priority: data.priority || 'medium' }
    }))
  }
}));

describe('TaskService', () => {
  let taskService;
  let mockStorageService;
  let mockValidation;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get mock references
    const { storageService } = await import('../../src/modules/services/StorageService.js');
    const { Validation } = await import('../../src/modules/utils/Validation.js');
    mockStorageService = storageService;
    mockValidation = Validation;
    
    // Create fresh service instance
    taskService = new TaskService();
  });

  describe('initialization', () => {
    it('should initialize with empty tasks array', () => {
      expect(taskService._tasks).toEqual([]);
      expect(taskService._initialized).toBe(false);
    });

    it('should load existing tasks on initialization', async () => {
      const existingTasks = [
        new Task({ title: 'Existing Task 1' }),
        new Task({ title: 'Existing Task 2' })
      ];
      mockStorageService.loadTasks.mockReturnValue(existingTasks);

      await taskService.initialize();

      expect(taskService._tasks).toEqual(existingTasks);
      expect(taskService._initialized).toBe(true);
      expect(mockStorageService.loadTasks).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockStorageService.loadTasks.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await taskService.initialize();

      expect(taskService._tasks).toEqual([]);
      expect(taskService._initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await taskService.initialize();
      mockStorageService.loadTasks.mockClear();

      await taskService.initialize();

      expect(mockStorageService.loadTasks).not.toHaveBeenCalled();
    });
  });

  describe('createTask', () => {
    beforeEach(async () => {
      await taskService.initialize();
    });

    it('should create a new task successfully', async () => {
      const taskData = { title: 'New Task', description: 'Task description' };
      
      const task = await taskService.createTask(taskData);

      expect(task).toBeInstanceOf(Task);
      expect(task.title).toBe('New Task');
      expect(taskService._tasks).toContain(task);
      expect(mockStorageService.saveTasks).toHaveBeenCalledWith(taskService._tasks);
    });

    it('should validate task data before creation', async () => {
      const taskData = { title: 'New Task' };
      
      await taskService.createTask(taskData);

      expect(mockValidation.validateTaskData).toHaveBeenCalledWith(taskData);
    });

    it('should throw error for invalid task data', async () => {
      mockValidation.validateTaskData.mockReturnValue({
        valid: false,
        errors: ['Title is required']
      });

      await expect(taskService.createTask({}))
        .rejects.toThrow('Task validation failed: Title is required');
    });

    it('should handle storage errors', async () => {
      mockStorageService.saveTasks.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(taskService.createTask({ title: 'Test Task' }))
        .rejects.toThrow('Failed to create task: Storage error');
    });
  });

  describe('updateTask', () => {
    let existingTask;

    beforeEach(async () => {
      await taskService.initialize();
      existingTask = new Task({ title: 'Existing Task' });
      taskService._tasks.push(existingTask);
    });

    it('should update an existing task successfully', async () => {
      const updates = { title: 'Updated Task', description: 'New description' };
      
      const updatedTask = await taskService.updateTask(existingTask.id, updates);

      expect(updatedTask.title).toBe('Updated Task');
      expect(updatedTask.description).toBe('New description');
      expect(mockStorageService.saveTasks).toHaveBeenCalled();
    });

    it('should throw error for missing task ID', async () => {
      await expect(taskService.updateTask(null, { title: 'Updated' }))
        .rejects.toThrow('Task ID is required');
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskService.updateTask('non-existent-id', { title: 'Updated' }))
        .rejects.toThrow('Task not found');
    });

    it('should validate updates before applying', async () => {
      const updates = { title: 'Updated Task' };
      
      await taskService.updateTask(existingTask.id, updates);

      expect(mockValidation.validateTaskData).toHaveBeenCalledWith(updates);
    });

    it('should throw error for invalid updates', async () => {
      mockValidation.validateTaskData.mockReturnValue({
        valid: false,
        errors: ['Invalid data']
      });

      await expect(taskService.updateTask(existingTask.id, { title: '' }))
        .rejects.toThrow('Task validation failed: Invalid data');
    });
  });

  describe('deleteTask', () => {
    let existingTask;

    beforeEach(async () => {
      await taskService.initialize();
      existingTask = new Task({ title: 'Task to Delete' });
      taskService._tasks.push(existingTask);
    });

    it('should delete an existing task successfully', async () => {
      const deletedTask = await taskService.deleteTask(existingTask.id);

      expect(deletedTask).toBe(existingTask);
      expect(taskService._tasks).not.toContain(existingTask);
      expect(mockStorageService.saveTasks).toHaveBeenCalled();
    });

    it('should throw error for missing task ID', async () => {
      await expect(taskService.deleteTask(null))
        .rejects.toThrow('Task ID is required');
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskService.deleteTask('non-existent-id'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('toggleTaskCompletion', () => {
    let existingTask;

    beforeEach(async () => {
      await taskService.initialize();
      existingTask = new Task({ title: 'Task to Toggle' });
      taskService._tasks.push(existingTask);
    });

    it('should toggle task completion successfully', async () => {
      const originalCompleted = existingTask.completed;
      
      const toggledTask = await taskService.toggleTaskCompletion(existingTask.id);

      expect(toggledTask.completed).toBe(!originalCompleted);
      expect(mockStorageService.saveTasks).toHaveBeenCalled();
    });

    it('should throw error for missing task ID', async () => {
      await expect(taskService.toggleTaskCompletion(null))
        .rejects.toThrow('Task ID is required');
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskService.toggleTaskCompletion('non-existent-id'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('getTasksByProject', () => {
    beforeEach(async () => {
      await taskService.initialize();
      taskService._tasks.push(
        new Task({ title: 'Task 1', projectId: 'project-1' }),
        new Task({ title: 'Task 2', projectId: 'project-2' }),
        new Task({ title: 'Task 3', projectId: 'project-1' }),
        new Task({ title: 'Task 4', projectId: 'default' })
      );
    });

    it('should return tasks for specific project', async () => {
      const tasks = await taskService.getTasksByProject('project-1');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 3');
    });

    it('should return tasks for default project when no ID provided', async () => {
      const tasks = await taskService.getTasksByProject();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 4');
    });

    it('should return empty array for non-existent project', async () => {
      const tasks = await taskService.getTasksByProject('non-existent');

      expect(tasks).toEqual([]);
    });
  });

  describe('moveTaskToProject', () => {
    let existingTask;

    beforeEach(async () => {
      await taskService.initialize();
      existingTask = new Task({ title: 'Task to Move', projectId: 'project-1' });
      taskService._tasks.push(existingTask);
    });

    it('should move task to different project successfully', async () => {
      const movedTask = await taskService.moveTaskToProject(existingTask.id, 'project-2');

      expect(movedTask.projectId).toBe('project-2');
      expect(mockStorageService.saveTasks).toHaveBeenCalled();
    });

    it('should throw error for missing task ID', async () => {
      await expect(taskService.moveTaskToProject(null, 'project-2'))
        .rejects.toThrow('Task ID is required');
    });

    it('should throw error for missing project ID', async () => {
      await expect(taskService.moveTaskToProject(existingTask.id, null))
        .rejects.toThrow('Project ID is required');
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskService.moveTaskToProject('non-existent-id', 'project-2'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('getAllTasks', () => {
    beforeEach(async () => {
      await taskService.initialize();
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

      taskService._tasks.push(
        new Task({ title: 'Completed Task', completed: true }),
        new Task({ title: 'Pending Task', completed: false }),
        new Task({ title: 'High Priority', priority: 'high' }),
        new Task({ title: 'Low Priority', priority: 'low' }),
        new Task({ title: 'Overdue Task', dueDate: pastDate }),
        new Task({ title: 'Future Task', dueDate: futureDate }),
        new Task({ title: 'Searchable Task', description: 'special content' })
      );
    });

    it('should return all tasks without filters', async () => {
      const tasks = await taskService.getAllTasks();

      expect(tasks).toHaveLength(7);
    });

    it('should filter by completion status', async () => {
      const completedTasks = await taskService.getAllTasks({ completed: true });
      const pendingTasks = await taskService.getAllTasks({ completed: false });

      expect(completedTasks).toHaveLength(1);
      expect(pendingTasks).toHaveLength(6);
    });

    it('should filter by priority', async () => {
      const highPriorityTasks = await taskService.getAllTasks({ priority: 'high' });

      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].title).toBe('High Priority');
    });

    it('should filter by search term', async () => {
      const searchResults = await taskService.getAllTasks({ search: 'special' });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Searchable Task');
    });

    it('should filter overdue tasks', async () => {
      const overdueTasks = await taskService.getAllTasks({ overdue: true });

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].title).toBe('Overdue Task');
    });
  });

  describe('getTaskById', () => {
    let existingTask;

    beforeEach(async () => {
      await taskService.initialize();
      existingTask = new Task({ title: 'Findable Task' });
      taskService._tasks.push(existingTask);
    });

    it('should return task by ID', async () => {
      const foundTask = await taskService.getTaskById(existingTask.id);

      expect(foundTask).toBe(existingTask);
    });

    it('should return null for non-existent task', async () => {
      const foundTask = await taskService.getTaskById('non-existent-id');

      expect(foundTask).toBeNull();
    });

    it('should throw error for missing task ID', async () => {
      await expect(taskService.getTaskById(null))
        .rejects.toThrow('Task ID is required');
    });
  });

  describe('getTasksSorted', () => {
    beforeEach(async () => {
      await taskService.initialize();
      const now = new Date();
      
      taskService._tasks.push(
        new Task({ title: 'B Task', createdAt: new Date(now.getTime() - 1000) }),
        new Task({ title: 'A Task', createdAt: new Date(now.getTime() - 2000) }),
        new Task({ title: 'C Task', createdAt: new Date(now.getTime()) })
      );
    });

    it('should sort tasks by title ascending', async () => {
      const sortedTasks = await taskService.getTasksSorted('title', 'asc');

      expect(sortedTasks[0].title).toBe('A Task');
      expect(sortedTasks[1].title).toBe('B Task');
      expect(sortedTasks[2].title).toBe('C Task');
    });

    it('should sort tasks by creation date descending (default)', async () => {
      const sortedTasks = await taskService.getTasksSorted();

      expect(sortedTasks[0].title).toBe('C Task');
      expect(sortedTasks[1].title).toBe('B Task');
      expect(sortedTasks[2].title).toBe('A Task');
    });

    it('should filter by project when provided', async () => {
      taskService._tasks[0].projectId = 'project-1';
      
      const sortedTasks = await taskService.getTasksSorted('title', 'asc', 'project-1');

      expect(sortedTasks).toHaveLength(1);
      expect(sortedTasks[0].title).toBe('B Task');
    });
  });

  describe('getTaskStats', () => {
    beforeEach(async () => {
      await taskService.initialize();
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      taskService._tasks.push(
        new Task({ title: 'Completed Task', completed: true }),
        new Task({ title: 'Pending Task', completed: false }),
        new Task({ title: 'High Priority', priority: 'high' }),
        new Task({ title: 'Overdue Task', dueDate: pastDate, completed: false }),
        new Task({ title: 'Task with Checklist', checklist: [{ text: 'Item', completed: false }] })
      );
    });

    it('should return correct task statistics', async () => {
      const stats = await taskService.getTaskStats();

      expect(stats.total).toBe(5);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(4);
      expect(stats.overdue).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(4);
      expect(stats.withChecklist).toBe(1);
      expect(stats.completionRate).toBe(20);
    });

    it('should filter stats by project', async () => {
      taskService._tasks[0].projectId = 'project-1';
      taskService._tasks[1].projectId = 'project-1';
      
      const stats = await taskService.getTaskStats('project-1');

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('checklist management', () => {
    let taskWithChecklist;

    beforeEach(async () => {
      await taskService.initialize();
      taskWithChecklist = new Task({ title: 'Task with Checklist' });
      taskService._tasks.push(taskWithChecklist);
    });

    describe('addChecklistItem', () => {
      it('should add checklist item successfully', async () => {
        const updatedTask = await taskService.addChecklistItem(taskWithChecklist.id, 'New item');

        expect(updatedTask.checklist).toHaveLength(1);
        expect(updatedTask.checklist[0].text).toBe('New item');
        expect(mockStorageService.saveTasks).toHaveBeenCalled();
      });

      it('should throw error for missing task ID', async () => {
        await expect(taskService.addChecklistItem(null, 'Item'))
          .rejects.toThrow('Task ID is required');
      });

      it('should throw error for empty item text', async () => {
        await expect(taskService.addChecklistItem(taskWithChecklist.id, ''))
          .rejects.toThrow('Checklist item text is required');
      });
    });

    describe('updateChecklistItem', () => {
      beforeEach(async () => {
        await taskService.addChecklistItem(taskWithChecklist.id, 'Original item');
      });

      it('should update checklist item successfully', async () => {
        const itemId = taskWithChecklist.checklist[0].id;
        
        const updatedTask = await taskService.updateChecklistItem(
          taskWithChecklist.id, 
          itemId, 
          { text: 'Updated item', completed: true }
        );

        expect(updatedTask.checklist[0].text).toBe('Updated item');
        expect(updatedTask.checklist[0].completed).toBe(true);
        expect(mockStorageService.saveTasks).toHaveBeenCalled();
      });

      it('should throw error for missing task ID', async () => {
        await expect(taskService.updateChecklistItem(null, 'item-id', { text: 'Updated' }))
          .rejects.toThrow('Task ID is required');
      });

      it('should throw error for missing item ID', async () => {
        await expect(taskService.updateChecklistItem(taskWithChecklist.id, null, { text: 'Updated' }))
          .rejects.toThrow('Checklist item ID is required');
      });
    });

    describe('removeChecklistItem', () => {
      beforeEach(async () => {
        await taskService.addChecklistItem(taskWithChecklist.id, 'Item to remove');
      });

      it('should remove checklist item successfully', async () => {
        const itemId = taskWithChecklist.checklist[0].id;
        
        const updatedTask = await taskService.removeChecklistItem(taskWithChecklist.id, itemId);

        expect(updatedTask.checklist).toHaveLength(0);
        expect(mockStorageService.saveTasks).toHaveBeenCalled();
      });

      it('should throw error for missing task ID', async () => {
        await expect(taskService.removeChecklistItem(null, 'item-id'))
          .rejects.toThrow('Task ID is required');
      });

      it('should throw error for missing item ID', async () => {
        await expect(taskService.removeChecklistItem(taskWithChecklist.id, null))
          .rejects.toThrow('Checklist item ID is required');
      });
    });

    describe('toggleChecklistItem', () => {
      beforeEach(async () => {
        await taskService.addChecklistItem(taskWithChecklist.id, 'Item to toggle');
      });

      it('should toggle checklist item completion', async () => {
        const itemId = taskWithChecklist.checklist[0].id;
        const originalCompleted = taskWithChecklist.checklist[0].completed;
        
        const updatedTask = await taskService.toggleChecklistItem(taskWithChecklist.id, itemId);

        expect(updatedTask.checklist[0].completed).toBe(!originalCompleted);
        expect(mockStorageService.saveTasks).toHaveBeenCalled();
      });
    });
  });

  describe('bulk operations', () => {
    beforeEach(async () => {
      await taskService.initialize();
      taskService._tasks.push(
        new Task({ title: 'Task 1' }),
        new Task({ title: 'Task 2' }),
        new Task({ title: 'Task 3' })
      );
    });

    describe('bulkUpdateTasks', () => {
      it('should update multiple tasks successfully', async () => {
        const taskIds = [taskService._tasks[0].id, taskService._tasks[1].id];
        const updates = { priority: 'high' };
        
        const result = await taskService.bulkUpdateTasks(taskIds, updates);

        expect(result.success).toBe(true);
        expect(result.updated).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle partial failures', async () => {
        const taskIds = [taskService._tasks[0].id, 'non-existent-id'];
        const updates = { priority: 'high' };
        
        const result = await taskService.bulkUpdateTasks(taskIds, updates);

        expect(result.success).toBe(false);
        expect(result.updated).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
      });

      it('should throw error for empty task IDs array', async () => {
        await expect(taskService.bulkUpdateTasks([], { priority: 'high' }))
          .rejects.toThrow('Task IDs array is required');
      });
    });

    describe('bulkDeleteTasks', () => {
      it('should delete multiple tasks successfully', async () => {
        const taskIds = [taskService._tasks[0].id, taskService._tasks[1].id];
        
        const result = await taskService.bulkDeleteTasks(taskIds);

        expect(result.success).toBe(true);
        expect(result.deleted).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
        expect(taskService._tasks).toHaveLength(1);
      });
    });
  });

  describe('clearCompletedTasks', () => {
    beforeEach(async () => {
      await taskService.initialize();
      taskService._tasks.push(
        new Task({ title: 'Completed Task 1', completed: true }),
        new Task({ title: 'Pending Task', completed: false }),
        new Task({ title: 'Completed Task 2', completed: true, projectId: 'project-1' })
      );
    });

    it('should clear all completed tasks', async () => {
      const result = await taskService.clearCompletedTasks();

      expect(result.count).toBe(2);
      expect(taskService._tasks).toHaveLength(1);
      expect(taskService._tasks[0].title).toBe('Pending Task');
    });

    it('should clear completed tasks for specific project', async () => {
      const result = await taskService.clearCompletedTasks('project-1');

      expect(result.count).toBe(1);
      expect(taskService._tasks).toHaveLength(2);
    });

    it('should return empty result when no completed tasks', async () => {
      // Mark all tasks as pending
      taskService._tasks.forEach(task => task.completed = false);
      
      const result = await taskService.clearCompletedTasks();

      expect(result.count).toBe(0);
      expect(result.deleted).toEqual([]);
    });
  });

  describe('service info and status', () => {
    it('should return service information', () => {
      const info = taskService.getServiceInfo();

      expect(info.initialized).toBeDefined();
      expect(info.taskCount).toBeDefined();
      expect(info.storageAvailable).toBeDefined();
      expect(info.usingFallback).toBeDefined();
    });

    it('should refresh tasks from storage', async () => {
      const newTasks = [new Task({ title: 'Refreshed Task' })];
      mockStorageService.loadTasks.mockReturnValue(newTasks);

      await taskService.refreshFromStorage();

      expect(taskService._tasks).toEqual(newTasks);
    });

    it('should handle refresh errors', async () => {
      mockStorageService.loadTasks.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(taskService.refreshFromStorage())
        .rejects.toThrow('Failed to refresh tasks: Storage error');
    });
  });
});