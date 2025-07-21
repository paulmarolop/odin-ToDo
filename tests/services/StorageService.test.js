import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../src/modules/services/StorageService.js';
import { Task } from '../../src/modules/models/Task.js';
import { Project } from '../../src/modules/models/Project.js';

describe('StorageService', () => {
  let storageService;
  let mockLocalStorage;

  beforeEach(() => {
    // Create fresh instance for each test
    storageService = new StorageService();
    
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
  });

  describe('Constructor', () => {
    it('should initialize with correct prefix and keys', () => {
      expect(storageService.prefix).toBe('todoapp_');
      expect(storageService.keys.tasks).toBe('todoapp_tasks');
      expect(storageService.keys.projects).toBe('todoapp_projects');
      expect(storageService.keys.settings).toBe('todoapp_settings');
    });

    it('should check localStorage availability on initialization', () => {
      expect(storageService.isAvailable()).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(storageService.isAvailable()).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const service = new StorageService();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('save and load', () => {
    it('should save and load data successfully', () => {
      const testData = { test: 'value', number: 123 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));
      
      const saveResult = storageService.save('test', testData);
      expect(saveResult).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'todoapp_test',
        JSON.stringify(testData)
      );
      
      const loadResult = storageService.load('test');
      expect(loadResult).toEqual(testData);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('todoapp_test');
    });

    it('should handle full key names', () => {
      const testData = { test: 'value' };
      
      storageService.save('todoapp_test', testData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'todoapp_test',
        JSON.stringify(testData)
      );
    });

    it('should return null for non-existent data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = storageService.load('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const result = storageService.load('test');
      expect(result).toBeNull();
    });

    it('should fall back to fallback storage when localStorage fails', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const testData = { test: 'value' };
      const result = storageService.save('test', testData);
      
      expect(result).toBe(true);
      expect(storageService.isUsingFallback()).toBe(true);
      
      const loadResult = storageService.load('test');
      expect(loadResult).toEqual(testData);
    });

    it('should handle quota exceeded error', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      const testData = { test: 'value' };
      const result = storageService.save('test', testData);
      
      expect(result).toBe(true);
      expect(storageService.isQuotaExceeded()).toBe(true);
      expect(storageService.isUsingFallback()).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove data from localStorage', () => {
      const result = storageService.remove('test');
      
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('todoapp_test');
    });

    it('should remove data from fallback storage', () => {
      // Set up fallback storage
      storageService._fallbackStorage.set('todoapp_test', { test: 'value' });
      
      const result = storageService.remove('test');
      
      expect(result).toBe(true);
      expect(storageService._fallbackStorage.has('todoapp_test')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all application data', () => {
      mockLocalStorage.key.mockImplementation((index) => {
        const keys = ['todoapp_tasks', 'todoapp_projects', 'other_key'];
        return keys[index] || null;
      });
      mockLocalStorage.length = 3;
      
      const result = storageService.clear();
      
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('todoapp_tasks');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('todoapp_projects');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other_key');
    });

    it('should clear fallback storage', () => {
      storageService._fallbackStorage.set('todoapp_test', { test: 'value' });
      storageService._fallbackStorage.set('other_key', { other: 'value' });
      
      const result = storageService.clear();
      
      expect(result).toBe(true);
      expect(storageService._fallbackStorage.has('todoapp_test')).toBe(false);
      expect(storageService._fallbackStorage.has('other_key')).toBe(true);
    });
  });

  describe('saveTasks and loadTasks', () => {
    it('should save and load tasks successfully', () => {
      const tasks = [
        new Task({ title: 'Task 1' }),
        new Task({ title: 'Task 2' })
      ];
      
      const serializedTasks = tasks.map(task => task.toJSON());
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(serializedTasks));
      
      const saveResult = storageService.saveTasks(tasks);
      expect(saveResult).toBe(true);
      
      const loadResult = storageService.loadTasks();
      expect(loadResult).toHaveLength(2);
      expect(loadResult[0]).toBeInstanceOf(Task);
      expect(loadResult[0].title).toBe('Task 1');
      expect(loadResult[1].title).toBe('Task 2');
    });

    it('should throw error for non-array tasks', () => {
      expect(() => storageService.saveTasks('not-array'))
        .toThrow('Tasks must be an array');
    });

    it('should throw error for non-Task instances', () => {
      expect(() => storageService.saveTasks([{ title: 'Not a Task' }]))
        .toThrow('All items must be Task instances');
    });

    it('should return empty array for no tasks data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = storageService.loadTasks();
      expect(result).toEqual([]);
    });

    it('should handle corrupted tasks data', () => {
      mockLocalStorage.getItem.mockReturnValue('not-json');
      
      const result = storageService.loadTasks();
      expect(result).toEqual([]);
    });

    it('should skip corrupted individual tasks', () => {
      const tasksData = [
        { title: 'Valid Task' },
        { /* missing title */ },
        { title: 'Another Valid Task' }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(tasksData));
      
      const result = storageService.loadTasks();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Valid Task');
      expect(result[1].title).toBe('Another Valid Task');
    });
  });

  describe('saveProjects and loadProjects', () => {
    it('should save and load projects successfully', () => {
      const projects = [
        new Project({ name: 'Project 1' }),
        new Project({ name: 'Project 2' })
      ];
      
      const serializedProjects = projects.map(project => project.toJSON());
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(serializedProjects));
      
      const saveResult = storageService.saveProjects(projects);
      expect(saveResult).toBe(true);
      
      const loadResult = storageService.loadProjects();
      expect(loadResult).toHaveLength(2);
      expect(loadResult[0]).toBeInstanceOf(Project);
      expect(loadResult[0].name).toBe('Project 1');
      expect(loadResult[1].name).toBe('Project 2');
    });

    it('should throw error for non-array projects', () => {
      expect(() => storageService.saveProjects('not-array'))
        .toThrow('Projects must be an array');
    });

    it('should throw error for non-Project instances', () => {
      expect(() => storageService.saveProjects([{ name: 'Not a Project' }]))
        .toThrow('All items must be Project instances');
    });

    it('should return empty array for no projects data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = storageService.loadProjects();
      expect(result).toEqual([]);
    });

    it('should skip corrupted individual projects', () => {
      const projectsData = [
        { name: 'Valid Project' },
        { /* missing name */ },
        { name: 'Another Valid Project' }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(projectsData));
      
      const result = storageService.loadProjects();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Valid Project');
      expect(result[1].name).toBe('Another Valid Project');
    });
  });

  describe('saveSettings and loadSettings', () => {
    it('should save and load settings successfully', () => {
      const settings = {
        currentProjectId: 'project-1',
        theme: 'dark',
        customSetting: 'value'
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(settings));
      
      const saveResult = storageService.saveSettings(settings);
      expect(saveResult).toBe(true);
      
      const loadResult = storageService.loadSettings();
      expect(loadResult.currentProjectId).toBe('project-1');
      expect(loadResult.theme).toBe('dark');
      expect(loadResult.customSetting).toBe('value');
    });

    it('should throw error for non-object settings', () => {
      expect(() => storageService.saveSettings('not-object'))
        .toThrow('Settings must be an object');
    });

    it('should return default settings for no settings data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = storageService.loadSettings();
      expect(result.currentProjectId).toBe('default');
      expect(result.theme).toBe('light');
      expect(result.lastAccessed).toBeDefined();
    });

    it('should merge with default settings', () => {
      const partialSettings = { theme: 'dark' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialSettings));
      
      const result = storageService.loadSettings();
      expect(result.currentProjectId).toBe('default');
      expect(result.theme).toBe('dark');
    });
  });

  describe('error handlers', () => {
    it('should add and remove error handlers', () => {
      const handler = vi.fn();
      
      storageService.addErrorHandler(handler);
      expect(storageService._errorHandlers.has(handler)).toBe(true);
      
      storageService.removeErrorHandler(handler);
      expect(storageService._errorHandlers.has(handler)).toBe(false);
    });

    it('should call error handlers on storage errors', () => {
      const handler = vi.fn();
      storageService.addErrorHandler(handler);
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      storageService.save('test', { data: 'test' });
      
      expect(handler).toHaveBeenCalled();
    });

    it('should add and remove quota exceeded handlers', () => {
      const handler = vi.fn();
      
      storageService.addQuotaExceededHandler(handler);
      expect(storageService._quotaExceededHandlers.has(handler)).toBe(true);
      
      storageService.removeQuotaExceededHandler(handler);
      expect(storageService._quotaExceededHandlers.has(handler)).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information when available', () => {
      mockLocalStorage.key.mockImplementation((index) => {
        const keys = ['todoapp_tasks', 'todoapp_projects'];
        return keys[index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key) => {
        return key === 'todoapp_tasks' ? '{"test":"data"}' : '{"other":"data"}';
      });
      mockLocalStorage.length = 2;
      
      const info = storageService.getStorageInfo();
      
      expect(info.available).toBe(true);
      expect(info.used).toBeGreaterThan(0);
      expect(info.total).toBeGreaterThan(0);
      expect(info.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should return unavailable info when localStorage is not available', () => {
      const service = new StorageService();
      service._isAvailable = false;
      
      const info = service.getStorageInfo();
      
      expect(info.available).toBe(false);
      expect(info.used).toBe(0);
      expect(info.total).toBe(0);
      expect(info.percentage).toBe(0);
    });
  });

  describe('validateDataIntegrity', () => {
    it('should validate all data types', () => {
      const validTasks = [new Task({ title: 'Valid Task' }).toJSON()];
      const validProjects = [new Project({ name: 'Valid Project' }).toJSON()];
      const validSettings = { currentProjectId: 'default', theme: 'light' };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') return JSON.stringify(validTasks);
        if (key === 'todoapp_projects') return JSON.stringify(validProjects);
        if (key === 'todoapp_settings') return JSON.stringify(validSettings);
        return null;
      });
      
      const result = storageService.validateDataIntegrity();
      
      expect(result.tasks.valid).toBe(true);
      expect(result.projects.valid).toBe(true);
      expect(result.settings.valid).toBe(true);
    });

    it('should detect invalid data', () => {
      const invalidTasks = [{ /* missing title */ }];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') return JSON.stringify(invalidTasks);
        return null;
      });
      
      const result = storageService.validateDataIntegrity();
      
      expect(result.tasks.valid).toBe(false);
      expect(result.tasks.errors.length).toBeGreaterThan(0);
    });
  });

  describe('repairData', () => {
    it('should repair corrupted tasks', () => {
      const mixedTasks = [
        { title: 'Valid Task' },
        { /* missing title */ },
        { title: 'Another Valid Task' }
      ];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_tasks') return JSON.stringify(mixedTasks);
        return null;
      });
      
      const result = storageService.repairData();
      
      expect(result.tasksRepaired).toBe(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should repair corrupted projects', () => {
      const mixedProjects = [
        { name: 'Valid Project' },
        { /* missing name */ },
        { name: 'Another Valid Project' }
      ];
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'todoapp_projects') return JSON.stringify(mixedProjects);
        return null;
      });
      
      const result = storageService.repairData();
      
      expect(result.projectsRepaired).toBe(1);
    });
  });

  describe('fallback storage', () => {
    it('should provide fallback info', () => {
      storageService._usingFallback = true;
      storageService._fallbackStorage.set('todoapp_test', { test: 'data' });
      
      const info = storageService.getFallbackInfo();
      
      expect(info.isUsingFallback).toBe(true);
      expect(info.fallbackSize).toBe(1);
      expect(info.fallbackKeys).toContain('todoapp_test');
    });

    it('should migrate back to localStorage when possible', () => {
      storageService._usingFallback = true;
      storageService._fallbackStorage.set('todoapp_test', { test: 'data' });
      
      const result = storageService.migrateBackToLocalStorage();
      
      expect(result).toBe(true);
      expect(storageService.isUsingFallback()).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('forceRecovery', () => {
    it('should clear all data and restore defaults', () => {
      mockLocalStorage.key.mockImplementation((index) => {
        const keys = ['todoapp_tasks', 'todoapp_projects'];
        return keys[index] || null;
      });
      mockLocalStorage.length = 2;
      
      storageService._fallbackStorage.set('todoapp_test', { test: 'data' });
      
      const result = storageService.forceRecovery();
      
      expect(result.localStorageCleared).toBe(true);
      expect(result.fallbackCleared).toBe(true);
      expect(result.defaultsRestored).toBe(true);
      expect(storageService.isUsingFallback()).toBe(false);
      expect(storageService.isQuotaExceeded()).toBe(false);
    });
  });
});