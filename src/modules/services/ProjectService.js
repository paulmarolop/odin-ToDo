import { Project } from '../models/Project.js';
import { storageService } from './StorageService.js';
import { Validation } from '../utils/Validation.js';

/**
 * ProjectService handles all project-related business logic operations
 */
export class ProjectService {
  constructor() {
    this._projects = [];
    this._initialized = false;
  }

  /**
   * Initialize the service by loading existing projects and ensuring default project exists
   */
  async initialize() {
    if (this._initialized) {
      return;
    }

    try {
      this._projects = storageService.loadProjects();
      
      // Ensure default project exists
      await this._ensureDefaultProject();
      
      this._initialized = true;
    } catch (error) {
      console.error('Failed to initialize ProjectService:', error);
      this._projects = [];
      
      // Create default project even if loading failed
      try {
        await this._ensureDefaultProject();
      } catch (defaultError) {
        console.error('Failed to create default project:', defaultError);
      }
      
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
   * Create a new project
   */
  async createProject(name) {
    await this._ensureInitialized();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Project name is required and must be a non-empty string');
    }

    // Validate project data
    const validation = Validation.validateProjectData({ name });
    if (!validation.valid) {
      throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if project with same name already exists
    const existingProject = this._projects.find(p => 
      p.name.toLowerCase() === validation.data.name.toLowerCase()
    );
    
    if (existingProject) {
      throw new Error('A project with this name already exists');
    }

    try {
      // Create new project instance
      const project = new Project(validation.data);
      
      // Add to projects array
      this._projects.push(project);
      
      // Persist to storage
      await this._saveProjects();
      
      return project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Delete a project (cannot delete default project)
   */
  async deleteProject(projectId) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Cannot delete default project
    if (projectId === 'default') {
      throw new Error('Cannot delete the default project');
    }

    // Find project index
    const projectIndex = this._projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    try {
      // Remove project from array
      const deletedProject = this._projects.splice(projectIndex, 1)[0];
      
      // Persist to storage
      await this._saveProjects();
      
      return deletedProject;
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects() {
    await this._ensureInitialized();
    return [...this._projects];
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    return this._projects.find(project => project.id === projectId) || null;
  }

  /**
   * Update project task count
   */
  async updateProjectTaskCount(projectId, taskCount = null) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Find the project
    const project = this._projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      if (taskCount !== null) {
        // Set specific task count
        if (typeof taskCount !== 'number' || taskCount < 0) {
          throw new Error('Task count must be a non-negative number');
        }
        project.setTaskCount(taskCount);
      } else {
        // Calculate task count from TaskService
        // This would require TaskService integration, but to avoid circular dependency,
        // we'll accept the count as a parameter
        throw new Error('Task count must be provided');
      }
      
      // Persist to storage
      await this._saveProjects();
      
      return project;
    } catch (error) {
      throw new Error(`Failed to update project task count: ${error.message}`);
    }
  }

  /**
   * Increment project task count
   */
  async incrementProjectTaskCount(projectId) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Find the project
    const project = this._projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      project.incrementTaskCount();
      
      // Persist to storage
      await this._saveProjects();
      
      return project;
    } catch (error) {
      throw new Error(`Failed to increment project task count: ${error.message}`);
    }
  }

  /**
   * Decrement project task count
   */
  async decrementProjectTaskCount(projectId) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Find the project
    const project = this._projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      project.decrementTaskCount();
      
      // Persist to storage
      await this._saveProjects();
      
      return project;
    } catch (error) {
      throw new Error(`Failed to decrement project task count: ${error.message}`);
    }
  }

  /**
   * Update project name
   */
  async updateProjectName(projectId, newName) {
    await this._ensureInitialized();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    if (!newName || typeof newName !== 'string' || newName.trim() === '') {
      throw new Error('Project name is required and must be a non-empty string');
    }

    // Find the project
    const project = this._projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Validate new name
    const validation = Validation.validateProjectData({ name: newName });
    if (!validation.valid) {
      throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if another project with same name already exists
    const existingProject = this._projects.find(p => 
      p.id !== projectId && p.name.toLowerCase() === validation.data.name.toLowerCase()
    );
    
    if (existingProject) {
      throw new Error('A project with this name already exists');
    }

    try {
      project.update({ name: validation.data.name });
      
      // Persist to storage
      await this._saveProjects();
      
      return project;
    } catch (error) {
      throw new Error(`Failed to update project name: ${error.message}`);
    }
  }

  /**
   * Get default project
   */
  async getDefaultProject() {
    await this._ensureInitialized();
    
    let defaultProject = this._projects.find(p => p.id === 'default');
    
    if (!defaultProject) {
      // Create default project if it doesn't exist
      defaultProject = await this._createDefaultProject();
    }
    
    return defaultProject;
  }

  /**
   * Get projects sorted by name or creation date
   */
  async getProjectsSorted(sortBy = 'name', sortOrder = 'asc') {
    await this._ensureInitialized();

    const projects = [...this._projects];

    projects.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'taskCount':
          aValue = a.taskCount;
          bValue = b.taskCount;
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

    return projects;
  }

  /**
   * Get project statistics
   */
  async getProjectStats() {
    await this._ensureInitialized();

    const stats = {
      total: this._projects.length,
      totalTasks: this._projects.reduce((sum, project) => sum + project.taskCount, 0),
      averageTasksPerProject: 0,
      projectsWithTasks: this._projects.filter(p => p.taskCount > 0).length,
      emptyProjects: this._projects.filter(p => p.taskCount === 0).length
    };

    stats.averageTasksPerProject = stats.total > 0 ? 
      Math.round((stats.totalTasks / stats.total) * 100) / 100 : 0;

    return stats;
  }

  /**
   * Search projects by name
   */
  async searchProjects(searchTerm) {
    await this._ensureInitialized();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return this._projects;
    }

    const term = searchTerm.toLowerCase().trim();
    if (term === '') {
      return this._projects;
    }

    return this._projects.filter(project => 
      project.name.toLowerCase().includes(term)
    );
  }

  /**
   * Check if project exists
   */
  async projectExists(projectId) {
    await this._ensureInitialized();

    if (!projectId) {
      return false;
    }

    return this._projects.some(project => project.id === projectId);
  }

  /**
   * Check if project name is available
   */
  async isProjectNameAvailable(name, excludeProjectId = null) {
    await this._ensureInitialized();

    if (!name || typeof name !== 'string') {
      return false;
    }

    const normalizedName = name.toLowerCase().trim();
    
    return !this._projects.some(project => 
      project.name.toLowerCase() === normalizedName && 
      project.id !== excludeProjectId
    );
  }

  /**
   * Bulk update project task counts (useful when syncing with TaskService)
   */
  async bulkUpdateTaskCounts(projectTaskCounts) {
    await this._ensureInitialized();

    if (!projectTaskCounts || typeof projectTaskCounts !== 'object') {
      throw new Error('Project task counts must be an object');
    }

    const updatedProjects = [];
    const errors = [];

    for (const [projectId, taskCount] of Object.entries(projectTaskCounts)) {
      try {
        const project = await this.updateProjectTaskCount(projectId, taskCount);
        updatedProjects.push(project);
      } catch (error) {
        errors.push({ projectId, error: error.message });
      }
    }

    return {
      updated: updatedProjects,
      errors: errors,
      success: errors.length === 0
    };
  }

  /**
   * Sync project task counts with actual task data
   * This method accepts a callback function that returns task count for a project
   */
  async syncTaskCounts(getTaskCountForProject) {
    await this._ensureInitialized();

    if (typeof getTaskCountForProject !== 'function') {
      throw new Error('getTaskCountForProject must be a function');
    }

    const syncResults = {
      updated: [],
      errors: [],
      totalSynced: 0
    };

    for (const project of this._projects) {
      try {
        let actualTaskCount;
        
        if (project.id === 'default') {
          // For default project, get count of ALL tasks
          actualTaskCount = await getTaskCountForProject('all');
        } else {
          // For other projects, get count of tasks in that project
          actualTaskCount = await getTaskCountForProject(project.id);
        }
        
        if (typeof actualTaskCount === 'number' && actualTaskCount >= 0) {
          if (project.taskCount !== actualTaskCount) {
            project.setTaskCount(actualTaskCount);
            syncResults.updated.push({
              projectId: project.id,
              oldCount: project.taskCount,
              newCount: actualTaskCount
            });
            syncResults.totalSynced++;
          }
        }
      } catch (error) {
        syncResults.errors.push({
          projectId: project.id,
          error: error.message
        });
      }
    }

    if (syncResults.totalSynced > 0) {
      try {
        await this._saveProjects();
      } catch (error) {
        throw new Error(`Failed to save synced project data: ${error.message}`);
      }
    }

    return syncResults;
  }

  /**
   * Private method to ensure default project exists
   */
  async _ensureDefaultProject() {
    const defaultProject = this._projects.find(p => p.id === 'default');
    
    if (!defaultProject) {
      await this._createDefaultProject();
    }
  }

  /**
   * Private method to create default project
   */
  async _createDefaultProject() {
    try {
      const defaultProject = Project.createDefault();
      this._projects.unshift(defaultProject); // Add at beginning
      await this._saveProjects();
      return defaultProject;
    } catch (error) {
      throw new Error(`Failed to create default project: ${error.message}`);
    }
  }

  /**
   * Private method to save projects to storage
   */
  async _saveProjects() {
    try {
      storageService.saveProjects(this._projects);
    } catch (error) {
      throw new Error(`Failed to save projects to storage: ${error.message}`);
    }
  }

  /**
   * Refresh projects from storage (useful for syncing)
   */
  async refreshFromStorage() {
    try {
      this._projects = storageService.loadProjects();
      await this._ensureDefaultProject();
    } catch (error) {
      console.error('Failed to refresh projects from storage:', error);
      throw new Error(`Failed to refresh projects: ${error.message}`);
    }
  }

  /**
   * Get service status and information
   */
  getServiceInfo() {
    return {
      initialized: this._initialized,
      projectCount: this._projects.length,
      hasDefaultProject: this._projects.some(p => p.id === 'default'),
      storageAvailable: storageService.isAvailable(),
      usingFallback: storageService.isUsingFallback()
    };
  }

  /**
   * Export projects data for backup
   */
  async exportProjects() {
    await this._ensureInitialized();
    
    return {
      projects: this._projects.map(project => project.toJSON()),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import projects data from backup
   */
  async importProjects(importData, options = { merge: false, overwrite: false }) {
    await this._ensureInitialized();

    if (!importData || !importData.projects || !Array.isArray(importData.projects)) {
      throw new Error('Invalid import data format');
    }

    const importResults = {
      imported: [],
      skipped: [],
      errors: [],
      success: false
    };

    try {
      if (!options.merge) {
        // Clear existing projects (except default)
        this._projects = this._projects.filter(p => p.id === 'default');
      }

      for (const projectData of importData.projects) {
        try {
          // Skip default project in import to avoid conflicts
          if (projectData.id === 'default') {
            importResults.skipped.push({
              project: projectData,
              reason: 'Default project skipped'
            });
            continue;
          }

          const existingProject = this._projects.find(p => p.id === projectData.id);
          
          if (existingProject && !options.overwrite) {
            importResults.skipped.push({
              project: projectData,
              reason: 'Project already exists'
            });
            continue;
          }

          const project = Project.fromJSON(projectData);
          
          if (existingProject && options.overwrite) {
            // Replace existing project
            const index = this._projects.findIndex(p => p.id === projectData.id);
            this._projects[index] = project;
          } else {
            // Add new project
            this._projects.push(project);
          }

          importResults.imported.push(project);
        } catch (error) {
          importResults.errors.push({
            project: projectData,
            error: error.message
          });
        }
      }

      // Save imported projects
      await this._saveProjects();
      importResults.success = true;

    } catch (error) {
      throw new Error(`Failed to import projects: ${error.message}`);
    }

    return importResults;
  }
}

// Export singleton instance
export const projectService = new ProjectService();