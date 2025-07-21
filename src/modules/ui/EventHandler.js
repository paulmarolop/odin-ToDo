import { taskService } from '../services/TaskService.js';
import { projectService } from '../services/ProjectService.js';

/**
 * EventHandler manages all user interaction events for the ToDo application
 */
export class EventHandler {
  constructor(domRenderer) {
    this.domRenderer = domRenderer;
    this.currentProjectId = 'default';
    this.initialized = false;
    this.appController = null;
  }

  /**
   * Initialize all event listeners
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    this.bindTaskEvents();
    this.bindProjectEvents();
    this.bindFormEvents();
    this.bindGlobalEvents();

    this.initialized = true;
  }

  /**
   * Bind task-related event listeners
   */
  bindTaskEvents() {
    // Task completion toggle
    document.addEventListener('change', async (e) => {
      if (e.target.classList.contains('task-checkbox')) {
        await this.handleTaskToggle(e);
      }
    });

    // Task detail expansion
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('task-title') && e.target.classList.contains('clickable')) {
        await this.handleTaskDetailToggle(e);
      }
    });

    // Task edit button
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('task-edit-btn') || e.target.closest('.task-edit-btn')) {
        await this.handleTaskEdit(e);
      }
    });

    // Task delete button
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('task-delete-btn') || e.target.closest('.task-delete-btn')) {
        await this.handleTaskDelete(e);
      }
    });

    // Checklist item toggle
    document.addEventListener('change', async (e) => {
      if (e.target.classList.contains('checklist-checkbox')) {
        await this.handleChecklistItemToggle(e);
      }
    });

    // Add task button
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.handleAddTask();
      });
    }
  }

  /**
   * Handle task completion toggle
   */
  async handleTaskToggle(event) {
    const taskId = event.target.getAttribute('data-task-id');
    if (!taskId) {
      console.error('Task ID not found for toggle');
      return;
    }

    try {
      // Show loading state
      event.target.disabled = true;

      // Toggle task completion
      const updatedTask = await taskService.toggleTaskCompletion(taskId);

      // Update task display
      this.domRenderer.updateTaskDisplay(updatedTask);

      // Update project task counts
      await this.updateProjectTaskCounts();

    } catch (error) {
      console.error('Failed to toggle task:', error);
      
      // Revert checkbox state
      event.target.checked = !event.target.checked;
      
      // Show error message
      this.showErrorMessage('Failed to update task. Please try again.');
    } finally {
      event.target.disabled = false;
    }
  }

  /**
   * Handle task detail expansion/collapse
   */
  async handleTaskDetailToggle(event) {
    const taskId = event.target.getAttribute('data-task-id');
    if (!taskId) {
      console.error('Task ID not found for detail toggle');
      return;
    }

    try {
      // Get task data
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Toggle task details display
      this.domRenderer.renderTaskDetails(task);

    } catch (error) {
      console.error('Failed to toggle task details:', error);
      this.showErrorMessage('Failed to load task details.');
    }
  }

  /**
   * Handle task edit
   */
  async handleTaskEdit(event) {
    const button = event.target.closest('.task-edit-btn');
    const taskId = button.getAttribute('data-task-id');
    
    if (!taskId) {
      console.error('Task ID not found for edit');
      return;
    }

    try {
      // Get task data
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Get all projects for form
      const projects = await projectService.getAllProjects();

      // Show task form with existing data
      this.domRenderer.renderTaskForm(task, projects);

    } catch (error) {
      console.error('Failed to edit task:', error);
      this.showErrorMessage('Failed to load task for editing.');
    }
  }

  /**
   * Handle task deletion
   */
  async handleTaskDelete(event) {
    const button = event.target.closest('.task-delete-btn');
    const taskId = button.getAttribute('data-task-id');
    
    if (!taskId) {
      console.error('Task ID not found for delete');
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      // Show loading state
      button.disabled = true;
      button.textContent = 'Deleting...';

      // Delete task
      await taskService.deleteTask(taskId);

      // Refresh task list
      await this.refreshTaskList();

      // Update project task counts
      await this.updateProjectTaskCounts();

      // Show success message
      this.showSuccessMessage('Task deleted successfully.');

    } catch (error) {
      console.error('Failed to delete task:', error);
      this.showErrorMessage('Failed to delete task. Please try again.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<span class="btn-icon">🗑️</span><span class="btn-text">Delete</span>';
    }
  }

  /**
   * Handle checklist item toggle
   */
  async handleChecklistItemToggle(event) {
    const taskId = event.target.getAttribute('data-task-id');
    const itemId = event.target.getAttribute('data-item-id');
    
    if (!taskId || !itemId) {
      console.error('Task ID or item ID not found for checklist toggle');
      return;
    }

    try {
      // Show loading state
      event.target.disabled = true;

      // Toggle checklist item
      const updatedTask = await taskService.toggleChecklistItem(taskId, itemId);

      // Update task display
      this.domRenderer.updateTaskDisplay(updatedTask);

    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
      
      // Revert checkbox state
      event.target.checked = !event.target.checked;
      
      this.showErrorMessage('Failed to update checklist item.');
    } finally {
      event.target.disabled = false;
    }
  }

  /**
   * Handle add task button click
   */
  async handleAddTask() {
    try {
      // Get all projects for form
      const projects = await projectService.getAllProjects();

      // Show empty task form
      this.domRenderer.renderTaskForm(null, projects);

    } catch (error) {
      console.error('Failed to show add task form:', error);
      this.showErrorMessage('Failed to open task form.');
    }
  }

  /**
   * Set current project ID
   */
  setCurrentProject(projectId) {
    this.currentProjectId = projectId || 'default';
  }

  /**
   * Get current project ID
   */
  getCurrentProject() {
    return this.currentProjectId;
  }

  /**
   * Set reference to main application controller
   */
  setAppController(appController) {
    this.appController = appController;
  }

  /**
   * Refresh task list for current project
   */
  async refreshTaskList() {
    try {
      const tasks = await taskService.getTasksByProject(this.currentProjectId);
      this.domRenderer.renderTaskList(tasks, this.currentProjectId);
    } catch (error) {
      console.error('Failed to refresh task list:', error);
      this.domRenderer.showError('Failed to load tasks');
    }
  }

  /**
   * Update project task counts
   */
  async updateProjectTaskCounts() {
    try {
      const projects = await projectService.getAllProjects();
      
      // Update task counts for each project
      for (const project of projects) {
        const tasks = await taskService.getTasksByProject(project.id);
        await projectService.updateProjectTaskCount(project.id, tasks.length);
      }

      // Refresh project list display
      const updatedProjects = await projectService.getAllProjects();
      this.domRenderer.renderProjectList(updatedProjects, this.currentProjectId);

    } catch (error) {
      console.error('Failed to update project task counts:', error);
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Create or update message element
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    // Create or update message element
    this.showMessage(message, 'error');
  }

  /**
   * Show message with specified type
   */
  showMessage(message, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.app-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `app-message ${type}`;
    messageElement.textContent = message;

    // Add to page
    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
      appHeader.parentNode.insertBefore(messageElement, appHeader.nextSibling);
    } else {
      document.body.insertBefore(messageElement, document.body.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 5000);
  }

  /**
   * Bind project-related event listeners
   */
  bindProjectEvents() {
    // Project selection change
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', async (e) => {
        await this.handleProjectSwitch(e.target.value);
      });
    }

    // Add project button
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        this.handleAddProject();
      });
    }

    // Project item click (sidebar navigation)
    document.addEventListener('click', async (e) => {
      if (e.target.closest('.project') && !e.target.closest('.project-delete-btn')) {
        const projectElement = e.target.closest('.project');
        const projectId = projectElement.getAttribute('data-project-id');
        if (projectId) {
          await this.handleProjectSwitch(projectId);
        }
      }
    });

    // Project delete button
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('project-delete-btn') || e.target.closest('.project-delete-btn')) {
        await this.handleProjectDelete(e);
      }
    });
  }

  /**
   * Handle project switching
   */
  async handleProjectSwitch(projectId) {
    if (!projectId || projectId === this.currentProjectId) {
      return;
    }

    try {
      // Use app controller's state management if available
      if (this.appController) {
        await this.appController.handleProjectSwitch(projectId);
      } else {
        // Fallback to direct handling
        this.setCurrentProject(projectId);

        // Update project select
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
          projectSelect.value = projectId;
        }

        // Refresh task list for new project
        await this.refreshTaskList();

        // Update project list display (highlight active project)
        const projects = await projectService.getAllProjects();
        this.domRenderer.renderProjectList(projects, projectId);
      }

    } catch (error) {
      console.error('Failed to switch project:', error);
      this.showErrorMessage('Failed to switch project.');
    }
  }

  /**
   * Handle add project
   */
  handleAddProject() {
    try {
      this.domRenderer.renderProjectForm();
    } catch (error) {
      console.error('Failed to show add project form:', error);
      this.showErrorMessage('Failed to open project form.');
    }
  }

  /**
   * Handle project deletion
   */
  async handleProjectDelete(event) {
    const button = event.target.closest('.project-delete-btn');
    const projectId = button.getAttribute('data-project-id');
    
    if (!projectId) {
      console.error('Project ID not found for delete');
      return;
    }

    if (projectId === 'default') {
      this.showErrorMessage('Cannot delete the default project.');
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this project? All tasks will be moved to the Default project.')) {
      return;
    }

    try {
      // Show loading state
      button.disabled = true;
      button.textContent = '...';

      // Move all tasks from this project to default project
      const tasks = await taskService.getTasksByProject(projectId);
      for (const task of tasks) {
        await taskService.moveTaskToProject(task.id, 'default');
      }

      // Delete the project
      await projectService.deleteProject(projectId);

      // Switch to default project if we were viewing the deleted project
      if (this.currentProjectId === projectId) {
        await this.handleProjectSwitch('default');
      }

      // Refresh project list
      await this.refreshProjectList();

      // Update task counts
      await this.updateProjectTaskCounts();

      this.showSuccessMessage('Project deleted successfully.');

    } catch (error) {
      console.error('Failed to delete project:', error);
      this.showErrorMessage('Failed to delete project. Please try again.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<span class="btn-icon">×</span>';
    }
  }

  /**
   * Bind form-related event listeners
   */
  bindFormEvents() {
    // Task form submission
    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'task-form') {
        e.preventDefault();
        await this.handleTaskFormSubmit(e);
      }
    });

    // Project form submission
    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'project-form') {
        e.preventDefault();
        await this.handleProjectFormSubmit(e);
      }
    });

    // Form cancellation
    document.addEventListener('click', (e) => {
      if (e.target.id === 'cancel-task') {
        this.domRenderer.hideTaskForm();
      }
      if (e.target.id === 'cancel-project') {
        this.domRenderer.hideProjectForm();
      }
    });

    // Real-time form validation
    document.addEventListener('input', (e) => {
      if (e.target.form && (e.target.form.id === 'task-form' || e.target.form.id === 'project-form')) {
        this.handleFormFieldValidation(e);
      }
    });

    // Add checklist item button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'add-checklist-item') {
        this.domRenderer._addChecklistItemToForm();
      }
    });
  }

  /**
   * Handle task form submission
   */
  async handleTaskFormSubmit(event) {
    const form = event.target;
    const taskId = form.getAttribute('data-task-id');
    const isEditing = !!taskId;

    try {
      // Clear previous errors
      this.domRenderer.clearAllFormErrors();

      // Get form data
      const formData = this.domRenderer.getTaskFormData();
      
      // Validate form data
      if (!this.validateTaskForm(formData)) {
        return;
      }

      // Show loading state
      const submitBtn = document.getElementById('save-task');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';
      }

      let task;
      if (isEditing) {
        // Update existing task
        task = await taskService.updateTask(taskId, formData);
        this.showSuccessMessage('Task updated successfully.');
      } else {
        // Create new task
        formData.projectId = this.currentProjectId;
        task = await taskService.createTask(formData);
        this.showSuccessMessage('Task created successfully.');
      }

      // Hide form
      this.domRenderer.hideTaskForm();

      // Refresh task list
      await this.refreshTaskList();

      // Update project task counts
      await this.updateProjectTaskCounts();

    } catch (error) {
      console.error('Failed to save task:', error);
      this.showErrorMessage(error.message || 'Failed to save task. Please try again.');
    } finally {
      // Reset submit button
      const submitBtn = document.getElementById('save-task');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Task';
      }
    }
  }

  /**
   * Handle project form submission
   */
  async handleProjectFormSubmit(event) {
    const form = event.target;

    try {
      // Clear previous errors
      this.domRenderer.clearAllFormErrors();

      // Get form data
      const formData = this.domRenderer.getProjectFormData();
      
      // Validate form data
      if (!this.validateProjectForm(formData)) {
        return;
      }

      // Show loading state
      const submitBtn = document.getElementById('save-project');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
      }

      // Create new project
      const project = await projectService.createProject(formData.name);

      // Hide form
      this.domRenderer.hideProjectForm();

      // Refresh project list
      await this.refreshProjectList();

      // Switch to new project
      await this.handleProjectSwitch(project.id);

      this.showSuccessMessage('Project created successfully.');

    } catch (error) {
      console.error('Failed to create project:', error);
      
      if (error.message.includes('already exists')) {
        this.domRenderer.showFormError('project-name', 'A project with this name already exists.');
      } else {
        this.showErrorMessage(error.message || 'Failed to create project. Please try again.');
      }
    } finally {
      // Reset submit button
      const submitBtn = document.getElementById('save-project');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Project';
      }
    }
  }

  /**
   * Handle real-time form field validation
   */
  handleFormFieldValidation(event) {
    const field = event.target;
    const fieldName = field.name || field.id.replace('task-', '').replace('project-', '');

    // Clear existing error for this field
    this.domRenderer.clearFormError(fieldName);

    // Validate specific fields
    if (fieldName === 'title' || fieldName === 'name') {
      if (field.value.trim() === '') {
        this.domRenderer.showFormError(fieldName, 'This field is required.');
      } else if (field.value.length > 200) {
        this.domRenderer.showFormError(fieldName, 'Maximum 200 characters allowed.');
      }
    }

    if (fieldName === 'dueDate' && field.value) {
      const selectedDate = new Date(field.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        this.domRenderer.showFormError(fieldName, 'Due date cannot be in the past.');
      }
    }
  }

  /**
   * Validate task form data
   */
  validateTaskForm(formData) {
    let isValid = true;

    // Required fields
    if (!formData.title || formData.title.trim() === '') {
      this.domRenderer.showFormError('title', 'Task title is required.');
      isValid = false;
    }

    // Field length limits
    if (formData.title && formData.title.length > 200) {
      this.domRenderer.showFormError('title', 'Title must be 200 characters or less.');
      isValid = false;
    }

    if (formData.description && formData.description.length > 1000) {
      this.domRenderer.showFormError('description', 'Description must be 1000 characters or less.');
      isValid = false;
    }

    if (formData.notes && formData.notes.length > 1000) {
      this.domRenderer.showFormError('notes', 'Notes must be 1000 characters or less.');
      isValid = false;
    }

    // Due date validation
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        this.domRenderer.showFormError('dueDate', 'Due date cannot be in the past.');
        isValid = false;
      }
    }

    // Priority validation
    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      this.domRenderer.showFormError('priority', 'Please select a valid priority.');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validate project form data
   */
  validateProjectForm(formData) {
    let isValid = true;

    // Required fields
    if (!formData.name || formData.name.trim() === '') {
      this.domRenderer.showFormError('project-name', 'Project name is required.');
      isValid = false;
    }

    // Field length limits
    if (formData.name && formData.name.length > 100) {
      this.domRenderer.showFormError('project-name', 'Project name must be 100 characters or less.');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Bind global event listeners
   */
  bindGlobalEvents() {
    // Detect keyboard usage for enhanced focus indicators
    this.setupKeyboardDetection();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Modal background click to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        if (e.target.id === 'task-modal') {
          this.domRenderer.hideTaskForm();
          this.announceToScreenReader('Task form closed');
        }
        if (e.target.id === 'project-modal') {
          this.domRenderer.hideProjectForm();
          this.announceToScreenReader('Project form closed');
        }
      }
    });

    // Message dismissal
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('app-message')) {
        e.target.remove();
      }
    });

    // Focus management for modals
    this.setupModalFocusManagement();
  }

  /**
   * Setup keyboard detection for enhanced focus indicators
   */
  setupKeyboardDetection() {
    let isKeyboardUser = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        isKeyboardUser = true;
        document.body.classList.add('keyboard-user');
      }
    });

    document.addEventListener('mousedown', () => {
      if (isKeyboardUser) {
        isKeyboardUser = false;
        document.body.classList.remove('keyboard-user');
      }
    });
  }

  /**
   * Handle comprehensive keyboard navigation
   */
  handleKeyboardNavigation(e) {
    // Global keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      this.handleAddTask();
      this.announceToScreenReader('Opening new task form');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      this.handleAddProject();
      this.announceToScreenReader('Opening new project form');
      return;
    }

    // Escape to close modals
    if (e.key === 'Escape') {
      const taskModal = document.getElementById('task-modal');
      const projectModal = document.getElementById('project-modal');
      
      if (taskModal && !taskModal.classList.contains('hidden')) {
        this.domRenderer.hideTaskForm();
        this.announceToScreenReader('Task form closed');
        return;
      }
      
      if (projectModal && !projectModal.classList.contains('hidden')) {
        this.domRenderer.hideProjectForm();
        this.announceToScreenReader('Project form closed');
        return;
      }
    }

    // Task list navigation
    if (document.activeElement && document.activeElement.classList.contains('task')) {
      this.handleTaskKeyboardNavigation(e);
    }

    // Project list navigation
    if (document.activeElement && document.activeElement.classList.contains('project')) {
      this.handleProjectKeyboardNavigation(e);
    }

    // Form navigation enhancements
    if (e.target.form) {
      this.handleFormKeyboardNavigation(e);
    }
  }

  /**
   * Handle keyboard navigation within tasks
   */
  handleTaskKeyboardNavigation(e) {
    const currentTask = document.activeElement;
    const taskId = currentTask.getAttribute('data-task-id');

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Toggle task details
        this.handleTaskDetailToggle({ target: currentTask.querySelector('.task-title') });
        break;

      case 'e':
        e.preventDefault();
        // Edit task
        this.handleTaskEdit({ target: currentTask.querySelector('.task-edit-btn') });
        this.announceToScreenReader('Opening task for editing');
        break;

      case 'Delete':
      case 'd':
        e.preventDefault();
        // Delete task
        this.handleTaskDelete({ target: currentTask.querySelector('.task-delete-btn') });
        break;

      case 'c':
        e.preventDefault();
        // Toggle completion
        const checkbox = currentTask.querySelector('.task-checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.focusNextTask(currentTask);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.focusPreviousTask(currentTask);
        break;
    }
  }

  /**
   * Handle keyboard navigation within projects
   */
  handleProjectKeyboardNavigation(e) {
    const currentProject = document.activeElement;
    const projectId = currentProject.getAttribute('data-project-id');

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Switch to project
        this.handleProjectSwitch(projectId);
        this.announceToScreenReader(`Switched to ${currentProject.querySelector('.project-name').textContent} project`);
        break;

      case 'Delete':
      case 'd':
        if (projectId !== 'default') {
          e.preventDefault();
          // Delete project
          this.handleProjectDelete({ target: currentProject.querySelector('.project-delete-btn') });
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.focusNextProject(currentProject);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.focusPreviousProject(currentProject);
        break;
    }
  }

  /**
   * Handle form keyboard navigation enhancements
   */
  handleFormKeyboardNavigation(e) {
    // Submit form with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const form = e.target.form;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }
  }

  /**
   * Focus next task in list
   */
  focusNextTask(currentTask) {
    const tasks = Array.from(document.querySelectorAll('.task[tabindex="0"]'));
    const currentIndex = tasks.indexOf(currentTask);
    const nextTask = tasks[currentIndex + 1];
    
    if (nextTask) {
      nextTask.focus();
      this.announceToScreenReader(`Task ${currentIndex + 2} of ${tasks.length}: ${nextTask.querySelector('.task-title').textContent}`);
    }
  }

  /**
   * Focus previous task in list
   */
  focusPreviousTask(currentTask) {
    const tasks = Array.from(document.querySelectorAll('.task[tabindex="0"]'));
    const currentIndex = tasks.indexOf(currentTask);
    const previousTask = tasks[currentIndex - 1];
    
    if (previousTask) {
      previousTask.focus();
      this.announceToScreenReader(`Task ${currentIndex} of ${tasks.length}: ${previousTask.querySelector('.task-title').textContent}`);
    }
  }

  /**
   * Focus next project in list
   */
  focusNextProject(currentProject) {
    const projects = Array.from(document.querySelectorAll('.project[tabindex="0"]'));
    const currentIndex = projects.indexOf(currentProject);
    const nextProject = projects[currentIndex + 1];
    
    if (nextProject) {
      nextProject.focus();
      this.announceToScreenReader(`Project ${currentIndex + 2} of ${projects.length}: ${nextProject.querySelector('.project-name').textContent}`);
    }
  }

  /**
   * Focus previous project in list
   */
  focusPreviousProject(currentProject) {
    const projects = Array.from(document.querySelectorAll('.project[tabindex="0"]'));
    const currentIndex = projects.indexOf(currentProject);
    const previousProject = projects[currentIndex - 1];
    
    if (previousProject) {
      previousProject.focus();
      this.announceToScreenReader(`Project ${currentIndex} of ${projects.length}: ${previousProject.querySelector('.project-name').textContent}`);
    }
  }

  /**
   * Setup modal focus management
   */
  setupModalFocusManagement() {
    // Store focus before opening modal
    let lastFocusedElement = null;

    // Task modal focus management
    const taskModal = document.getElementById('task-modal');
    if (taskModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!taskModal.classList.contains('hidden')) {
              // Modal opened
              lastFocusedElement = document.activeElement;
              this.trapFocusInModal(taskModal);
              // Focus first input
              const firstInput = taskModal.querySelector('input, textarea, select, button');
              if (firstInput) {
                firstInput.focus();
              }
            } else {
              // Modal closed
              if (lastFocusedElement) {
                lastFocusedElement.focus();
                lastFocusedElement = null;
              }
            }
          }
        });
      });
      observer.observe(taskModal, { attributes: true });
    }
  }

  /**
   * Trap focus within modal
   */
  trapFocusInModal(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);

    // Remove listener when modal is hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (modal.classList.contains('hidden')) {
            modal.removeEventListener('keydown', handleTabKey);
            observer.disconnect();
          }
        }
      });
    });
    observer.observe(modal, { attributes: true });
  }

  /**
   * Announce message to screen readers
   */
  announceToScreenReader(message) {
    const announcements = document.getElementById('announcements');
    if (announcements) {
      announcements.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        announcements.textContent = '';
      }, 1000);
    }
  }

  /**
   * Refresh project list
   */
  async refreshProjectList() {
    try {
      const projects = await projectService.getAllProjects();
      this.domRenderer.renderProjectList(projects, this.currentProjectId);
    } catch (error) {
      console.error('Failed to refresh project list:', error);
      this.domRenderer.showError('Failed to load projects', 'projects');
    }
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    const messages = document.querySelectorAll('.app-message');
    messages.forEach(message => message.remove());
  }
}