import { describe, it, expect } from 'vitest';
import { Validation } from '../../src/modules/utils/Validation.js';

describe('Validation Utility', () => {
  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(Validation.sanitizeText('  hello world  ')).toBe('hello world');
    });

    it('should remove harmful characters', () => {
      expect(Validation.sanitizeText('hello<script>alert("xss")</script>world'))
        .toBe('helloscriptalert("xss")/scriptworld');
    });

    it('should limit length when specified', () => {
      expect(Validation.sanitizeText('hello world', 5)).toBe('hello');
    });

    it('should return empty string for non-string input', () => {
      expect(Validation.sanitizeText(null)).toBe('');
      expect(Validation.sanitizeText(undefined)).toBe('');
      expect(Validation.sanitizeText(123)).toBe('');
    });
  });

  describe('validateRequired', () => {
    it('should validate required field with valid input', () => {
      const result = Validation.validateRequired('test value');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.value).toBe('test value');
    });

    it('should fail validation for empty input', () => {
      const result = Validation.validateRequired('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Field is required');
      expect(result.value).toBe('');
    });

    it('should fail validation for whitespace-only input', () => {
      const result = Validation.validateRequired('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Field is required');
      expect(result.value).toBe('');
    });

    it('should use custom field name in error message', () => {
      const result = Validation.validateRequired('', 'Title');
      
      expect(result.error).toBe('Title is required');
    });

    it('should trim input value', () => {
      const result = Validation.validateRequired('  test  ');
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe('test');
    });
  });

  describe('validateLength', () => {
    it('should validate length within bounds', () => {
      const result = Validation.validateLength('hello', 3, 10);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.value).toBe('hello');
    });

    it('should fail validation for too short input', () => {
      const result = Validation.validateLength('hi', 5, 10, 'Password');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 5 characters long');
    });

    it('should fail validation for too long input', () => {
      const result = Validation.validateLength('very long text', 0, 5, 'Title');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title must be no more than 5 characters long');
    });

    it('should handle no maximum length', () => {
      const result = Validation.validateLength('any length text', 5);
      
      expect(result.valid).toBe(true);
    });

    it('should trim input value', () => {
      const result = Validation.validateLength('  test  ', 3, 10);
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe('test');
    });
  });

  describe('validatePriority', () => {
    it('should validate valid priorities', () => {
      ['high', 'medium', 'low'].forEach(priority => {
        const result = Validation.validatePriority(priority);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(priority);
      });
    });

    it('should handle case insensitive input', () => {
      const result = Validation.validatePriority('HIGH');
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe('high');
    });

    it('should fail validation for invalid priority', () => {
      const result = Validation.validatePriority('urgent');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Priority must be one of: high, medium, low');
      expect(result.value).toBe('medium');
    });

    it('should fail validation for empty priority', () => {
      const result = Validation.validatePriority('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Priority is required');
      expect(result.value).toBe('medium');
    });

    it('should trim whitespace', () => {
      const result = Validation.validatePriority('  high  ');
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe('high');
    });
  });

  describe('validateDate', () => {
    it('should validate Date object', () => {
      const date = new Date('2024-01-01');
      const result = Validation.validateDate(date);
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe(date);
    });

    it('should validate ISO date string', () => {
      const result = Validation.validateDate('2024-01-01T00:00:00.000Z');
      
      expect(result.valid).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
    });

    it('should handle null date', () => {
      const result = Validation.validateDate(null);
      
      expect(result.valid).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should fail validation for invalid date string', () => {
      const result = Validation.validateDate('invalid-date');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Date must be a valid date');
      expect(result.value).toBeNull();
    });

    it('should fail validation for invalid Date object', () => {
      const result = Validation.validateDate(new Date('invalid'));
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Date must be a valid date');
      expect(result.value).toBeNull();
    });

    it('should use custom field name in error message', () => {
      const result = Validation.validateDate('invalid', 'Due Date');
      
      expect(result.error).toBe('Due Date must be a valid date');
    });
  });

  describe('validateChecklist', () => {
    it('should validate empty checklist', () => {
      const result = Validation.validateChecklist([]);
      
      expect(result.valid).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should validate null checklist', () => {
      const result = Validation.validateChecklist(null);
      
      expect(result.valid).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should validate valid checklist items', () => {
      const checklist = [
        { text: 'Item 1', completed: false },
        { text: 'Item 2', completed: true }
      ];
      
      const result = Validation.validateChecklist(checklist);
      
      expect(result.valid).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].text).toBe('Item 1');
      expect(result.value[0].completed).toBe(false);
      expect(result.value[1].text).toBe('Item 2');
      expect(result.value[1].completed).toBe(true);
    });

    it('should fail validation for non-array input', () => {
      const result = Validation.validateChecklist('not-array');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Checklist must be an array');
    });

    it('should fail validation for invalid checklist items', () => {
      const checklist = [
        { completed: false }, // missing text
        { text: 'Item 2', completed: 'not-boolean' }
      ];
      
      const result = Validation.validateChecklist(checklist);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Checklist item 1 text is required');
    });

    it('should trim whitespace from item text', () => {
      const checklist = [
        { text: '  Item 1  ', completed: false }
      ];
      
      const result = Validation.validateChecklist(checklist);
      
      expect(result.valid).toBe(true);
      expect(result.value[0].text).toBe('Item 1');
    });

    it('should convert completed to boolean', () => {
      const checklist = [
        { text: 'Item 1', completed: 'true' },
        { text: 'Item 2', completed: 0 }
      ];
      
      const result = Validation.validateChecklist(checklist);
      
      expect(result.valid).toBe(true);
      expect(result.value[0].completed).toBe(true);
      expect(result.value[1].completed).toBe(false);
    });
  });

  describe('validateTaskData', () => {
    it('should validate complete task data', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        dueDate: new Date('2024-12-31'),
        priority: 'high',
        notes: 'Test notes',
        checklist: [{ text: 'Item 1', completed: false }],
        projectId: 'project-1'
      };
      
      const result = Validation.validateTaskData(taskData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data.title).toBe('Test Task');
      expect(result.data.priority).toBe('high');
    });

    it('should validate minimal task data', () => {
      const taskData = {
        title: 'Test Task'
      };
      
      const result = Validation.validateTaskData(taskData);
      
      expect(result.valid).toBe(true);
      expect(result.data.title).toBe('Test Task');
      expect(result.data.priority).toBe('medium');
    });

    it('should fail validation for missing title', () => {
      const result = Validation.validateTaskData({});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should fail validation for invalid priority', () => {
      const result = Validation.validateTaskData({
        title: 'Test Task',
        priority: 'invalid'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Priority must be one of: high, medium, low');
    });

    it('should validate field lengths', () => {
      const longTitle = 'a'.repeat(201);
      const result = Validation.validateTaskData({
        title: longTitle
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be no more than 200 characters long');
    });
  });

  describe('validateProjectData', () => {
    it('should validate complete project data', () => {
      const projectData = {
        name: 'Test Project',
        taskCount: 5
      };
      
      const result = Validation.validateProjectData(projectData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data.name).toBe('Test Project');
      expect(result.data.taskCount).toBe(5);
    });

    it('should validate minimal project data', () => {
      const projectData = {
        name: 'Test Project'
      };
      
      const result = Validation.validateProjectData(projectData);
      
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('Test Project');
    });

    it('should fail validation for missing name', () => {
      const result = Validation.validateProjectData({});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should fail validation for invalid task count', () => {
      const result = Validation.validateProjectData({
        name: 'Test Project',
        taskCount: -1
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task count must be a non-negative number');
    });
  });

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const html = 'Hello <script>alert("xss")</script> World';
      const result = Validation.sanitizeHTML(html);
      
      expect(result).toBe('Hello  World');
    });

    it('should remove dangerous attributes', () => {
      const html = '<div onclick="alert(\'xss\')" onload="malicious()">Content</div>';
      const result = Validation.sanitizeHTML(html);
      
      expect(result).toBe('<div >Content</div>');
    });

    it('should remove javascript: protocols', () => {
      const html = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = Validation.sanitizeHTML(html);
      
      expect(result).toBe('<a href=":alert(\'xss\')">Link</a>');
    });

    it('should return empty string for non-string input', () => {
      expect(Validation.sanitizeHTML(null)).toBe('');
      expect(Validation.sanitizeHTML(undefined)).toBe('');
      expect(Validation.sanitizeHTML(123)).toBe('');
    });
  });

  describe('validateForm', () => {
    it('should validate form with all rules', () => {
      const formData = {
        title: 'Test Title',
        description: 'Test description',
        email: 'test@example.com'
      };
      
      const rules = {
        title: { required: true, minLength: 3, maxLength: 50, label: 'Title' },
        description: { required: false, maxLength: 200 },
        email: { 
          required: true, 
          validator: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? 
              { valid: true } : 
              { valid: false, error: 'Invalid email format' };
          }
        }
      };
      
      const result = Validation.validateForm(formData, rules);
      
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(result.data.title).toBe('Test Title');
      expect(result.data.description).toBe('Test description');
      expect(result.data.email).toBe('test@example.com');
    });

    it('should fail validation for required fields', () => {
      const formData = {
        description: 'Test description'
      };
      
      const rules = {
        title: { required: true, label: 'Title' },
        description: { required: false }
      };
      
      const result = Validation.validateForm(formData, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBe('Title is required');
    });

    it('should fail validation for length constraints', () => {
      const formData = {
        title: 'ab' // too short
      };
      
      const rules = {
        title: { required: true, minLength: 3, label: 'Title' }
      };
      
      const result = Validation.validateForm(formData, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBe('Title must be at least 3 characters long');
    });

    it('should fail validation for custom validator', () => {
      const formData = {
        email: 'invalid-email'
      };
      
      const rules = {
        email: {
          required: true,
          validator: (value) => ({
            valid: false,
            error: 'Invalid email format'
          })
        }
      };
      
      const result = Validation.validateForm(formData, rules);
      
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Invalid email format');
    });
  });
});