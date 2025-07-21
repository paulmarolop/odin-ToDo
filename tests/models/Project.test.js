import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from '../../src/modules/models/Project.js';

describe('Project Model', () => {
  describe('Constructor', () => {
    it('should create a project with required fields', () => {
      const projectData = {
        name: 'Test Project'
      };
      
      const project = new Project(projectData);
      
      expect(project.name).toBe('Test Project');
      expect(project.taskCount).toBe(0);
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it('should create a project with all fields', () => {
      const projectData = {
        id: 'custom-id',
        name: 'Complete Project',
        createdAt: new Date('2024-01-01'),
        taskCount: 5
      };
      
      const project = new Project(projectData);
      
      expect(project.id).toBe('custom-id');
      expect(project.name).toBe('Complete Project');
      expect(project.taskCount).toBe(5);
      expect(project.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('should throw error for missing name', () => {
      expect(() => new Project({})).toThrow('Project name is required');
      expect(() => new Project({ name: '' })).toThrow('Project name is required');
      expect(() => new Project({ name: '   ' })).toThrow('Project name is required');
    });

    it('should throw error for invalid task count', () => {
      expect(() => new Project({ name: 'Test', taskCount: -1 }))
        .toThrow('Task count must be a non-negative number');
      
      expect(() => new Project({ name: 'Test', taskCount: 'invalid' }))
        .toThrow('Task count must be a non-negative number');
    });

    it('should trim whitespace from name', () => {
      const project = new Project({ name: '  Test Project  ' });
      expect(project.name).toBe('Test Project');
    });

    it('should handle date string input', () => {
      const project = new Project({ 
        name: 'Test', 
        createdAt: '2024-01-01T00:00:00.000Z' 
      });
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('update method', () => {
    let project;

    beforeEach(() => {
      project = new Project({ name: 'Original Project' });
    });

    it('should update project name', () => {
      project.update({ name: 'Updated Project' });
      expect(project.name).toBe('Updated Project');
    });

    it('should update task count', () => {
      project.update({ taskCount: 10 });
      expect(project.taskCount).toBe(10);
    });

    it('should validate updated name', () => {
      expect(() => project.update({ name: '' }))
        .toThrow('Project name is required');
      
      expect(() => project.update({ name: '   ' }))
        .toThrow('Project name is required');
    });

    it('should validate updated task count', () => {
      expect(() => project.update({ taskCount: -1 }))
        .toThrow('Task count must be a non-negative number');
      
      expect(() => project.update({ taskCount: 'invalid' }))
        .toThrow('Task count must be a non-negative number');
    });

    it('should only update provided properties', () => {
      const originalName = project.name;
      project.update({ taskCount: 5 });
      
      expect(project.name).toBe(originalName);
      expect(project.taskCount).toBe(5);
    });

    it('should trim whitespace from updated name', () => {
      project.update({ name: '  Updated Project  ' });
      expect(project.name).toBe('Updated Project');
    });
  });

  describe('task count methods', () => {
    let project;

    beforeEach(() => {
      project = new Project({ name: 'Test Project', taskCount: 5 });
    });

    describe('incrementTaskCount', () => {
      it('should increment task count', () => {
        project.incrementTaskCount();
        expect(project.taskCount).toBe(6);
      });

      it('should return the project instance', () => {
        const result = project.incrementTaskCount();
        expect(result).toBe(project);
      });
    });

    describe('decrementTaskCount', () => {
      it('should decrement task count', () => {
        project.decrementTaskCount();
        expect(project.taskCount).toBe(4);
      });

      it('should not go below zero', () => {
        const zeroProject = new Project({ name: 'Test', taskCount: 0 });
        zeroProject.decrementTaskCount();
        expect(zeroProject.taskCount).toBe(0);
      });

      it('should return the project instance', () => {
        const result = project.decrementTaskCount();
        expect(result).toBe(project);
      });
    });

    describe('setTaskCount', () => {
      it('should set task count to specific value', () => {
        project.setTaskCount(10);
        expect(project.taskCount).toBe(10);
      });

      it('should throw error for negative value', () => {
        expect(() => project.setTaskCount(-1))
          .toThrow('Task count must be a non-negative number');
      });

      it('should throw error for non-number value', () => {
        expect(() => project.setTaskCount('invalid'))
          .toThrow('Task count must be a non-negative number');
      });

      it('should return the project instance', () => {
        const result = project.setTaskCount(10);
        expect(result).toBe(project);
      });
    });
  });

  describe('isDefault method', () => {
    it('should return true for default project by id', () => {
      const project = new Project({ id: 'default', name: 'Default' });
      expect(project.isDefault()).toBe(true);
    });

    it('should return true for default project by name', () => {
      const project = new Project({ name: 'Default' });
      expect(project.isDefault()).toBe(true);
      
      const project2 = new Project({ name: 'default' });
      expect(project2.isDefault()).toBe(true);
    });

    it('should return false for non-default project', () => {
      const project = new Project({ name: 'Custom Project' });
      expect(project.isDefault()).toBe(false);
    });
  });

  describe('toJSON method', () => {
    it('should serialize project to JSON-compatible object', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const project = new Project({
        id: 'test-id',
        name: 'Test Project',
        createdAt: createdAt,
        taskCount: 5
      });

      const json = project.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.name).toBe('Test Project');
      expect(json.createdAt).toBe(createdAt.toISOString());
      expect(json.taskCount).toBe(5);
    });
  });

  describe('fromJSON static method', () => {
    it('should create project from JSON data', () => {
      const jsonData = {
        id: 'test-id',
        name: 'Test Project',
        createdAt: '2024-01-01T00:00:00.000Z',
        taskCount: 5
      };

      const project = Project.fromJSON(jsonData);

      expect(project.id).toBe('test-id');
      expect(project.name).toBe('Test Project');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.taskCount).toBe(5);
    });

    it('should handle missing taskCount', () => {
      const jsonData = {
        id: 'test-id',
        name: 'Test Project',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      const project = Project.fromJSON(jsonData);
      expect(project.taskCount).toBe(0);
    });
  });

  describe('validate static method', () => {
    it('should return valid for correct data', () => {
      const validation = Project.validate({ name: 'Test Project' });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should return invalid for incorrect data', () => {
      const validation = Project.validate({ name: '' });
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
    });

    it('should return invalid for negative task count', () => {
      const validation = Project.validate({ 
        name: 'Test Project', 
        taskCount: -1 
      });
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Task count must be a non-negative number');
    });
  });

  describe('createDefault static method', () => {
    it('should create default project', () => {
      const defaultProject = Project.createDefault();
      
      expect(defaultProject.id).toBe('default');
      expect(defaultProject.name).toBe('Default');
      expect(defaultProject.taskCount).toBe(0);
      expect(defaultProject.createdAt).toBeInstanceOf(Date);
    });

    it('should be identified as default project', () => {
      const defaultProject = Project.createDefault();
      expect(defaultProject.isDefault()).toBe(true);
    });
  });
});