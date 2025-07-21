import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';

/**
 * StorageService handles all localStorage operations with error handling and validation
 */
export class StorageService {
  constructor() {
    this.prefix = 'todoapp_';
    this.keys = {
      tasks: `${this.prefix}tasks`,
      projects: `${this.prefix}projects`,
      settings: `${this.prefix}settings`
    };
    
    // Check localStorage availability on initialization
    this._isAvailable = this._checkAvailability();
    this._quotaExceeded = false;
    
    // Fallback storage for when localStorage is unavailable
    this._fallbackStorage = new Map();
    this._usingFallback = false;
    
    // Error handlers
    this._errorHandlers = new Set();
    this._quotaExceededHandlers = new Set();
  }

  /**
   * Check if localStorage is available
   */
  isAvailable() {
    return this._isAvailable;
  }

  /**
   * Check if quota has been exceeded
   */
  isQuotaExceeded() {
    return this._quotaExceeded;
  }

  /**
   * Check if using fallback storage
   */
  isUsingFallback() {
    return this._usingFallback;
  }

  /**
   * Add error handler for storage errors
   */
  addErrorHandler(handler) {
    if (typeof handler === 'function') {
      this._errorHandlers.add(handler);
    }
  }

  /**
   * Remove error handler
   */
  removeErrorHandler(handler) {
    this._errorHandlers.delete(handler);
  }

  /**
   * Add quota exceeded handler
   */
  addQuotaExceededHandler(handler) {
    if (typeof handler === 'function') {
      this._quotaExceededHandlers.add(handler);
    }
  }

  /**
   * Remove quota exceeded handler
   */
  removeQuotaExceededHandler(handler) {
    this._quotaExceededHandlers.delete(handler);
  }

  /**
   * Save data to localStorage with error handling and fallback
   */
  save(key, data) {
    const fullKey = key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
    
    // Try localStorage first if available
    if (this._isAvailable && !this._usingFallback) {
      try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(fullKey, serializedData);
        this._quotaExceeded = false;
        return true;
      } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          this._quotaExceeded = true;
          this._notifyQuotaExceeded(error);
          
          // Try to free up space by cleaning old data
          if (this._attemptCleanup()) {
            try {
              const serializedData = JSON.stringify(data);
              localStorage.setItem(fullKey, serializedData);
              this._quotaExceeded = false;
              return true;
            } catch (retryError) {
              // Still failing, fall back to memory storage
              this._switchToFallback('Quota exceeded after cleanup attempt');
            }
          } else {
            this._switchToFallback('Storage quota exceeded');
          }
        } else {
          this._notifyError(error);
          this._switchToFallback(`localStorage error: ${error.message}`);
        }
      }
    }
    
    // Use fallback storage
    try {
      this._fallbackStorage.set(fullKey, data);
      return true;
    } catch (error) {
      this._notifyError(error);
      throw new Error(`Failed to save data to fallback storage: ${error.message}`);
    }
  }

  /**
   * Load data from localStorage with validation and fallback
   */
  load(key) {
    const fullKey = key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
    
    // Try localStorage first if available and not using fallback
    if (this._isAvailable && !this._usingFallback) {
      try {
        const serializedData = localStorage.getItem(fullKey);
        
        if (serializedData === null) {
          // Check fallback storage as well
          return this._fallbackStorage.get(fullKey) || null;
        }

        const data = JSON.parse(serializedData);
        return data;
      } catch (error) {
        console.warn(`Failed to load data for key "${key}" from localStorage:`, error.message);
        this._notifyError(error);
        
        // Try fallback storage
        return this._fallbackStorage.get(fullKey) || null;
      }
    }
    
    // Use fallback storage
    return this._fallbackStorage.get(fullKey) || null;
  }

  /**
   * Remove data from localStorage and fallback storage
   */
  remove(key) {
    const fullKey = key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
    let success = false;

    // Remove from localStorage if available
    if (this._isAvailable) {
      try {
        localStorage.removeItem(fullKey);
        success = true;
      } catch (error) {
        console.warn(`Failed to remove data for key "${key}" from localStorage:`, error.message);
        this._notifyError(error);
      }
    }

    // Remove from fallback storage
    if (this._fallbackStorage.has(fullKey)) {
      this._fallbackStorage.delete(fullKey);
      success = true;
    }

    return success;
  }

  /**
   * Clear all application data from localStorage and fallback storage
   */
  clear() {
    let success = false;

    // Clear localStorage if available
    if (this._isAvailable) {
      try {
        // Remove all keys with our prefix
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        this._quotaExceeded = false;
        success = true;
      } catch (error) {
        console.warn('Failed to clear localStorage data:', error.message);
        this._notifyError(error);
      }
    }

    // Clear fallback storage
    const fallbackKeys = Array.from(this._fallbackStorage.keys()).filter(key => 
      key.startsWith(this.prefix)
    );
    fallbackKeys.forEach(key => this._fallbackStorage.delete(key));
    
    if (fallbackKeys.length > 0) {
      success = true;
    }

    return success;
  }

  /**
   * Save tasks with validation and serialization
   */
  saveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }

    // Validate and serialize tasks
    const serializedTasks = tasks.map(task => {
      if (!(task instanceof Task)) {
        throw new Error('All items must be Task instances');
      }
      return task.toJSON();
    });

    return this.save(this.keys.tasks, serializedTasks);
  }

  /**
   * Load tasks with validation and deserialization
   */
  loadTasks() {
    const tasksData = this.load(this.keys.tasks);
    
    if (!tasksData) {
      return [];
    }

    if (!Array.isArray(tasksData)) {
      console.warn('Corrupted tasks data detected, returning empty array');
      return [];
    }

    // Deserialize and validate tasks
    const tasks = [];
    tasksData.forEach((taskData, index) => {
      try {
        const task = Task.fromJSON(taskData);
        tasks.push(task);
      } catch (error) {
        console.warn(`Skipping corrupted task at index ${index}:`, error.message);
      }
    });

    return tasks;
  }

  /**
   * Save projects with validation and serialization
   */
  saveProjects(projects) {
    if (!Array.isArray(projects)) {
      throw new Error('Projects must be an array');
    }

    // Validate and serialize projects
    const serializedProjects = projects.map(project => {
      if (!(project instanceof Project)) {
        throw new Error('All items must be Project instances');
      }
      return project.toJSON();
    });

    return this.save(this.keys.projects, serializedProjects);
  }

  /**
   * Load projects with validation and deserialization
   */
  loadProjects() {
    const projectsData = this.load(this.keys.projects);
    
    if (!projectsData) {
      return [];
    }

    if (!Array.isArray(projectsData)) {
      console.warn('Corrupted projects data detected, returning empty array');
      return [];
    }

    // Deserialize and validate projects
    const projects = [];
    projectsData.forEach((projectData, index) => {
      try {
        const project = Project.fromJSON(projectData);
        projects.push(project);
      } catch (error) {
        console.warn(`Skipping corrupted project at index ${index}:`, error.message);
      }
    });

    return projects;
  }

  /**
   * Save application settings
   */
  saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object');
    }

    const validatedSettings = {
      currentProjectId: settings.currentProjectId || 'default',
      theme: settings.theme || 'light',
      lastAccessed: settings.lastAccessed || new Date().toISOString(),
      ...settings
    };

    return this.save(this.keys.settings, validatedSettings);
  }

  /**
   * Load application settings
   */
  loadSettings() {
    const settings = this.load(this.keys.settings);
    
    if (!settings || typeof settings !== 'object') {
      // Return default settings
      return {
        currentProjectId: 'default',
        theme: 'light',
        lastAccessed: new Date().toISOString()
      };
    }

    return {
      currentProjectId: settings.currentProjectId || 'default',
      theme: settings.theme || 'light',
      lastAccessed: settings.lastAccessed || new Date().toISOString(),
      ...settings
    };
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    if (!this._isAvailable) {
      return {
        available: false,
        used: 0,
        total: 0,
        percentage: 0
      };
    }

    try {
      // Calculate approximate storage usage
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value ? value.length : 0);
        }
      }

      // Most browsers have a 5-10MB limit for localStorage
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const percentage = Math.round((totalSize / estimatedLimit) * 100);

      return {
        available: true,
        used: totalSize,
        total: estimatedLimit,
        percentage: Math.min(percentage, 100),
        quotaExceeded: this._quotaExceeded
      };
    } catch (error) {
      return {
        available: true,
        used: 0,
        total: 0,
        percentage: 0,
        error: error.message
      };
    }
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity() {
    const results = {
      tasks: { valid: true, errors: [] },
      projects: { valid: true, errors: [] },
      settings: { valid: true, errors: [] }
    };

    // Validate tasks
    try {
      const tasks = this.loadTasks();
      if (Array.isArray(tasks)) {
        tasks.forEach((task, index) => {
          const validation = Task.validate(task);
          if (!validation.valid) {
            results.tasks.valid = false;
            results.tasks.errors.push(`Task ${index}: ${validation.errors.join(', ')}`);
          }
        });
      }
    } catch (error) {
      results.tasks.valid = false;
      results.tasks.errors.push(`Failed to load tasks: ${error.message}`);
    }

    // Validate projects
    try {
      const projects = this.loadProjects();
      if (Array.isArray(projects)) {
        projects.forEach((project, index) => {
          const validation = Project.validate(project);
          if (!validation.valid) {
            results.projects.valid = false;
            results.projects.errors.push(`Project ${index}: ${validation.errors.join(', ')}`);
          }
        });
      }
    } catch (error) {
      results.projects.valid = false;
      results.projects.errors.push(`Failed to load projects: ${error.message}`);
    }

    // Validate settings
    try {
      const settings = this.loadSettings();
      if (!settings || typeof settings !== 'object') {
        results.settings.valid = false;
        results.settings.errors.push('Settings data is corrupted');
      }
    } catch (error) {
      results.settings.valid = false;
      results.settings.errors.push(`Failed to load settings: ${error.message}`);
    }

    return results;
  }

  /**
   * Repair corrupted data by removing invalid entries
   */
  repairData() {
    const repairResults = {
      tasksRepaired: 0,
      projectsRepaired: 0,
      settingsRepaired: false
    };

    // Repair tasks
    try {
      const tasksData = this.load(this.keys.tasks);
      if (Array.isArray(tasksData)) {
        const validTasks = [];
        tasksData.forEach((taskData, index) => {
          try {
            const task = Task.fromJSON(taskData);
            validTasks.push(task);
          } catch (error) {
            repairResults.tasksRepaired++;
            console.warn(`Removed corrupted task at index ${index}`);
          }
        });
        
        if (repairResults.tasksRepaired > 0) {
          this.saveTasks(validTasks);
        }
      }
    } catch (error) {
      console.warn('Failed to repair tasks:', error.message);
    }

    // Repair projects
    try {
      const projectsData = this.load(this.keys.projects);
      if (Array.isArray(projectsData)) {
        const validProjects = [];
        projectsData.forEach((projectData, index) => {
          try {
            const project = Project.fromJSON(projectData);
            validProjects.push(project);
          } catch (error) {
            repairResults.projectsRepaired++;
            console.warn(`Removed corrupted project at index ${index}`);
          }
        });
        
        if (repairResults.projectsRepaired > 0) {
          this.saveProjects(validProjects);
        }
      }
    } catch (error) {
      console.warn('Failed to repair projects:', error.message);
    }

    // Repair settings
    try {
      const settings = this.loadSettings();
      if (!settings || typeof settings !== 'object') {
        this.saveSettings({
          currentProjectId: 'default',
          theme: 'light',
          lastAccessed: new Date().toISOString()
        });
        repairResults.settingsRepaired = true;
      }
    } catch (error) {
      console.warn('Failed to repair settings:', error.message);
    }

    return repairResults;
  }

  /**
   * Private method to check localStorage availability
   */
  _checkAvailability() {
    try {
      const testKey = `${this.prefix}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error.message);
      return false;
    }
  }

  /**
   * Switch to fallback storage mode
   */
  _switchToFallback(reason) {
    if (!this._usingFallback) {
      this._usingFallback = true;
      console.warn(`Switching to fallback storage: ${reason}`);
      
      // Notify error handlers about the fallback
      this._notifyError(new Error(`Fallback storage activated: ${reason}`));
      
      // Try to migrate existing localStorage data to fallback
      this._migrateToFallback();
    }
  }

  /**
   * Migrate existing localStorage data to fallback storage
   */
  _migrateToFallback() {
    if (!this._isAvailable) {
      return;
    }

    try {
      const keysToMigrate = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToMigrate.push(key);
        }
      }

      keysToMigrate.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            this._fallbackStorage.set(key, data);
          }
        } catch (error) {
          console.warn(`Failed to migrate key "${key}" to fallback storage:`, error.message);
        }
      });

      console.log(`Migrated ${keysToMigrate.length} items to fallback storage`);
    } catch (error) {
      console.warn('Failed to migrate data to fallback storage:', error.message);
    }
  }

  /**
   * Attempt to clean up old data to free storage space
   */
  _attemptCleanup() {
    if (!this._isAvailable) {
      return false;
    }

    try {
      // Try to remove old settings or temporary data first
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToCheck.push(key);
        }
      }

      // Sort by data size and remove largest non-essential items first
      const keysSorted = keysToCheck.map(key => {
        const value = localStorage.getItem(key);
        return {
          key,
          size: value ? value.length : 0,
          isEssential: key.includes('tasks') || key.includes('projects')
        };
      }).sort((a, b) => {
        // Non-essential items first, then by size descending
        if (a.isEssential !== b.isEssential) {
          return a.isEssential ? 1 : -1;
        }
        return b.size - a.size;
      });

      // Remove up to 25% of non-essential data
      let removedCount = 0;
      const maxToRemove = Math.max(1, Math.floor(keysSorted.length * 0.25));

      for (const item of keysSorted) {
        if (!item.isEssential && removedCount < maxToRemove) {
          localStorage.removeItem(item.key);
          removedCount++;
        }
      }

      return removedCount > 0;
    } catch (error) {
      console.warn('Failed to cleanup storage:', error.message);
      return false;
    }
  }

  /**
   * Notify error handlers
   */
  _notifyError(error) {
    this._errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in storage error handler:', handlerError);
      }
    });
  }

  /**
   * Notify quota exceeded handlers
   */
  _notifyQuotaExceeded(error) {
    this._quotaExceededHandlers.forEach(handler => {
      try {
        handler(error, this.getStorageInfo());
      } catch (handlerError) {
        console.error('Error in quota exceeded handler:', handlerError);
      }
    });
  }

  /**
   * Get fallback storage status and information
   */
  getFallbackInfo() {
    return {
      isUsingFallback: this._usingFallback,
      fallbackSize: this._fallbackStorage.size,
      fallbackKeys: Array.from(this._fallbackStorage.keys()).filter(key => 
        key.startsWith(this.prefix)
      ),
      canMigrateBack: this._isAvailable && !this._quotaExceeded
    };
  }

  /**
   * Attempt to migrate back from fallback to localStorage
   */
  migrateBackToLocalStorage() {
    if (!this._isAvailable || this._quotaExceeded || !this._usingFallback) {
      return false;
    }

    try {
      const fallbackKeys = Array.from(this._fallbackStorage.keys()).filter(key => 
        key.startsWith(this.prefix)
      );

      let migratedCount = 0;
      for (const key of fallbackKeys) {
        try {
          const data = this._fallbackStorage.get(key);
          const serializedData = JSON.stringify(data);
          localStorage.setItem(key, serializedData);
          migratedCount++;
        } catch (error) {
          // If we hit quota again, stop migration
          if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('Quota exceeded during migration back to localStorage');
            return false;
          }
          console.warn(`Failed to migrate key "${key}" back to localStorage:`, error.message);
        }
      }

      if (migratedCount === fallbackKeys.length) {
        // Successfully migrated everything back
        this._usingFallback = false;
        this._fallbackStorage.clear();
        console.log(`Successfully migrated ${migratedCount} items back to localStorage`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to migrate back to localStorage:', error.message);
      return false;
    }
  }

  /**
   * Force recovery mode - clear corrupted data and reset to defaults
   */
  forceRecovery() {
    console.warn('Initiating force recovery mode');
    
    const recoveryResults = {
      localStorageCleared: false,
      fallbackCleared: false,
      defaultsRestored: false
    };

    // Clear localStorage
    try {
      if (this._isAvailable) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        recoveryResults.localStorageCleared = true;
      }
    } catch (error) {
      console.warn('Failed to clear localStorage during recovery:', error.message);
    }

    // Clear fallback storage
    try {
      const fallbackKeys = Array.from(this._fallbackStorage.keys()).filter(key => 
        key.startsWith(this.prefix)
      );
      fallbackKeys.forEach(key => this._fallbackStorage.delete(key));
      recoveryResults.fallbackCleared = true;
    } catch (error) {
      console.warn('Failed to clear fallback storage during recovery:', error.message);
    }

    // Reset state
    this._usingFallback = false;
    this._quotaExceeded = false;

    // Restore defaults
    try {
      const defaultSettings = {
        currentProjectId: 'default',
        theme: 'light',
        lastAccessed: new Date().toISOString()
      };
      this.saveSettings(defaultSettings);
      recoveryResults.defaultsRestored = true;
    } catch (error) {
      console.warn('Failed to restore default settings during recovery:', error.message);
    }

    return recoveryResults;
  }
}

// Export singleton instance
export const storageService = new StorageService();