import { DateUtils } from '../utils/DateUtils.js';

/**
 * DOMRenderer handles all DOM manipulation and rendering operations
 */
export class DOMRenderer {
  constructor() {
    this.taskListContainer = null;
    this.projectListContainer = null;
    this.initialized = false;
  }

  /**
   * Initialize the renderer by caching DOM elements
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    this.taskListContainer = document.getElementById('task-list');
    this.projectListContainer = document.getElementById('project-list');
    this.projectSelect = document.getElementById('project-select');

    if (!this.taskListContainer || !this.projectListContainer || !this.projectSelect) {
      throw new Error('Required DOM elements not found');
    }

    this.initialized = true;
  }

  /**
   * Ensure renderer is initialized
   */
  _ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Render task list for current project
   */
  renderTaskList(tasks, projectId) {
    this._ensureInitialized();

    // Clear existing tasks
    this.taskListContainer.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      this._renderEmptyTaskList(projectId);
      return;
    }

    // Create task list container
    const taskList = document.createElement('div');
    taskList.className = 'tasks';

    // Render each task
    tasks.forEach(task => {
      const taskElement = this._createTaskElement(task);
      taskList.appendChild(taskElement);
    });

    this.taskListContainer.appendChild(taskList);
  }

  /**
   * Render project list for navigation
   */
  renderProjectList(projects, currentProjectId = 'default') {
    this._ensureInitialized();

    // Clear existing projects
    this.projectListContainer.innerHTML = '';

    // Clear project select options
    this.projectSelect.innerHTML = '';

    if (!projects || projects.length === 0) {
      this._renderEmptyProjectList();
      return;
    }

    // Create project list
    const projectList = document.createElement('div');
    projectList.className = 'projects';

    // Render each project
    projects.forEach(project => {
      // Create project item for sidebar
      const projectElement = this._createProjectElement(project, currentProjectId);
      projectList.appendChild(projectElement);

      // Add option to project select
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === currentProjectId;
      this.projectSelect.appendChild(option);
    });

    this.projectListContainer.appendChild(projectList);
  }

  /**
   * Render expanded task details view
   */
  renderTaskDetails(task) {
    this._ensureInitialized();

    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) {
      console.warn('Task element not found for details rendering');
      return;
    }

    // Check if details are already expanded
    const existingDetails = taskElement.querySelector('.task-details');
    if (existingDetails) {
      existingDetails.remove();
      taskElement.classList.remove('expanded');
      return;
    }

    // Create details container
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'task-details';

    // Add description if present
    if (task.description) {
      const descriptionElement = document.createElement('div');
      descriptionElement.className = 'task-description';
      descriptionElement.innerHTML = `<strong>Description:</strong> ${this._escapeHtml(task.description)}`;
      detailsContainer.appendChild(descriptionElement);
    }

    // Add notes if present
    if (task.notes) {
      const notesElement = document.createElement('div');
      notesElement.className = 'task-notes';
      notesElement.innerHTML = `<strong>Notes:</strong> ${this._escapeHtml(task.notes)}`;
      detailsContainer.appendChild(notesElement);
    }

    // Add checklist if present
    if (task.checklist && task.checklist.length > 0) {
      const checklistElement = this._createChecklistElement(task.checklist, task.id);
      detailsContainer.appendChild(checklistElement);
    }

    // Add creation and update dates
    const datesElement = document.createElement('div');
    datesElement.className = 'task-dates';
    datesElement.innerHTML = `
      <small>
        Created: ${DateUtils.formatDateTime(task.createdAt)} | 
        Updated: ${DateUtils.formatDateTime(task.updatedAt)}
      </small>
    `;
    detailsContainer.appendChild(datesElement);

    // Add details to task element
    taskElement.appendChild(detailsContainer);
    taskElement.classList.add('expanded');
  }

  /**
   * Update display of a single task
   */
  updateTaskDisplay(task) {
    this._ensureInitialized();

    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) {
      console.warn('Task element not found for update');
      return;
    }

    // Store previous state for announcements
    const wasCompleted = taskElement.classList.contains('completed');

    // Update completion status
    const checkbox = taskElement.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.checked = task.completed;
    }

    // Update task classes
    taskElement.classList.toggle('completed', task.completed);
    taskElement.classList.toggle('overdue', task.isOverdue());

    // Update ARIA label
    taskElement.setAttribute('aria-label', this._generateTaskAriaLabel(task));

    // Update title
    const titleElement = taskElement.querySelector('.task-title');
    if (titleElement) {
      titleElement.textContent = task.title;
    }

    // Update due date
    const dueDateElement = taskElement.querySelector('.task-due-date');
    if (dueDateElement) {
      if (task.dueDate) {
        dueDateElement.textContent = DateUtils.getDateDescription(task.dueDate);
        dueDateElement.className = `task-due-date ${DateUtils.getDatePriorityClass(task.dueDate)}`;
      } else {
        dueDateElement.textContent = '';
        dueDateElement.className = 'task-due-date';
      }
    }

    // Update priority
    const priorityElement = taskElement.querySelector('.task-priority');
    if (priorityElement) {
      priorityElement.className = `task-priority priority-${task.priority}`;
      priorityElement.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    }

    // Update checklist progress
    const progressElement = taskElement.querySelector('.checklist-progress');
    if (progressElement) {
      if (task.checklist && task.checklist.length > 0) {
        const progress = task.getChecklistProgress();
        progressElement.textContent = `${progress.completed}/${progress.total} items`;
        progressElement.style.display = 'inline';
      } else {
        progressElement.style.display = 'none';
      }
    }

    // Announce completion status change
    if (wasCompleted !== task.completed) {
      const statusMessage = task.completed
        ? `Task "${task.title}" marked as completed`
        : `Task "${task.title}" marked as incomplete`;
      this.announceToScreenReader(statusMessage);
    }

    // Update expanded details if present
    const detailsElement = taskElement.querySelector('.task-details');
    if (detailsElement) {
      taskElement.removeChild(detailsElement);
      taskElement.classList.remove('expanded');
      this.renderTaskDetails(task);
    }
  }

  /**
   * Create a task element with visual indicators and accessibility features
   */
  _createTaskElement(task) {
    const taskElement = document.createElement('div');

    // Add comprehensive CSS classes for styling
    const classes = ['task'];

    // Completion status
    if (task.completed) classes.push('completed');

    // Priority classes
    classes.push(`priority-${task.priority}`);

    // Due date status classes
    if (task.dueDate) {
      if (task.isOverdue()) {
        classes.push('overdue');
      } else if (DateUtils.isDueToday(task.dueDate)) {
        classes.push('due-today');
      } else if (DateUtils.isDueTomorrow(task.dueDate)) {
        classes.push('due-tomorrow');
      } else if (DateUtils.isFutureDate(task.dueDate)) {
        classes.push('due-future');
      }
    }

    // Checklist status
    if (task.checklist && task.checklist.length > 0) {
      classes.push('has-checklist');
      const progress = task.getChecklistProgress();
      if (progress.percentage === 100) {
        classes.push('checklist-complete');
      } else if (progress.percentage > 0) {
        classes.push('checklist-partial');
      }
    }

    taskElement.className = classes.join(' ');
    taskElement.setAttribute('data-task-id', task.id);

    // Accessibility attributes
    taskElement.setAttribute('role', 'listitem');
    taskElement.setAttribute('tabindex', '0');
    taskElement.setAttribute('aria-label', this._generateTaskAriaLabel(task));

    // Keyboard navigation hint
    taskElement.setAttribute('title', 'Press Enter to expand, E to edit, D to delete, C to toggle completion');

    // Create task header
    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-header';

    // Priority indicator with visual styling
    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = `priority-indicator priority-${task.priority}`;
    priorityIndicator.setAttribute('title', `Priority: ${task.priority}`);

    // Completion checkbox with accessibility
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('data-task-id', task.id);
    checkbox.setAttribute('aria-label', `Mark task "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
    checkbox.setAttribute('title', `Toggle completion status for "${task.title}"`);

    // Add keyboard support
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        checkbox.click();
      }
    });

    // Task title with click handler for expansion
    const title = document.createElement('span');
    title.className = 'task-title clickable';
    title.textContent = task.title;
    title.setAttribute('data-task-id', task.id);
    title.title = 'Click to expand details';

    // Task metadata container
    const metadata = document.createElement('div');
    metadata.className = 'task-metadata';

    // Priority badge
    const priority = document.createElement('span');
    priority.className = `task-priority priority-${task.priority}`;
    priority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    // Due date with enhanced styling
    const dueDate = document.createElement('span');
    const dueDateClasses = ['task-due-date'];

    if (task.dueDate) {
      dueDateClasses.push(DateUtils.getDatePriorityClass(task.dueDate));
      dueDate.textContent = DateUtils.getDateDescription(task.dueDate);

      // Add warning icons for overdue/urgent tasks
      if (task.isOverdue()) {
        dueDate.innerHTML = `⚠️ ${dueDate.textContent}`;
      } else if (DateUtils.isDueToday(task.dueDate)) {
        dueDate.innerHTML = `🔥 ${dueDate.textContent}`;
      } else if (DateUtils.isDueTomorrow(task.dueDate)) {
        dueDate.innerHTML = `⏰ ${dueDate.textContent}`;
      }
    }

    dueDate.className = dueDateClasses.join(' ');

    // Enhanced checklist progress with visual indicator
    const checklistProgress = document.createElement('div');
    checklistProgress.className = 'checklist-progress-container';

    if (task.checklist && task.checklist.length > 0) {
      const progress = task.getChecklistProgress();

      // Progress text
      const progressText = document.createElement('span');
      progressText.className = 'checklist-progress-text';
      progressText.textContent = `${progress.completed}/${progress.total}`;

      // Progress bar
      const progressBar = document.createElement('div');
      progressBar.className = 'checklist-progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'checklist-progress-fill';
      progressFill.style.width = `${progress.percentage}%`;

      progressBar.appendChild(progressFill);

      // Progress percentage
      const progressPercent = document.createElement('span');
      progressPercent.className = 'checklist-progress-percent';
      progressPercent.textContent = `${progress.percentage}%`;

      checklistProgress.appendChild(progressText);
      checklistProgress.appendChild(progressBar);
      checklistProgress.appendChild(progressPercent);
    } else {
      checklistProgress.style.display = 'none';
    }

    // Task actions with responsive behavior
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editButton = document.createElement('button');
    editButton.className = 'task-edit-btn btn-secondary';
    editButton.innerHTML = '<span class="btn-icon" aria-hidden="true">✏️</span><span class="btn-text">Edit</span>';
    editButton.setAttribute('data-task-id', task.id);
    editButton.setAttribute('aria-label', `Edit task: ${task.title}`);
    editButton.setAttribute('title', 'Edit task (Press E when task is focused)');

    const deleteButton = document.createElement('button');
    deleteButton.className = 'task-delete-btn btn-danger';
    deleteButton.innerHTML = '<span class="btn-icon" aria-hidden="true">🗑️</span><span class="btn-text">Delete</span>';
    deleteButton.setAttribute('data-task-id', task.id);
    deleteButton.setAttribute('aria-label', `Delete task: ${task.title}`);
    deleteButton.setAttribute('title', 'Delete task (Press Delete when task is focused)');

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    // Assemble metadata
    metadata.appendChild(priority);
    metadata.appendChild(dueDate);
    metadata.appendChild(checklistProgress);

    // Assemble task header with responsive layout
    taskHeader.appendChild(priorityIndicator);
    taskHeader.appendChild(checkbox);
    taskHeader.appendChild(title);
    taskHeader.appendChild(metadata);
    taskHeader.appendChild(actions);

    taskElement.appendChild(taskHeader);

    return taskElement;
  }

  /**
   * Create a project element with enhanced visual indicators and accessibility features
   */
  _createProjectElement(project, currentProjectId) {
    const projectElement = document.createElement('div');

    // Enhanced project classes for styling
    const classes = ['project'];
    if (project.id === currentProjectId) classes.push('active');
    if (project.taskCount === 0) classes.push('empty');
    if (project.taskCount > 10) classes.push('high-task-count');

    projectElement.className = classes.join(' ');
    projectElement.setAttribute('data-project-id', project.id);

    // Accessibility attributes
    projectElement.setAttribute('role', 'button');
    projectElement.setAttribute('tabindex', '0');
    projectElement.setAttribute('aria-label', this._generateProjectAriaLabel(project, currentProjectId));

    // Keyboard navigation hint
    const keyboardHint = project.id === 'default'
      ? 'Press Enter to select project'
      : 'Press Enter to select project, D to delete';
    projectElement.setAttribute('title', keyboardHint);

    // Project icon/indicator
    const projectIcon = document.createElement('span');
    projectIcon.className = 'project-icon';
    projectIcon.textContent = project.id === 'default' ? '📋' : '📁';

    // Project name
    const projectName = document.createElement('span');
    projectName.className = 'project-name';
    projectName.textContent = project.name;

    // Task count with visual styling
    const taskCount = document.createElement('span');
    taskCount.className = 'project-task-count';

    const count = project.taskCount || 0;
    taskCount.textContent = count;

    // Add visual indicators for task count
    if (count === 0) {
      taskCount.classList.add('empty');
    } else if (count > 10) {
      taskCount.classList.add('high');
    } else if (count > 5) {
      taskCount.classList.add('medium');
    }

    // Project metadata container
    const projectMeta = document.createElement('div');
    projectMeta.className = 'project-meta';
    projectMeta.appendChild(taskCount);

    // Add delete button for non-default projects
    if (project.id !== 'default') {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'project-delete-btn btn-danger-small';
      deleteButton.innerHTML = '<span class="btn-icon">×</span>';
      deleteButton.setAttribute('data-project-id', project.id);
      deleteButton.title = 'Delete project';
      projectMeta.appendChild(deleteButton);
    }

    // Assemble project element
    projectElement.appendChild(projectIcon);
    projectElement.appendChild(projectName);
    projectElement.appendChild(projectMeta);

    return projectElement;
  }

  /**
   * Create checklist element for task details
   */
  _createChecklistElement(checklist, taskId) {
    const checklistContainer = document.createElement('div');
    checklistContainer.className = 'task-checklist';

    const checklistTitle = document.createElement('strong');
    checklistTitle.textContent = 'Checklist:';
    checklistContainer.appendChild(checklistTitle);

    const checklistList = document.createElement('ul');
    checklistList.className = 'checklist-items';

    checklist.forEach(item => {
      const listItem = document.createElement('li');
      listItem.className = `checklist-item ${item.completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checklist-checkbox';
      checkbox.checked = item.completed;
      checkbox.setAttribute('data-task-id', taskId);
      checkbox.setAttribute('data-item-id', item.id);

      const text = document.createElement('span');
      text.className = 'checklist-text';
      text.textContent = item.text;

      listItem.appendChild(checkbox);
      listItem.appendChild(text);
      checklistList.appendChild(listItem);
    });

    checklistContainer.appendChild(checklistList);
    return checklistContainer;
  }

  /**
   * Render empty task list message
   */
  _renderEmptyTaskList(projectId) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.innerHTML = `
      <p>No tasks in this project yet.</p>
      <p>Click "Add Task" to create your first task!</p>
    `;
    this.taskListContainer.appendChild(emptyMessage);
  }

  /**
   * Render empty project list message
   */
  _renderEmptyProjectList() {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.innerHTML = `
      <p>No projects found.</p>
      <p>Click "+ Project" to create your first project!</p>
    `;
    this.projectListContainer.appendChild(emptyMessage);
  }

  /**
   * Escape HTML to prevent XSS
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show loading state
   */
  showLoading(container = 'tasks') {
    this._ensureInitialized();

    const targetContainer = container === 'tasks' ? this.taskListContainer : this.projectListContainer;

    targetContainer.innerHTML = `
      <div class="loading-message">
        <p>Loading...</p>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message, container = 'tasks') {
    this._ensureInitialized();

    const targetContainer = container === 'tasks' ? this.taskListContainer : this.projectListContainer;

    targetContainer.innerHTML = `
      <div class="error-message">
        <p>Error: ${this._escapeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * Clear container
   */
  clearContainer(container = 'tasks') {
    this._ensureInitialized();

    const targetContainer = container === 'tasks' ? this.taskListContainer : this.projectListContainer;
    targetContainer.innerHTML = '';
  }

  /**
   * Render task form for creation or editing
   */
  renderTaskForm(task = null, projects = []) {
    this._ensureInitialized();

    const modalElement = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const formTitle = document.getElementById('form-title');

    if (!modalElement || !form || !formTitle) {
      throw new Error('Task form elements not found');
    }

    // Set form title
    formTitle.textContent = task ? 'Edit Task' : 'Add New Task';

    // Clear and populate form fields
    this._populateTaskForm(task, projects);

    // Show modal using Bootstrap
    try {
      // Check if bootstrap is defined
      if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not defined. Make sure it\'s properly loaded.');
        throw new Error('Bootstrap is not defined');
      }
      
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      
      // Focus on title field
      const titleField = document.getElementById('task-title');
      if (titleField) {
        titleField.focus();
      }
    } catch (error) {
      console.error('Error showing modal:', error);
      alert('There was an error opening the task form. Please try refreshing the page.');
    }

    // Store task ID for editing
    form.setAttribute('data-task-id', task ? task.id : '');
  }

  /**
   * Render project creation form
   */
  renderProjectForm() {
    // Get project modal element
    const modalElement = document.getElementById('project-modal');
    
    if (!modalElement) {
      throw new Error('Project modal not found');
    }

    // Clear form
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
      projectNameInput.value = '';
    }

    try {
      // Check if bootstrap is defined
      if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not defined. Make sure it\'s properly loaded.');
        throw new Error('Bootstrap is not defined');
      }
      
      // Show modal using Bootstrap
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      
      // Focus on input after modal is shown
      modalElement.addEventListener('shown.bs.modal', () => {
        if (projectNameInput) {
          projectNameInput.focus();
        }
      }, { once: true });
    } catch (error) {
      console.error('Error showing project modal:', error);
      alert('There was an error opening the project form. Please try refreshing the page.');
    }
  }

  /**
   * Hide task form modal
   */
  hideTaskForm() {
    const modalElement = document.getElementById('task-modal');
    if (modalElement) {
      try {
        // Check if bootstrap is defined
        if (typeof bootstrap === 'undefined') {
          console.error('Bootstrap is not defined. Make sure it\'s properly loaded.');
          return;
        }
        
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      } catch (error) {
        console.error('Error hiding task modal:', error);
      }
    }

    // Clear form
    const form = document.getElementById('task-form');
    if (form) {
      form.reset();
      form.removeAttribute('data-task-id');
      this._clearChecklistItems();
    }
  }

  /**
   * Hide project form modal
   */
  hideProjectForm() {
    const modalElement = document.getElementById('project-modal');
    if (modalElement) {
      try {
        // Check if bootstrap is defined
        if (typeof bootstrap === 'undefined') {
          console.error('Bootstrap is not defined. Make sure it\'s properly loaded.');
          return;
        }
        
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      } catch (error) {
        console.error('Error hiding project modal:', error);
      }
    }
  }

  /**
   * Add form validation error display
   */
  showFormError(fieldName, message) {
    const field = document.getElementById(`task-${fieldName}`) || document.getElementById(fieldName);
    if (!field) return;

    // Remove existing error
    this.clearFormError(fieldName);

    // Add error class to field
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');

    // Get or create error element
    const errorId = `${fieldName}-error`;
    let errorElement = document.getElementById(errorId);

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'field-error';
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');
      field.parentNode.insertBefore(errorElement, field.nextSibling);

      // Link field to error message
      field.setAttribute('aria-describedby', errorId);
    }

    errorElement.textContent = message;
    this.announceToScreenReader(`Error: ${message}`);
  }

  /**
   * Clear form validation error
   */
  clearFormError(fieldName) {
    const field = document.getElementById(`task-${fieldName}`) || document.getElementById(fieldName);
    if (field) {
      field.classList.remove('error');
      field.setAttribute('aria-invalid', 'false');
    }

    // Remove error message
    const errorId = `${fieldName}-error`;
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Clear all form errors
   */
  clearAllFormErrors() {
    // Remove error classes
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));

    // Remove error messages
    const errorMessages = document.querySelectorAll('.field-error');
    errorMessages.forEach(message => message.remove());
  }

  /**
   * Get form data from task form
   */
  getTaskFormData() {
    const form = document.getElementById('task-form');
    if (!form) return null;

    const formData = new FormData(form);
    const data = {
      title: formData.get('title')?.trim() || '',
      description: formData.get('description')?.trim() || '',
      dueDate: formData.get('dueDate') || null,
      priority: formData.get('priority') || 'medium',
      notes: formData.get('notes')?.trim() || '',
      projectId: formData.get('projectId') || 'default',
      checklist: [] // Checklist functionality removed
    };

    // Convert empty strings to null for optional fields
    if (!data.description) data.description = '';
    if (!data.notes) data.notes = '';
    if (!data.dueDate) data.dueDate = null;

    return data;
  }

  /**
   * Get project form data
   */
  getProjectFormData() {
    const nameInput = document.getElementById('project-name');
    if (!nameInput) return null;

    return {
      name: nameInput.value.trim()
    };
  }

  /**
   * Populate task form with data
   */
  _populateTaskForm(task, projects) {
    // Populate basic fields
    document.getElementById('task-title').value = task ? task.title : '';
    document.getElementById('task-description').value = task ? task.description : '';
    document.getElementById('task-due-date').value = task && task.dueDate ? DateUtils.formatForInput(task.dueDate) : '';
    document.getElementById('task-priority').value = task ? task.priority : 'medium';
    document.getElementById('task-notes').value = task ? task.notes : '';

    // Populate project selection
    this._populateProjectSelect(projects, task ? task.projectId : 'default');

    // Populate checklist
    this._populateChecklist(task ? task.checklist : []);
  }

  /**
   * Populate project select dropdown
   */
  _populateProjectSelect(projects, selectedProjectId = 'default') {
    // Check if we need to add project select to task form
    let projectSelect = document.getElementById('task-project');

    if (!projectSelect) {
      // Create project select field if it doesn't exist
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';

      const label = document.createElement('label');
      label.setAttribute('for', 'task-project');
      label.textContent = 'Project';

      projectSelect = document.createElement('select');
      projectSelect.id = 'task-project';
      projectSelect.name = 'projectId';

      formGroup.appendChild(label);
      formGroup.appendChild(projectSelect);

      // Insert before checklist group
      const checklistGroup = document.querySelector('#task-form .form-group:has(label[for="checklist"])') ||
        document.querySelector('#task-form .form-group:last-of-type');

      if (checklistGroup) {
        checklistGroup.parentNode.insertBefore(formGroup, checklistGroup);
      } else {
        document.getElementById('task-form').appendChild(formGroup);
      }
    }

    // Clear existing options
    projectSelect.innerHTML = '';

    // Add project options
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        option.selected = project.id === selectedProjectId;
        projectSelect.appendChild(option);
      });
    } else {
      // Default option if no projects provided
      const option = document.createElement('option');
      option.value = 'default';
      option.textContent = 'Default Project';
      option.selected = true;
      projectSelect.appendChild(option);
    }
  }

  /**
   * Populate checklist in form
   */
  _populateChecklist(checklist) {
    const container = document.getElementById('checklist-container');
    if (!container) return;

    // Clear existing items
    container.innerHTML = '';

    // Add existing checklist items
    if (checklist && checklist.length > 0) {
      checklist.forEach(item => {
        this._addChecklistItemToForm(item.text, item.completed, item.id);
      });
    }
  }

  /**
   * Add checklist item to form
   */
  _addChecklistItemToForm(text = '', completed = false, itemId = null) {
    const container = document.getElementById('checklist-container');
    if (!container) return;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'checklist-item-form';
    itemDiv.setAttribute('data-item-id', itemId || '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checklist-item-checkbox';
    checkbox.checked = completed;

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'checklist-item-text';
    textInput.value = text;
    textInput.placeholder = 'Checklist item...';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-checklist-item';
    removeButton.textContent = '×';
    removeButton.title = 'Remove item';

    // Add event listener for remove button
    removeButton.addEventListener('click', () => {
      itemDiv.remove();
    });

    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(textInput);
    itemDiv.appendChild(removeButton);

    container.appendChild(itemDiv);

    // Focus on the new text input
    textInput.focus();
  }

  /**
   * Get checklist data from form
   */
  _getChecklistData() {
    const container = document.getElementById('checklist-container');
    if (!container) return [];

    const items = container.querySelectorAll('.checklist-item-form');
    const checklist = [];

    items.forEach(item => {
      const textInput = item.querySelector('.checklist-item-text');
      const checkbox = item.querySelector('.checklist-item-checkbox');
      const itemId = item.getAttribute('data-item-id');

      const text = textInput.value.trim();
      if (text) {
        checklist.push({
          id: itemId || null,
          text: text,
          completed: checkbox.checked
        });
      }
    });

    return checklist;
  }

  /**
   * Clear checklist items from form
   */
  _clearChecklistItems() {
    const container = document.getElementById('checklist-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * This method is no longer needed as the project modal is now defined in HTML
   * and uses Bootstrap's modal component
   */

  /**
   * Generate comprehensive ARIA label for task element
   */
  _generateTaskAriaLabel(task) {
    let label = `Task: ${task.title}`;

    // Add completion status
    label += task.completed ? ', completed' : ', not completed';

    // Add priority
    label += `, ${task.priority} priority`;

    // Add due date information
    if (task.dueDate) {
      if (task.isOverdue()) {
        label += ', overdue';
      } else if (DateUtils.isDueToday(task.dueDate)) {
        label += ', due today';
      } else if (DateUtils.isDueTomorrow(task.dueDate)) {
        label += ', due tomorrow';
      } else {
        label += `, due ${DateUtils.getDateDescription(task.dueDate)}`;
      }
    }

    // Add checklist information
    if (task.checklist && task.checklist.length > 0) {
      const progress = task.getChecklistProgress();
      label += `, checklist ${progress.completed} of ${progress.total} items completed`;
    }

    return label;
  }

  /**
   * Generate comprehensive ARIA label for project element
   */
  _generateProjectAriaLabel(project, currentProjectId) {
    let label = `Project: ${project.name}`;

    // Add active status
    if (project.id === currentProjectId) {
      label += ', currently selected';
    }

    // Add task count
    const taskCount = project.taskCount || 0;
    if (taskCount === 0) {
      label += ', no tasks';
    } else if (taskCount === 1) {
      label += ', 1 task';
    } else {
      label += `, ${taskCount} tasks`;
    }

    return label;
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
}