import { describe, it, expect, beforeEach } from 'vitest';
import { Task } from '../../src/modules/models/Task.js';

describe('Task Model', () => {
  describe('Constructor', () => {
    it('should create a task with required fields', () => {
      const taskData = {
        title: 'Test Task'
      };
      
      const task = new Task(taskData);
      
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.priority).toBe('medium');
      expect(task.notes).toBe('');
      expect(task.checklist).toEqual([]);
      expect(task.completed).toBe(false);
      expect(task.projectId).toBe('default');
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a task with all fields', () => {
      const dueDate = new Date('2024-12-31');
      const checklist = [
        { text: 'Item 1', completed: false },
        { text: 'Item 2', completed: true }
      ];
      
      const taskData = {
        id: 'custom-id',
        title: 'Complete Task',
        description: 'Task description',
        dueDate: dueDate,
        priority: 'high',
        notes: 'Important notes',
        checklist: checklist,
        completed: true,
        projectId: 'project-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };
      
      const task = new Task(taskData);
      
      expect(task.id).toBe('custom-id');
      expect(task.title).toBe('Complete Task');
      expect(task.description).toBe('Task description');
      expect(task.dueDate).toEqual(dueDate);
      expect(task.priority).toBe('high');
      expect(task.notes).toBe('Important notes');
      expect(task.checklist).toHaveLength(2);
      expect(task.checklist[0].text).toBe('Item 1');
      expect(task.checklist[0].completed).toBe(false);
      expect(task.checklist[1].text).toBe('Item 2');
      expect(task.checklist[1].completed).toBe(true);
      expect(task.completed).toBe(true);
      expect(task.projectId).toBe('project-1');
    });

    it('should throw error for missing title', () => {
      expect(() => new Task({})).toThrow('Task title is required');
      expect(() => new Task({ title: '' })).toThrow('Task title is required');
      expect(() => new Task({ title: '   ' })).toThrow('Task title is required');
    });

    it('should throw error for invalid priority', () => {
      expect(() => new Task({ title: 'Test', priority: 'invalid' }))
        .toThrow('Priority must be one of: high, medium, low');
    });

    it('should throw error for invalid due date', () => {
      expect(() => new Task({ title: 'Test', dueDate: 'invalid-date' }))
        .toThrow('Due date must be a Date object, ISO string, or null');
    });

    it('should throw error for invalid checklist', () => {
      expect(() => new Task({ title: 'Test', checklist: 'not-array' }))
        .toThrow('Checklist must be an array');
    });

    it('should throw error for invalid checklist items', () => {
      expect(() => new Task({ 
        title: 'Test', 
        checklist: [{ completed: true }] 
      })).toThrow('Checklist item at index 0 must have a text property');
      
      expect(() => new Task({ 
        title: 'Test', 
        checklist: [{ text: 'Item', completed: 'not-boolean' }] 
      })).toThrow('Checklist item at index 0 must have a boolean completed property');
    });

    it('should trim whitespace from title', () => {
      const task = new Task({ title: '  Test Task  ' });
      expect(task.title).toBe('Test Task');
    });

    it('should handle date string input', () => {
      const task = new Task({ 
        title: 'Test', 
        dueDate: '2024-12-31T23:59:59.000Z' 
      });
      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.dueDate.getFullYear()).toBe(2024);
    });
  });

  describe('update method', () => {
    let task;

    beforeEach(() => {
      task = new Task({ title: 'Original Task' });
    });

    it('should update task properties', () => {
      const updates = {
        title: 'Updated Task',
        description: 'New description',
        priority: 'high'
      };

      task.update(updates);

      expect(task.title).toBe('Updated Task');
      expect(task.description).toBe('New description');
      expect(task.priority).toBe('high');
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate updated properties', () => {
      expect(() => task.update({ title: '' }))
        .toThrow('Task title is required');
      
      expect(() => task.update({ priority: 'invalid' }))
        .toThrow('Priority must be one of: high, medium, low');
    });

    it('should only update provided properties', () => {
      const originalTitle = task.title;
      task.update({ description: 'New description' });
      
      expect(task.title).toBe(originalTitle);
      expect(task.description).toBe('New description');
    });
  });

  describe('toggleCompletion method', () => {
    it('should toggle completion status', () => {
      const task = new Task({ title: 'Test Task' });
      
      expect(task.completed).toBe(false);
      
      task.toggleCompletion();
      expect(task.completed).toBe(true);
      
      task.toggleCompletion();
      expect(task.completed).toBe(false);
    });

    it('should update updatedAt timestamp', () => {
      const task = new Task({ title: 'Test Task' });
      const originalUpdatedAt = task.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        task.toggleCompletion();
        expect(task.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });
  });

  describe('checklist methods', () => {
    let task;

    beforeEach(() => {
      task = new Task({ title: 'Test Task' });
    });

    describe('addChecklistItem', () => {
      it('should add checklist item', () => {
        task.addChecklistItem('New item');
        
        expect(task.checklist).toHaveLength(1);
        expect(task.checklist[0].text).toBe('New item');
        expect(task.checklist[0].completed).toBe(false);
        expect(task.checklist[0].id).toBeDefined();
      });

      it('should throw error for empty text', () => {
        expect(() => task.addChecklistItem('')).toThrow('Checklist item text is required');
        expect(() => task.addChecklistItem('   ')).toThrow('Checklist item text is required');
      });

      it('should trim whitespace from text', () => {
        task.addChecklistItem('  Item text  ');
        expect(task.checklist[0].text).toBe('Item text');
      });
    });

    describe('updateChecklistItem', () => {
      beforeEach(() => {
        task.addChecklistItem('Test item');
      });

      it('should update checklist item text', () => {
        const itemId = task.checklist[0].id;
        task.updateChecklistItem(itemId, { text: 'Updated item' });
        
        expect(task.checklist[0].text).toBe('Updated item');
      });

      it('should update checklist item completion', () => {
        const itemId = task.checklist[0].id;
        task.updateChecklistItem(itemId, { completed: true });
        
        expect(task.checklist[0].completed).toBe(true);
      });

      it('should throw error for non-existent item', () => {
        expect(() => task.updateChecklistItem('invalid-id', { text: 'Updated' }))
          .toThrow('Checklist item not found');
      });

      it('should throw error for empty text', () => {
        const itemId = task.checklist[0].id;
        expect(() => task.updateChecklistItem(itemId, { text: '' }))
          .toThrow('Checklist item text is required');
      });
    });

    describe('removeChecklistItem', () => {
      beforeEach(() => {
        task.addChecklistItem('Item 1');
        task.addChecklistItem('Item 2');
      });

      it('should remove checklist item', () => {
        const itemId = task.checklist[0].id;
        task.removeChecklistItem(itemId);
        
        expect(task.checklist).toHaveLength(1);
        expect(task.checklist[0].text).toBe('Item 2');
      });

      it('should throw error for non-existent item', () => {
        expect(() => task.removeChecklistItem('invalid-id'))
          .toThrow('Checklist item not found');
      });
    });
  });

  describe('getChecklistProgress method', () => {
    let task;

    beforeEach(() => {
      task = new Task({ title: 'Test Task' });
    });

    it('should return zero progress for empty checklist', () => {
      const progress = task.getChecklistProgress();
      
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should calculate progress correctly', () => {
      task.addChecklistItem('Item 1');
      task.addChecklistItem('Item 2');
      task.addChecklistItem('Item 3');
      
      // Complete first item
      task.updateChecklistItem(task.checklist[0].id, { completed: true });
      
      const progress = task.getChecklistProgress();
      
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(33);
    });

    it('should handle 100% completion', () => {
      task.addChecklistItem('Item 1');
      task.addChecklistItem('Item 2');
      
      task.updateChecklistItem(task.checklist[0].id, { completed: true });
      task.updateChecklistItem(task.checklist[1].id, { completed: true });
      
      const progress = task.getChecklistProgress();
      
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('isOverdue method', () => {
    it('should return false for task without due date', () => {
      const task = new Task({ title: 'Test Task' });
      expect(task.isOverdue()).toBe(false);
    });

    it('should return false for completed task', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const task = new Task({ 
        title: 'Test Task', 
        dueDate: pastDate, 
        completed: true 
      });
      
      expect(task.isOverdue()).toBe(false);
    });

    it('should return true for past due date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const task = new Task({ 
        title: 'Test Task', 
        dueDate: pastDate 
      });
      
      expect(task.isOverdue()).toBe(true);
    });

    it('should return false for future due date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const task = new Task({ 
        title: 'Test Task', 
        dueDate: futureDate 
      });
      
      expect(task.isOverdue()).toBe(false);
    });
  });

  describe('toJSON method', () => {
    it('should serialize task to JSON-compatible object', () => {
      const dueDate = new Date('2024-12-31T23:59:59.000Z');
      const task = new Task({
        id: 'test-id',
        title: 'Test Task',
        description: 'Description',
        dueDate: dueDate,
        priority: 'high',
        notes: 'Notes',
        checklist: [{ text: 'Item', completed: false }],
        completed: true,
        projectId: 'project-1'
      });

      const json = task.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.title).toBe('Test Task');
      expect(json.description).toBe('Description');
      expect(json.dueDate).toBe(dueDate.toISOString());
      expect(json.priority).toBe('high');
      expect(json.notes).toBe('Notes');
      expect(json.checklist).toHaveLength(1);
      expect(json.completed).toBe(true);
      expect(json.projectId).toBe('project-1');
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });

    it('should handle null due date', () => {
      const task = new Task({ title: 'Test Task' });
      const json = task.toJSON();
      
      expect(json.dueDate).toBeNull();
    });
  });

  describe('fromJSON static method', () => {
    it('should create task from JSON data', () => {
      const jsonData = {
        id: 'test-id',
        title: 'Test Task',
        description: 'Description',
        dueDate: '2024-12-31T23:59:59.000Z',
        priority: 'high',
        notes: 'Notes',
        checklist: [{ text: 'Item', completed: false }],
        completed: true,
        projectId: 'project-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      };

      const task = Task.fromJSON(jsonData);

      expect(task.id).toBe('test-id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Description');
      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.priority).toBe('high');
      expect(task.notes).toBe('Notes');
      expect(task.checklist).toHaveLength(1);
      expect(task.completed).toBe(true);
      expect(task.projectId).toBe('project-1');
    });
  });

  describe('validate static method', () => {
    it('should return valid for correct data', () => {
      const validation = Task.validate({ title: 'Test Task' });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should return invalid for incorrect data', () => {
      const validation = Task.validate({ title: '' });
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
    });
  });
});