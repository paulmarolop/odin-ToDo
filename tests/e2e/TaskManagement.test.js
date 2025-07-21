import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '../../src/modules/services/TaskService.js';
import { ProjectService } from '../../src/modules/services/ProjectService.js';
import { StorageService } from '../../src/modules/services/StorageService.js';
import { Task } from '../../src/modules/models/Task.js';
import { Project } from '../../src/modules/models/Project.js';

describe('End-to-End Task Management Workflows', () => {
  let taskService;
  let projectService;
  let storageService;
  let mockLocalStorage;

  beforeEach(() => {
    // Setup localStorage mock
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
    
    // Mock empty initial state
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Complete Task Lifecycle', () => {
    it('should handle complete task creation, editing, completion, and deletion workflow', async () => {
      // Initialize services
      await taskService.initialize();
      await projectService.initialize();
      
      // Step 1: Create a new project
      const project = await projectService.createProject('Personal Tasks');
      expect(project.name).toBe('Personal Tasks');
      
      // Step 2: Create a detailed task
      const taskData = {
        title: 'Plan vacation',
        description: 'Research destinations and book flights',
        dueDate: new Date('2024-06-15'),
        priority: 'high',
        notes: 'Consider budget constraints',
        checklist: [
          { text: 'Research destinations', completed: false },
          { text: 'Compare flight prices', completed: false },
          { text: 'Book accommodation', completed: false }
        ],
        projectId: project.id
      };
      
      const task = await taskService.createTask(taskData);
      
      // Verify task creation
      expect(task.title).toBe('Plan vacation');
      expect(task.description).toBe('Research destinations and book flights');
      expect(task.priority).toBe('high');
      expect(task.checklist).toHaveLength(3);
      expect(task.projectId).toBe(project.id);
      
      // Step 3: Edit task details
      const updates = {
        title: 'Plan summer vacation',
        description: 'Research European destinations and book flights',
        notes: 'Budget: $3000 max'
      };
      
      const updatedTask = await taskService.updateTask(task.id, updates);
      expect(updatedTask.title).toBe('Plan summer vacation');
      expect(updatedTask.description).toBe('Research European destinations and book flights');
      expect(updatedTask.notes).toBe('Budget: $3000 max');
      
      // Step 4: Work on checklist items
      const checklistItemId = task.checklist[0].id;
      await taskService.updateChecklistItem(task.id, checklistItemId, { completed: true });
      
      // Add new checklist item
      await taskService.addChecklistItem(task.id, 'Check visa requirements');
      
      // Verify checklist updates
      const taskWithUpdatedChecklist = await taskService.getTaskById(task.id);
      expect(taskWithUpdatedChecklist.checklist).toHaveLength(4);
      expect(taskWithUpdatedChecklist.checklist[0].completed).toBe(true);
      expect(taskWithUpdatedChecklist.checklist[3].text).toBe('Check visa requirements');
      
      // Step 5: Complete more checklist items
      await taskService.updateChecklistItem(task.id, task.checklist[1].id, { completed: true });
      await taskService.updateChecklistItem(task.id, task.checklist[2].id, { completed: true });
      
      // Step 6: Mark task as complete
      const completedTask = await taskService.toggleTaskCompletion(task.id);
      expect(completedTask.completed).toBe(true);
      
      // Step 7: Verify task appears in completed tasks
      const completedTasks = await taskService.getAllTasks({ completed: true });
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe(task.id);
      
      // Step 8: Get task statistics
      const stats = await taskService.getTaskStats(project.id);
      expect(stats.total).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.completionRate).toBe(100);
      
      // Step 9: Clean up completed tasks
      const cleanupResult = await taskService.clearCompletedTasks(project.id);
      expect(cleanupResult.count).toBe(1);
      
      // Verify task was removed
      const remainingTasks = await taskService.getTasksByProject(project.id);
      expect(remainingTasks).toHaveLength(0);
    });

    it('should handle task priority and due date management workflow', async () => {
      await taskService.initialize();
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - 1);
      
      // Create tasks with different priorities and due dates
      const urgentTask = await taskService.createTask({
        title: 'Urgent task',
        priority: 'high',
        dueDate: tomorrow
      });
      
      const normalTask = await taskService.createTask({
        title: 'Normal task',
        priority: 'medium',
        dueDate: nextWeek
      });
      
      const overdueTask = await taskService.createTask({
        title: 'Overdue task',
        priority: 'low',
        dueDate: pastDate
      });
      
      // Test priority filtering
      const highPriorityTasks = await taskService.getAllTasks({ priority: 'high' });
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].title).toBe('Urgent task');
      
      // Test overdue task detection
      const overdueTasks = await taskService.getOverdueTasks();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].title).toBe('Overdue task');
      expect(overdueTasks[0].isOverdue()).toBe(true);
      
      // Test due soon functionality
      const dueSoonTasks = await taskService.getTasksDueSoon(2); // Within 2 days
      expect(dueSoonTasks).toHaveLength(1);
      expect(dueSoonTasks[0].title).toBe('Urgent task');
      
      // Test sorting by priority
      const tasksByPriority = await taskService.getTasksSorted('priority', 'desc');
      expect(tasksByPriority[0].priority).toBe('high');
      expect(tasksByPriority[1].priority).toBe('medium');
      expect(tasksByPriority[2].priority).toBe('low');
      
      // Test sorting by due date
      const tasksByDueDate = await taskService.getTasksSorted('dueDate', 'asc');
      expect(tasksByDueDate[0].title).toBe('Overdue task');
      expect(tasksByDueDate[1].title).toBe('Urgent task');
      expect(tasksByDueDate[2].title).toBe('Normal task');
    });
  });

  describe('Project Management Workflows', () => {
    it('should handle complete project lifecycle with task organization', async () => {
      await taskService.initialize();
      await projectService.initialize();
      
      // Step 1: Create multiple projects
      const workProject = await projectService.createProject('Work');
      const personalProject = await projectService.createProject('Personal');
      const hobbyProject = await projectService.createProject('Hobbies');
      
      // Verify default project exists
      const defaultProject = await projectService.getDefaultProject();
      expect(defaultProject.name).toBe('Default');
      
      // Step 2: Create tasks in different projects
      const workTasks = await Promise.all([
        taskService.createTask({ title: 'Finish report', projectId: workProject.id }),
        taskService.createTask({ title: 'Team meeting', projectId: workProject.id }),
        taskService.createTask({ title: 'Code review', projectId: workProject.id })
      ]);
      
      const personalTasks = await Promise.all([
        taskService.createTask({ title: 'Grocery shopping', projectId: personalProject.id }),
        taskService.createTask({ title: 'Doctor appointment', projectId: personalProject.id })
      ]);
      
      const hobbyTasks = await Promise.all([
        taskService.createTask({ title: 'Learn guitar', projectId: hobbyProject.id })
      ]);
      
      // Step 3: Verify task distribution
      const workProjectTasks = await taskService.getTasksByProject(workProject.id);
      const personalProjectTasks = await taskService.getTasksByProject(personalProject.id);
      const hobbyProjectTasks = await taskService.getTasksByProject(hobbyProject.id);
      
      expect(workProjectTasks).toHaveLength(3);
      expect(personalProjectTasks).toHaveLength(2);
      expect(hobbyProjectTasks).toHaveLength(1);
      
      // Step 4: Move task between projects
      await taskService.moveTaskToProject(workTasks[0].id, personalProject.id);
      
      // Verify task moved
      const updatedWorkTasks = await taskService.getTasksByProject(workProject.id);
      const updatedPersonalTasks = await taskService.getTasksByProject(personalProject.id);
      
      expect(updatedWorkTasks).toHaveLength(2);
      expect(updatedPersonalTasks).toHaveLength(3);
      
      // Step 5: Get project statistics
      const allProjects = await projectService.getAllProjects();
      expect(allProjects).toHaveLength(4); // Including default project
      
      const projectStats = await projectService.getProjectStats();
      expect(projectStats.total).toBe(4);
      expect(projectStats.totalTasks).toBe(6);
      
      // Step 6: Complete some tasks
      await taskService.toggleTaskCompletion(personalTasks[0].id);
      await taskService.toggleTaskCompletion(hobbyTasks[0].id);
      
      // Step 7: Get task statistics by project
      const personalStats = await taskService.getTaskStats(personalProject.id);
      expect(personalStats.total).toBe(3);
      expect(personalStats.completed).toBe(1);
      expect(personalStats.completionRate).toBe(33);
      
      const hobbyStats = await taskService.getTaskStats(hobbyProject.id);
      expect(hobbyStats.total).toBe(1);
      expect(hobbyStats.completed).toBe(1);
      expect(hobbyStats.completionRate).toBe(100);
      
      // Step 8: Delete a project (move tasks to default)
      const tasksToMove = await taskService.getTasksByProject(hobbyProject.id);
      for (const task of tasksToMove) {
        await taskService.moveTaskToProject(task.id, defaultProject.id);
      }
      
      await projectService.deleteProject(hobbyProject.id);
      
      // Verify project deleted and tasks moved
      const remainingProjects = await projectService.getAllProjects();
      expect(remainingProjects).toHaveLength(3);
      expect(remainingProjects.every(p => p.id !== hobbyProject.id)).toBe(true);
      
      const defaultProjectTasks = await taskService.getTasksByProject(defaultProject.id);
      expect(defaultProjectTasks).toHaveLength(1);
      expect(defaultProjectTasks[0].title).toBe('Learn guitar');
    });

    it('should handle project search and filtering', async () => {
      await projectService.initialize();
      
      // Create projects with different names
      await projectService.createProject('Work Project Alpha');
      await projectService.createProject('Work Project Beta');
      await projectService.createProject('Personal Finance');
      await projectService.createProject('Health and Fitness');
      
      // Test project search
      const workProjects = await projectService.searchProjects('work');
      expect(workProjects).toHaveLength(2);
      expect(workProjects.every(p => p.name.toLowerCase().includes('work'))).toBe(true);
      
      const personalProjects = await projectService.searchProjects('personal');
      expect(personalProjects).toHaveLength(1);
      expect(personalProjects[0].name).toBe('Personal Finance');
      
      // Test project sorting
      const projectsByName = await projectService.getProjectsSorted('name', 'asc');
      expect(projectsByName[0].name).toBe('Default'); // Default project should be first
      expect(projectsByName[1].name).toBe('Health and Fitness');
      expect(projectsByName[2].name).toBe('Personal Finance');
    });
  });

  describe('Data Persistence Workflows', () => {
    it('should persist data across browser sessions', async () => {
      // Session 1: Create data
      await taskService.initialize();
      await projectService.initialize();
      
      const project = await projectService.createProject('Persistent Project');
      const task = await taskService.createTask({
        title: 'Persistent Task',
        description: 'This should survive browser restart',
        projectId: project.id,
        checklist: [
          { text: 'Item 1', completed: true },
          { text: 'Item 2', completed: false }
        ]
      });
      
      // Capture saved data
      const taskSaveCall = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'todoapp_tasks'
      );
      const projectSaveCall = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'todoapp_projects'
      );
      
      expect(taskSaveCall).toBeDefined();
      expect(projectSaveCall).toBeDefined();
      
      const savedTasks = JSON.parse(taskSaveCall[1]);
      const savedProjects = JSON.parse(projectSaveCall[1]);
      
      // Session 2: Simulate browser restart
      const newTaskService = new TaskService();
      const newProjectService = new ProjectService();
      
      // Mock loading saved data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') return JSON.stringify(savedTasks);
        if (key === 'todoapp_projects') return JSON.stringify(savedProjects);
        return null;
      });
      
      await newTaskService.initialize();
      await newProjectService.initialize();
      
      // Verify data was restored
      const restoredTasks = await newTaskService.getAllTasks();
      const restoredProjects = await newProjectService.getAllProjects();
      
      expect(restoredTasks).toHaveLength(1);
      expect(restoredTasks[0].title).toBe('Persistent Task');
      expect(restoredTasks[0].description).toBe('This should survive browser restart');
      expect(restoredTasks[0].checklist).toHaveLength(2);
      expect(restoredTasks[0].checklist[0].completed).toBe(true);
      
      expect(restoredProjects.some(p => p.name === 'Persistent Project')).toBe(true);
      
      // Verify relationships are maintained
      const projectTask = restoredTasks.find(t => t.title === 'Persistent Task');
      const taskProject = restoredProjects.find(p => p.name === 'Persistent Project');
      expect(projectTask.projectId).toBe(taskProject.id);
    });

    it('should handle data corruption and recovery', async () => {
      await taskService.initialize();
      
      // Create some initial data
      await taskService.createTask({ title: 'Valid Task 1' });
      await taskService.createTask({ title: 'Valid Task 2' });
      
      // Simulate data corruption
      const corruptedData = [
        { title: 'Valid Task 1' }, // Valid
        { /* missing title */ }, // Invalid
        { title: 'Valid Task 2' }, // Valid
        { title: '', completed: 'not-boolean' } // Invalid
      ];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') return JSON.stringify(corruptedData);
        return null;
      });
      
      // Create new service instance to simulate restart
      const newTaskService = new TaskService();
      await newTaskService.initialize();
      
      // Should load only valid tasks
      const tasks = await newTaskService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Valid Task 1');
      expect(tasks[1].title).toBe('Valid Task 2');
    });

    it('should handle storage quota exceeded gracefully', async () => {
      await taskService.initialize();
      
      // Mock quota exceeded error
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      // Should still be able to create tasks using fallback
      const task = await taskService.createTask({ title: 'Fallback Task' });
      expect(task).toBeInstanceOf(Task);
      
      // Verify fallback storage is active
      expect(storageService.isUsingFallback()).toBe(true);
      expect(storageService.isQuotaExceeded()).toBe(true);
      
      // Should be able to perform all operations
      await taskService.updateTask(task.id, { title: 'Updated Fallback Task' });
      const updatedTask = await taskService.getTaskById(task.id);
      expect(updatedTask.title).toBe('Updated Fallback Task');
      
      await taskService.deleteTask(task.id);
      const deletedTask = await taskService.getTaskById(task.id);
      expect(deletedTask).toBeNull();
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle team collaboration scenario', async () => {
      await taskService.initialize();
      await projectService.initialize();
      
      // Create team project
      const teamProject = await projectService.createProject('Team Sprint');
      
      // Create tasks for different team members
      const tasks = await Promise.all([
        taskService.createTask({
          title: 'Design user interface',
          description: 'Create mockups for new feature',
          priority: 'high',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          projectId: teamProject.id,
          checklist: [
            { text: 'Research user needs', completed: false },
            { text: 'Create wireframes', completed: false },
            { text: 'Design high-fidelity mockups', completed: false }
          ]
        }),
        taskService.createTask({
          title: 'Implement backend API',
          description: 'Create REST endpoints for new feature',
          priority: 'high',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
          projectId: teamProject.id,
          checklist: [
            { text: 'Design database schema', completed: false },
            { text: 'Implement CRUD operations', completed: false },
            { text: 'Add authentication', completed: false },
            { text: 'Write API tests', completed: false }
          ]
        }),
        taskService.createTask({
          title: 'Write documentation',
          description: 'Document new feature for users',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          projectId: teamProject.id,
          checklist: [
            { text: 'Write user guide', completed: false },
            { text: 'Create API documentation', completed: false },
            { text: 'Record demo video', completed: false }
          ]
        })
      ]);
      
      // Simulate progress over time
      // Day 1: Start design work
      await taskService.updateChecklistItem(tasks[0].id, tasks[0].checklist[0].id, { completed: true });
      
      // Day 2: Continue design, start backend
      await taskService.updateChecklistItem(tasks[0].id, tasks[0].checklist[1].id, { completed: true });
      await taskService.updateChecklistItem(tasks[1].id, tasks[1].checklist[0].id, { completed: true });
      
      // Day 3: Complete design, continue backend
      await taskService.updateChecklistItem(tasks[0].id, tasks[0].checklist[2].id, { completed: true });
      await taskService.toggleTaskCompletion(tasks[0].id); // Design complete
      await taskService.updateChecklistItem(tasks[1].id, tasks[1].checklist[1].id, { completed: true });
      
      // Day 4: Continue backend, start documentation
      await taskService.updateChecklistItem(tasks[1].id, tasks[1].checklist[2].id, { completed: true });
      await taskService.updateChecklistItem(tasks[2].id, tasks[2].checklist[0].id, { completed: true });
      
      // Check project progress
      const projectStats = await taskService.getTaskStats(teamProject.id);
      expect(projectStats.total).toBe(3);
      expect(projectStats.completed).toBe(1);
      expect(projectStats.completionRate).toBe(33);
      
      // Get overdue tasks (should be none yet)
      const overdueTasks = await taskService.getOverdueTasks(teamProject.id);
      expect(overdueTasks).toHaveLength(0);
      
      // Get high priority tasks
      const highPriorityTasks = await taskService.getAllTasks({ 
        priority: 'high', 
        projectId: teamProject.id 
      });
      expect(highPriorityTasks).toHaveLength(2);
      
      // Complete remaining tasks
      await taskService.updateChecklistItem(tasks[1].id, tasks[1].checklist[3].id, { completed: true });
      await taskService.toggleTaskCompletion(tasks[1].id);
      
      await taskService.updateChecklistItem(tasks[2].id, tasks[2].checklist[1].id, { completed: true });
      await taskService.updateChecklistItem(tasks[2].id, tasks[2].checklist[2].id, { completed: true });
      await taskService.toggleTaskCompletion(tasks[2].id);
      
      // Final project stats
      const finalStats = await taskService.getTaskStats(teamProject.id);
      expect(finalStats.total).toBe(3);
      expect(finalStats.completed).toBe(3);
      expect(finalStats.completionRate).toBe(100);
    });

    it('should handle personal productivity workflow', async () => {
      await taskService.initialize();
      await projectService.initialize();
      
      // Create personal organization system
      const projects = await Promise.all([
        projectService.createProject('Work'),
        projectService.createProject('Health'),
        projectService.createProject('Learning'),
        projectService.createProject('Home')
      ]);
      
      // Create daily/weekly tasks
      const dailyTasks = await Promise.all([
        taskService.createTask({
          title: 'Morning exercise',
          projectId: projects[1].id, // Health
          priority: 'high',
          checklist: [
            { text: '20 min cardio', completed: false },
            { text: '10 min stretching', completed: false }
          ]
        }),
        taskService.createTask({
          title: 'Review daily goals',
          projectId: projects[0].id, // Work
          priority: 'medium'
        }),
        taskService.createTask({
          title: 'Read for 30 minutes',
          projectId: projects[2].id, // Learning
          priority: 'medium'
        })
      ]);
      
      const weeklyTasks = await Promise.all([
        taskService.createTask({
          title: 'Grocery shopping',
          projectId: projects[3].id, // Home
          priority: 'medium',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          checklist: [
            { text: 'Make shopping list', completed: false },
            { text: 'Check pantry inventory', completed: false },
            { text: 'Visit grocery store', completed: false }
          ]
        }),
        taskService.createTask({
          title: 'Weekly team meeting prep',
          projectId: projects[0].id, // Work
          priority: 'high',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          checklist: [
            { text: 'Review last week progress', completed: false },
            { text: 'Prepare status update', completed: false },
            { text: 'List blockers and questions', completed: false }
          ]
        })
      ]);
      
      // Simulate daily routine
      // Complete morning exercise
      await taskService.updateChecklistItem(dailyTasks[0].id, dailyTasks[0].checklist[0].id, { completed: true });
      await taskService.updateChecklistItem(dailyTasks[0].id, dailyTasks[0].checklist[1].id, { completed: true });
      await taskService.toggleTaskCompletion(dailyTasks[0].id);
      
      // Complete daily goal review
      await taskService.toggleTaskCompletion(dailyTasks[1].id);
      
      // Partial reading progress
      await taskService.updateTask(dailyTasks[2].id, { 
        notes: 'Read chapter 3 of productivity book' 
      });
      
      // Work on weekly tasks
      await taskService.updateChecklistItem(weeklyTasks[1].id, weeklyTasks[1].checklist[0].id, { completed: true });
      await taskService.updateChecklistItem(weeklyTasks[1].id, weeklyTasks[1].checklist[1].id, { completed: true });
      
      // Check progress by project
      const healthStats = await taskService.getTaskStats(projects[1].id);
      expect(healthStats.completionRate).toBe(100);
      
      const workStats = await taskService.getTaskStats(projects[0].id);
      expect(workStats.completed).toBe(1);
      expect(workStats.pending).toBe(1);
      
      // Get tasks due soon
      const dueSoonTasks = await taskService.getTasksDueSoon(3);
      expect(dueSoonTasks).toHaveLength(2);
      expect(dueSoonTasks.some(t => t.title === 'Weekly team meeting prep')).toBe(true);
      expect(dueSoonTasks.some(t => t.title === 'Grocery shopping')).toBe(true);
      
      // Complete urgent task
      await taskService.updateChecklistItem(weeklyTasks[1].id, weeklyTasks[1].checklist[2].id, { completed: true });
      await taskService.toggleTaskCompletion(weeklyTasks[1].id);
      
      // Get overall productivity stats
      const overallStats = await taskService.getTaskStats();
      expect(overallStats.total).toBe(5);
      expect(overallStats.completed).toBe(3);
      expect(overallStats.completionRate).toBe(60);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from service failures during complex operations', async () => {
      await taskService.initialize();
      await projectService.initialize();
      
      // Create initial data
      const project = await projectService.createProject('Recovery Test');
      const task = await taskService.createTask({
        title: 'Test Task',
        projectId: project.id,
        checklist: [
          { text: 'Item 1', completed: false },
          { text: 'Item 2', completed: false }
        ]
      });
      
      // Simulate storage failure during update
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage write failed');
      });
      
      // Operations should fail gracefully
      await expect(taskService.updateTask(task.id, { title: 'Updated Task' }))
        .rejects.toThrow();
      
      // But service state should remain consistent
      const tasks = await taskService.getAllTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Task'); // Should not be updated
      
      // Restore storage functionality
      mockLocalStorage.setItem.mockImplementation(() => {});
      
      // Operations should work again
      const updatedTask = await taskService.updateTask(task.id, { title: 'Finally Updated' });
      expect(updatedTask.title).toBe('Finally Updated');
    });

    it('should handle concurrent operation conflicts', async () => {
      await taskService.initialize();
      
      // Create initial task
      const task = await taskService.createTask({ title: 'Concurrent Task' });
      
      // Simulate concurrent updates
      const updatePromises = [
        taskService.updateTask(task.id, { description: 'Update 1' }),
        taskService.updateTask(task.id, { notes: 'Update 2' }),
        taskService.updateTask(task.id, { priority: 'high' })
      ];
      
      // All updates should complete
      const results = await Promise.all(updatePromises);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Task);
      });
      
      // Final task should have all updates
      const finalTask = await taskService.getTaskById(task.id);
      expect(finalTask.description).toBe('Update 1');
      expect(finalTask.notes).toBe('Update 2');
      expect(finalTask.priority).toBe('high');
    });
  });
});