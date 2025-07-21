import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '../../src/modules/services/TaskService.js';
import { ProjectService } from '../../src/modules/services/ProjectService.js';
import { StorageService } from '../../src/modules/services/StorageService.js';
import { Task } from '../../src/modules/models/Task.js';
import { Project } from '../../src/modules/models/Project.js';

describe('Service Integration Tests', () => {
  let taskService;
  let projectService;
  let storageService;
  let mockLocalStorage;

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Create fresh service instances
    taskService = new TaskService();
    projectService = new ProjectService();
    storageService = new StorageService();
  });

  describe('TaskService and StorageService Integration', () => {
    it('should persist tasks to storage when created', async () => {
      // Mock empty initial load
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      
      const taskData = { title: 'Integration Test Task' };
      const task = await taskService.createTask(taskData);
      
      // Verify task was created
      expect(task).toBeInstanceOf(Task);
      expect(task.title).toBe('Integration Test Task');
      
      // Verify storage was called to save tasks
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Get the saved data
      const saveCall = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'todoapp_tasks'
      );
      expect(saveCall).toBeDefined();
      
      const savedTasks = JSON.parse(saveCall[1]);
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].title).toBe('Integration Test Task');
    });

    it('should load tasks from storage on initialization', async () => {
      const existingTasks = [
        new Task({ title: 'Existing Task 1' }).toJSON(),
        new Task({ title: 'Existing Task 2' }).toJSON()
      ];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') {
          return JSON.stringify(existingTasks);
        }
        return null;
      });
      
      await taskService.initialize();
      
      const tasks = await taskService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Existing Task 1');
      expect(tasks[1].title).toBe('Existing Task 2');
    });

    it('should handle storage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      
      // Should not throw error during initialization
      await expect(taskService.initialize()).resolves.not.toThrow();
      
      // Should still be able to create tasks (using fallback)
      const task = await taskService.createTask({ title: 'Test Task' });
      expect(task).toBeInstanceOf(Task);
    });

    it('should sync task operations with storage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await taskService.initialize();
      
      // Create task
      const task = await taskService.createTask({ title: 'Test Task' });
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Update task
      await taskService.updateTask(task.id, { title: 'Updated Task' });
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      
      // Delete task
      await taskService.deleteTask(task.id);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('ProjectService and StorageService Integration', () => {
    it('should persist projects to storage when created', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await projectService.initialize();
      
      const project = await projectService.createProject('Integration Test Project');
      
      expect(project).toBeInstanceOf(Project);
      expect(project.name).toBe('Integration Test Project');
      
      // Verify storage was called
      const saveCall = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'todoapp_projects'
      );
      expect(saveCall).toBeDefined();
      
      const savedProjects = JSON.parse(saveCall[1]);
      expect(savedProjects.some(p => p.name === 'Integration Test Project')).toBe(true);
    });

    it('should ensure default project exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await projectService.initialize();
      
      const projects = await projectService.getAllProjects();
      const defaultProject = projects.find(p => p.id === 'default');
      
      expect(defaultProject).toBeDefined();
      expect(defaultProject.name).toBe('Default');
    });

    it('should load existing projects from storage', async () => {
      const existingProjects = [
        Project.createDefault().toJSON(),
        new Project({ name: 'Existing Project' }).toJSON()
      ];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_projects') {
          return JSON.stringify(existingProjects);
        }
        return null;
      });
      
      await projectService.initialize();
      
      const projects = await projectService.getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects.some(p => p.name === 'Existing Project')).toBe(true);
    });
  });

  describe('TaskService and ProjectService Integration', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await taskService.initialize();
      await projectService.initialize();
    });

    it('should create tasks in specific projects', async () => {
      const project = await projectService.createProject('Test Project');
      const task = await taskService.createTask({
        title: 'Project Task',
        projectId: project.id
      });
      
      expect(task.projectId).toBe(project.id);
      
      const projectTasks = await taskService.getTasksByProject(project.id);
      expect(projectTasks).toHaveLength(1);
      expect(projectTasks[0].title).toBe('Project Task');
    });

    it('should move tasks between projects', async () => {
      const project1 = await projectService.createProject('Project 1');
      const project2 = await projectService.createProject('Project 2');
      
      const task = await taskService.createTask({
        title: 'Movable Task',
        projectId: project1.id
      });
      
      // Verify task is in project1
      let project1Tasks = await taskService.getTasksByProject(project1.id);
      expect(project1Tasks).toHaveLength(1);
      
      // Move task to project2
      await taskService.moveTaskToProject(task.id, project2.id);
      
      // Verify task moved
      project1Tasks = await taskService.getTasksByProject(project1.id);
      const project2Tasks = await taskService.getTasksByProject(project2.id);
      
      expect(project1Tasks).toHaveLength(0);
      expect(project2Tasks).toHaveLength(1);
      expect(project2Tasks[0].title).toBe('Movable Task');
    });

    it('should handle project deletion with task reassignment', async () => {
      const customProject = await projectService.createProject('Custom Project');
      const defaultProject = await projectService.getDefaultProject();
      
      // Create task in custom project
      const task = await taskService.createTask({
        title: 'Task in Custom Project',
        projectId: customProject.id
      });
      
      // Simulate moving tasks to default project before deletion
      await taskService.moveTaskToProject(task.id, defaultProject.id);
      
      // Delete custom project
      await projectService.deleteProject(customProject.id);
      
      // Verify task is now in default project
      const defaultTasks = await taskService.getTasksByProject(defaultProject.id);
      expect(defaultTasks.some(t => t.title === 'Task in Custom Project')).toBe(true);
    });

    it('should maintain data consistency across services', async () => {
      // Create project and tasks
      const project = await projectService.createProject('Consistency Test');
      
      const task1 = await taskService.createTask({
        title: 'Task 1',
        projectId: project.id
      });
      
      const task2 = await taskService.createTask({
        title: 'Task 2',
        projectId: project.id
      });
      
      // Verify tasks are in project
      const projectTasks = await taskService.getTasksByProject(project.id);
      expect(projectTasks).toHaveLength(2);
      
      // Delete one task
      await taskService.deleteTask(task1.id);
      
      // Verify consistency
      const remainingTasks = await taskService.getTasksByProject(project.id);
      expect(remainingTasks).toHaveLength(1);
      expect(remainingTasks[0].title).toBe('Task 2');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle storage quota exceeded errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Mock quota exceeded error
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      await taskService.initialize();
      
      // Should still be able to create tasks using fallback storage
      const task = await taskService.createTask({ title: 'Fallback Task' });
      expect(task).toBeInstanceOf(Task);
      
      // Verify fallback storage is being used
      expect(storageService.isUsingFallback()).toBe(true);
    });

    it('should recover from corrupted data', async () => {
      // Mock corrupted task data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') {
          return 'invalid-json';
        }
        return null;
      });
      
      // Should initialize without throwing
      await expect(taskService.initialize()).resolves.not.toThrow();
      
      // Should start with empty tasks array
      const tasks = await taskService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should handle service initialization failures', async () => {
      // Mock storage service failure
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage initialization failed');
      });
      
      // Services should still initialize
      await expect(taskService.initialize()).resolves.not.toThrow();
      await expect(projectService.initialize()).resolves.not.toThrow();
      
      // Should be able to create new data
      const task = await taskService.createTask({ title: 'Recovery Task' });
      const project = await projectService.createProject('Recovery Project');
      
      expect(task).toBeInstanceOf(Task);
      expect(project).toBeInstanceOf(Project);
    });

    it('should maintain service state during storage errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await taskService.initialize();
      
      // Create initial task
      const task = await taskService.createTask({ title: 'Initial Task' });
      
      // Mock storage failure for subsequent operations
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage write failed');
      });
      
      // Service should handle error gracefully
      await expect(taskService.updateTask(task.id, { title: 'Updated Task' }))
        .rejects.toThrow();
      
      // But service state should remain consistent
      const tasks = await taskService.getAllTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Initial Task'); // Should not be updated due to error
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data integrity across service operations', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      await projectService.initialize();
      
      // Create project
      const project = await projectService.createProject('Data Flow Test');
      
      // Create multiple tasks
      const tasks = await Promise.all([
        taskService.createTask({ title: 'Task 1', projectId: project.id }),
        taskService.createTask({ title: 'Task 2', projectId: project.id }),
        taskService.createTask({ title: 'Task 3', projectId: project.id })
      ]);
      
      // Verify all tasks are in project
      const projectTasks = await taskService.getTasksByProject(project.id);
      expect(projectTasks).toHaveLength(3);
      
      // Update tasks
      await taskService.updateTask(tasks[0].id, { completed: true });
      await taskService.updateTask(tasks[1].id, { priority: 'high' });
      
      // Verify updates
      const updatedTasks = await taskService.getTasksByProject(project.id);
      const completedTask = updatedTasks.find(t => t.id === tasks[0].id);
      const highPriorityTask = updatedTasks.find(t => t.id === tasks[1].id);
      
      expect(completedTask.completed).toBe(true);
      expect(highPriorityTask.priority).toBe('high');
      
      // Delete one task
      await taskService.deleteTask(tasks[2].id);
      
      // Verify final state
      const finalTasks = await taskService.getTasksByProject(project.id);
      expect(finalTasks).toHaveLength(2);
      expect(finalTasks.every(t => t.id !== tasks[2].id)).toBe(true);
    });

    it('should handle concurrent operations correctly', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      
      // Create multiple tasks concurrently
      const taskPromises = Array.from({ length: 5 }, (_, i) =>
        taskService.createTask({ title: `Concurrent Task ${i + 1}` })
      );
      
      const tasks = await Promise.all(taskPromises);
      
      // Verify all tasks were created
      expect(tasks).toHaveLength(5);
      tasks.forEach((task, i) => {
        expect(task.title).toBe(`Concurrent Task ${i + 1}`);
      });
      
      // Verify tasks are in storage
      const allTasks = await taskService.getAllTasks();
      expect(allTasks).toHaveLength(5);
    });

    it('should preserve data relationships during operations', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      await projectService.initialize();
      
      // Create project hierarchy
      const workProject = await projectService.createProject('Work');
      const personalProject = await projectService.createProject('Personal');
      
      // Create tasks with relationships
      const workTask = await taskService.createTask({
        title: 'Work Task',
        projectId: workProject.id,
        checklist: [
          { text: 'Subtask 1', completed: false },
          { text: 'Subtask 2', completed: true }
        ]
      });
      
      const personalTask = await taskService.createTask({
        title: 'Personal Task',
        projectId: personalProject.id,
        dueDate: new Date('2024-12-31')
      });
      
      // Verify relationships are maintained
      const workTasks = await taskService.getTasksByProject(workProject.id);
      const personalTasks = await taskService.getTasksByProject(personalProject.id);
      
      expect(workTasks).toHaveLength(1);
      expect(personalTasks).toHaveLength(1);
      
      expect(workTasks[0].checklist).toHaveLength(2);
      expect(personalTasks[0].dueDate).toBeInstanceOf(Date);
      
      // Move task between projects
      await taskService.moveTaskToProject(workTask.id, personalProject.id);
      
      // Verify relationships are preserved
      const updatedPersonalTasks = await taskService.getTasksByProject(personalProject.id);
      const movedTask = updatedPersonalTasks.find(t => t.id === workTask.id);
      
      expect(movedTask.checklist).toHaveLength(2);
      expect(movedTask.projectId).toBe(personalProject.id);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      await projectService.initialize();
      
      // Create multiple projects
      const projects = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          projectService.createProject(`Project ${i + 1}`)
        )
      );
      
      // Create many tasks across projects
      const taskPromises = [];
      projects.forEach((project, projectIndex) => {
        for (let i = 0; i < 20; i++) {
          taskPromises.push(
            taskService.createTask({
              title: `Task ${i + 1} in Project ${projectIndex + 1}`,
              projectId: project.id,
              priority: ['high', 'medium', 'low'][i % 3]
            })
          );
        }
      });
      
      const tasks = await Promise.all(taskPromises);
      
      // Verify all tasks were created
      expect(tasks).toHaveLength(200);
      
      // Test filtering performance
      const highPriorityTasks = await taskService.getAllTasks({ priority: 'high' });
      expect(highPriorityTasks.length).toBeGreaterThan(0);
      
      // Test project-specific queries
      const project1Tasks = await taskService.getTasksByProject(projects[0].id);
      expect(project1Tasks).toHaveLength(20);
    });

    it('should handle bulk operations efficiently', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await taskService.initialize();
      
      // Create initial tasks
      const tasks = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          taskService.createTask({ title: `Bulk Task ${i + 1}` })
        )
      );
      
      // Bulk update
      const taskIds = tasks.slice(0, 25).map(t => t.id);
      const bulkUpdateResult = await taskService.bulkUpdateTasks(taskIds, {
        priority: 'high'
      });
      
      expect(bulkUpdateResult.updated).toHaveLength(25);
      expect(bulkUpdateResult.errors).toHaveLength(0);
      
      // Bulk delete
      const deleteIds = tasks.slice(25, 50).map(t => t.id);
      const bulkDeleteResult = await taskService.bulkDeleteTasks(deleteIds);
      
      expect(bulkDeleteResult.deleted).toHaveLength(25);
      expect(bulkDeleteResult.errors).toHaveLength(0);
      
      // Verify final state
      const remainingTasks = await taskService.getAllTasks();
      expect(remainingTasks).toHaveLength(25);
      expect(remainingTasks.every(t => t.priority === 'high')).toBe(true);
    });
  });
});