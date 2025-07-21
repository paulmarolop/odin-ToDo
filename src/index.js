// Main application entry point
import './styles/main.css';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Make bootstrap globally available
window.bootstrap = bootstrap;

// Import services and UI modules
import { taskService } from './modules/services/TaskService.js';
import { projectService } from './modules/services/ProjectService.js';
import { storageService } from './modules/services/StorageService.js';
import { DOMRenderer } from './modules/ui/DOMRenderer.js';
import { EventHandler } from './modules/ui/EventHandler.js';

/**
 * Main Application Controller
 * Coordinates all services and manages application lifecycle
 */
class TodoApp {
  constructor() {
    this.domRenderer = null;
    this.eventHandler = null;
    this.currentProjectId = 'default';
    this.initialized = false;
    
    // Application state
    this.state = {
      currentProjectId: 'default',
      projects: [],
      tasks: [],
      loading: false,
      error: null
    };
    
    // Application settings with defaults
    this.settings = {
      currentProjectId: 'default',
      theme: 'light',
      lastAccessed: new Date().toISOString(),
      autoSave: true,
      showCompletedTasks: true,
      defaultTaskPriority: 'medium',
      taskSortBy: 'createdAt',
      taskSortOrder: 'desc'
    };

    // State change listeners
    this.stateListeners = new Set();
    
    // Bind methods to preserve context
    this.handleProjectSwitch = this.handleProjectSwitch.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing ToDo List App...');

      // Initialize storage service and check availability
      await this.initializeStorage();

      // Load application settings
      await this.loadSettings();

      // Initialize services
      await this.initializeServices();

      // Initialize UI components
      await this.initializeUI();

      // Load and display initial data
      await this.loadInitialData();

      // Handle browser refresh and data restoration
      await this.handleBrowserRefresh();

      // Set up error recovery mechanisms
      this.setupErrorHandlers();

      // Add state change listener for debugging/monitoring
      this.addStateListener(this.handleStateChange);

      this.initialized = true;
      console.log('ToDo List App initialized successfully');

      // Save last accessed time
      await this.saveSettings();

    } catch (error) {
      console.error('Failed to initialize application:', error);
      await this.handleInitializationError(error);
    }
  }

  /**
   * Initialize storage service and handle errors
   */
  async initializeStorage() {
    try {
      // Check storage availability
      if (!storageService.isAvailable()) {
        console.warn('localStorage not available, using fallback storage');
        this.showMessage('Data will not persist between sessions', 'warning');
      }

      // Set up storage error handlers
      storageService.addErrorHandler((error) => {
        console.error('Storage error:', error);
        this.showMessage('Storage error occurred. Data may not be saved.', 'error');
      });

      storageService.addQuotaExceededHandler((error, storageInfo) => {
        console.warn('Storage quota exceeded:', error);
        this.showMessage('Storage is full. Please clear some data.', 'warning');
      });

      // Validate data integrity
      const validation = storageService.validateDataIntegrity();
      if (!validation.tasks.valid || !validation.projects.valid || !validation.settings.valid) {
        console.warn('Data corruption detected, attempting repair...');
        const repairResults = storageService.repairData();
        
        if (repairResults.tasksRepaired > 0 || repairResults.projectsRepaired > 0) {
          this.showMessage('Some corrupted data was repaired', 'info');
        }
      }

    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw new Error(`Storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Load application settings
   */
  async loadSettings() {
    try {
      const loadedSettings = storageService.loadSettings();
      
      // Merge with defaults to ensure all properties exist
      this.settings = {
        ...this.settings,
        ...loadedSettings
      };
      
      this.currentProjectId = this.settings.currentProjectId || 'default';
      
      // Update application state
      this.updateState({
        currentProjectId: this.currentProjectId
      });
      
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      // Keep default settings already set in constructor
    }
  }

  /**
   * Save application settings
   */
  async saveSettings() {
    try {
      this.settings.currentProjectId = this.currentProjectId;
      this.settings.lastAccessed = new Date().toISOString();
      
      storageService.saveSettings(this.settings);
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    try {
      // Initialize project service first (creates default project)
      await projectService.initialize();
      console.log('Project service initialized');

      // Initialize task service
      await taskService.initialize();
      console.log('Task service initialized');

      // Ensure default project exists
      const defaultProject = await projectService.getDefaultProject();
      if (!defaultProject) {
        throw new Error('Failed to create default project');
      }

    } catch (error) {
      console.error('Service initialization failed:', error);
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    try {
      // Initialize DOM renderer
      this.domRenderer = new DOMRenderer();
      this.domRenderer.initialize();
      console.log('DOM renderer initialized');

      // Initialize event handler with app reference
      this.eventHandler = new EventHandler(this.domRenderer);
      this.eventHandler.setCurrentProject(this.currentProjectId);
      
      // Set up integration between event handler and app state
      this.eventHandler.setAppController(this);
      
      this.eventHandler.initialize();
      console.log('Event handler initialized');

    } catch (error) {
      console.error('UI initialization failed:', error);
      throw new Error(`UI initialization failed: ${error.message}`);
    }
  }

  /**
   * Load and display initial data
   */
  async loadInitialData() {
    try {
      this.updateState({ loading: true });

      // Load all projects
      const projects = await projectService.getAllProjects();
      console.log(`Loaded ${projects.length} projects`);

      // Verify current project exists
      const currentProject = await projectService.getProjectById(this.currentProjectId);
      if (!currentProject) {
        console.warn(`Current project ${this.currentProjectId} not found, switching to default`);
        await this.switchToProject('default');
      }

      // Load tasks for current project
      const tasks = await taskService.getTasksByProject(this.currentProjectId);
      console.log(`Loaded ${tasks.length} tasks for project ${this.currentProjectId}`);

      // Update application state
      this.updateState({
        projects: projects,
        tasks: tasks,
        loading: false,
        error: null
      });

      // Update project task counts
      await this.syncProjectTaskCounts();

      // Render initial UI
      const updatedProjects = await projectService.getAllProjects();
      this.domRenderer.renderProjectList(updatedProjects, this.currentProjectId);
      this.domRenderer.renderTaskList(tasks, this.currentProjectId);

      console.log('Initial data loaded and rendered');

    } catch (error) {
      console.error('Failed to load initial data:', error);
      
      this.updateState({ 
        loading: false, 
        error: error.message 
      });
      
      // Show error in UI
      this.domRenderer.showError('Failed to load data');
      throw new Error(`Initial data loading failed: ${error.message}`);
    }
  }

  /**
   * Sync project task counts with actual task data
   */
  async syncProjectTaskCounts() {
    try {
      await projectService.syncTaskCounts(async (projectId) => {
        if (projectId === 'all') {
          // For the default project, return count of ALL tasks
          const allTasks = await taskService.getAllTasks();
          return allTasks.length;
        } else {
          // For other projects, return count of tasks in that project
          const tasks = await taskService.getTasksByProject(projectId);
          return tasks.length;
        }
      });
    } catch (error) {
      console.warn('Failed to sync project task counts:', error);
    }
  }

  /**
   * Set up error handlers for recovery
   */
  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });

    // Periodic data validation (every 5 minutes)
    setInterval(() => {
      this.validateAndRepairData();
    }, 5 * 60 * 1000);
  }

  /**
   * Handle initialization errors with recovery options
   */
  async handleInitializationError(error) {
    console.error('Application initialization failed:', error);

    try {
      // Try to show basic error UI
      document.body.innerHTML = `
        <div class="error-container">
          <h1>Application Error</h1>
          <p>The ToDo List app failed to initialize properly.</p>
          <p>Error: ${error.message}</p>
          <div class="error-actions">
            <button onclick="location.reload()">Reload App</button>
            <button onclick="window.todoApp.forceRecovery()">Reset Data</button>
          </div>
        </div>
      `;

      // Make recovery method available globally
      window.todoApp = this;

    } catch (uiError) {
      console.error('Failed to show error UI:', uiError);
      alert(`Application failed to start: ${error.message}\n\nPlease reload the page.`);
    }
  }

  /**
   * Handle global errors during runtime
   */
  handleGlobalError(error) {
    // Don't show too many error messages
    if (this.lastErrorTime && Date.now() - this.lastErrorTime < 5000) {
      return;
    }

    this.lastErrorTime = Date.now();
    this.showMessage('An unexpected error occurred. The app may not function properly.', 'error');
  }

  /**
   * Validate and repair data periodically
   */
  async validateAndRepairData() {
    try {
      const validation = storageService.validateDataIntegrity();
      
      if (!validation.tasks.valid || !validation.projects.valid) {
        console.warn('Data corruption detected during periodic check');
        const repairResults = storageService.repairData();
        
        if (repairResults.tasksRepaired > 0 || repairResults.projectsRepaired > 0) {
          console.log('Data repaired automatically');
          
          // Refresh UI if significant repairs were made
          if (repairResults.tasksRepaired > 0) {
            await this.eventHandler.refreshTaskList();
          }
          
          if (repairResults.projectsRepaired > 0) {
            await this.eventHandler.refreshProjectList();
          }
        }
      }
    } catch (error) {
      console.warn('Periodic data validation failed:', error);
    }
  }

  /**
   * Force recovery by clearing all data
   */
  async forceRecovery() {
    if (!confirm('This will delete all your tasks and projects. Are you sure?')) {
      return;
    }

    try {
      console.log('Initiating force recovery...');
      
      // Clear all data
      const recoveryResults = storageService.forceRecovery();
      console.log('Recovery results:', recoveryResults);

      // Reload the page to restart the app
      location.reload();

    } catch (error) {
      console.error('Force recovery failed:', error);
      alert('Recovery failed. Please clear your browser data manually.');
    }
  }

  /**
   * Show message to user
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

    // Allow manual dismissal
    messageElement.addEventListener('click', () => {
      messageElement.remove();
    });
  }

  /**
   * Get application status and information
   */
  getAppInfo() {
    return {
      initialized: this.initialized,
      currentProjectId: this.currentProjectId,
      settings: this.settings,
      services: {
        task: taskService.getServiceInfo(),
        project: projectService.getServiceInfo(),
        storage: {
          available: storageService.isAvailable(),
          quotaExceeded: storageService.isQuotaExceeded(),
          usingFallback: storageService.isUsingFallback(),
          storageInfo: storageService.getStorageInfo()
        }
      }
    };
  }

  /**
   * Update application state and notify listeners
   */
  updateState(newState) {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // Update current project ID if it changed
    if (newState.currentProjectId && newState.currentProjectId !== this.currentProjectId) {
      this.currentProjectId = newState.currentProjectId;
      
      // Update event handler
      if (this.eventHandler) {
        this.eventHandler.setCurrentProject(this.currentProjectId);
      }
    }
    
    // Notify state listeners
    this.notifyStateListeners(this.state, previousState);
    
    // Auto-save settings if enabled
    if (this.settings.autoSave && this.initialized) {
      this.saveSettings().catch(error => {
        console.warn('Auto-save failed:', error);
      });
    }
  }

  /**
   * Add state change listener
   */
  addStateListener(listener) {
    if (typeof listener === 'function') {
      this.stateListeners.add(listener);
    }
  }

  /**
   * Remove state change listener
   */
  removeStateListener(listener) {
    this.stateListeners.delete(listener);
  }

  /**
   * Notify all state listeners of changes
   */
  notifyStateListeners(newState, previousState) {
    this.stateListeners.forEach(listener => {
      try {
        listener(newState, previousState);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  /**
   * Handle project switching with state management
   */
  async handleProjectSwitch(projectId) {
    if (!projectId || projectId === this.currentProjectId) {
      return;
    }

    try {
      this.updateState({ loading: true });

      // Verify project exists
      const project = await projectService.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Load tasks for new project
      const tasks = await taskService.getTasksByProject(projectId);

      // Update state
      this.updateState({
        currentProjectId: projectId,
        tasks: tasks,
        loading: false,
        error: null
      });

      // Update UI
      if (this.domRenderer) {
        this.domRenderer.renderTaskList(tasks, projectId);
        
        // Update project list to highlight active project
        const projects = await projectService.getAllProjects();
        this.domRenderer.renderProjectList(projects, projectId);
      }

      console.log(`Switched to project: ${projectId}`);

    } catch (error) {
      console.error('Failed to switch project:', error);
      this.updateState({ 
        loading: false, 
        error: error.message 
      });
      this.showMessage('Failed to switch project', 'error');
    }
  }

  /**
   * Switch to a specific project
   */
  async switchToProject(projectId) {
    await this.handleProjectSwitch(projectId);
  }

  /**
   * Handle state changes (generic handler)
   */
  handleStateChange(newState, previousState) {
    // Log state changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log('State changed:', { newState, previousState });
    }

    // Handle specific state changes
    if (newState.error && newState.error !== previousState.error) {
      this.showMessage(newState.error, 'error');
    }

    if (newState.loading !== previousState.loading) {
      this.handleLoadingStateChange(newState.loading);
    }
  }

  /**
   * Handle loading state changes
   */
  handleLoadingStateChange(isLoading) {
    if (isLoading) {
      // Show loading indicator
      const loadingElement = document.querySelector('.loading-indicator');
      if (loadingElement) {
        loadingElement.style.display = 'block';
      }
    } else {
      // Hide loading indicator
      const loadingElement = document.querySelector('.loading-indicator');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    }
  }

  /**
   * Get current application state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update application settings
   */
  async updateSettings(newSettings) {
    const previousSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };

    try {
      await this.saveSettings();
      console.log('Settings updated:', newSettings);
    } catch (error) {
      // Revert settings on save failure
      this.settings = previousSettings;
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Handle browser refresh and data restoration
   */
  async handleBrowserRefresh() {
    try {
      // This method is called during initialization to restore state
      console.log('Restoring application state after refresh...');

      // Load settings (already done in loadSettings)
      // Load projects and tasks (already done in loadInitialData)
      
      // Restore UI state based on settings
      if (this.settings.theme && this.settings.theme !== 'light') {
        document.body.classList.add(`theme-${this.settings.theme}`);
      }

      // Apply other UI preferences
      if (this.settings.showCompletedTasks === false) {
        document.body.classList.add('hide-completed-tasks');
      }

      console.log('Application state restored successfully');

    } catch (error) {
      console.error('Failed to restore application state:', error);
      this.showMessage('Some settings could not be restored', 'warning');
    }
  }

  /**
   * Export application state for backup
   */
  async exportAppState() {
    try {
      const tasks = await taskService.getAllTasks();
      const projects = await projectService.getAllProjects();
      
      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings: this.settings,
        state: this.state,
        data: {
          tasks: tasks.map(task => task.toJSON()),
          projects: projects.map(project => project.toJSON())
        }
      };
    } catch (error) {
      console.error('Failed to export app state:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import application state from backup
   */
  async importAppState(importData, options = { merge: false }) {
    try {
      if (!importData || importData.version !== '1.0') {
        throw new Error('Invalid or incompatible backup data');
      }

      this.updateState({ loading: true });

      // Import settings
      if (importData.settings) {
        await this.updateSettings(importData.settings);
      }

      // Import data
      if (importData.data) {
        if (importData.data.projects) {
          const projectResults = await projectService.importProjects(
            { projects: importData.data.projects }, 
            options
          );
          console.log('Project import results:', projectResults);
        }

        // Note: Task import would need to be implemented in TaskService
        // For now, we'll skip task import
      }

      // Refresh application data
      await this.loadInitialData();

      this.showMessage('Data imported successfully', 'success');

    } catch (error) {
      console.error('Failed to import app state:', error);
      this.updateState({ 
        loading: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Reset application to default state
   */
  async resetToDefaults() {
    if (!confirm('This will reset all settings to defaults. Continue?')) {
      return;
    }

    try {
      // Reset settings to defaults
      this.settings = {
        currentProjectId: 'default',
        theme: 'light',
        lastAccessed: new Date().toISOString(),
        autoSave: true,
        showCompletedTasks: true,
        defaultTaskPriority: 'medium',
        taskSortBy: 'createdAt',
        taskSortOrder: 'desc'
      };

      // Save default settings
      await this.saveSettings();

      // Reset state
      this.updateState({
        currentProjectId: 'default',
        projects: [],
        tasks: [],
        loading: false,
        error: null
      });

      // Switch to default project
      await this.switchToProject('default');

      this.showMessage('Settings reset to defaults', 'success');

    } catch (error) {
      console.error('Failed to reset to defaults:', error);
      this.showMessage('Failed to reset settings', 'error');
    }
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown() {
    try {
      console.log('Shutting down application...');
      
      // Save current settings
      await this.saveSettings();
      
      // Clear state listeners
      this.stateListeners.clear();
      
      // Clear any intervals or timeouts
      // (In a real app, you'd track these and clear them)
      
      console.log('Application shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Create and initialize the application
const app = new TodoApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing application...');
  await app.initialize();
});

// Handle page unload
window.addEventListener('beforeunload', async () => {
  await app.shutdown();
});

// Make app available globally for debugging
window.todoApp = app;

console.log('ToDo List App entry point loaded');