import { v4 as uuidv4 } from 'uuid';

/**
 * Task data model with validation and serialization
 */
export class Task {
  constructor({
    id = null,
    title,
    description = '',
    dueDate = null,
    priority = 'medium',
    notes = '',
    checklist = [],
    completed = false,
    projectId = 'default',
    createdAt = null,
    updatedAt = null
  }) {
    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new Error('Task title is required and must be a non-empty string');
    }

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    // Validate dueDate if provided
    if (dueDate !== null && !(dueDate instanceof Date) && typeof dueDate !== 'string') {
      throw new Error('Due date must be a Date object, ISO string, or null');
    }

    // Validate checklist format
    if (!Array.isArray(checklist)) {
      throw new Error('Checklist must be an array');
    }

    // Validate each checklist item
    checklist.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Checklist item at index ${index} must be an object`);
      }
      if (!item.text || typeof item.text !== 'string') {
        throw new Error(`Checklist item at index ${index} must have a text property`);
      }
      if (typeof item.completed !== 'boolean') {
        throw new Error(`Checklist item at index ${index} must have a boolean completed property`);
      }
    });

    // Set properties
    this.id = id || uuidv4();
    this.title = title.trim();
    this.description = description || '';
    this.dueDate = dueDate ? (dueDate instanceof Date ? dueDate : new Date(dueDate)) : null;
    this.priority = priority;
    this.notes = notes || '';
    this.checklist = checklist.map(item => ({
      id: item.id || uuidv4(),
      text: item.text.trim(),
      completed: Boolean(item.completed)
    }));
    this.completed = Boolean(completed);
    this.projectId = projectId || 'default';
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  /**
   * Update task properties
   */
  update(updates) {
    // Create a new task with updated properties
    const updatedData = {
      id: this.id,
      title: updates.title !== undefined ? updates.title : this.title,
      description: updates.description !== undefined ? updates.description : this.description,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : this.dueDate,
      priority: updates.priority !== undefined ? updates.priority : this.priority,
      notes: updates.notes !== undefined ? updates.notes : this.notes,
      checklist: updates.checklist !== undefined ? updates.checklist : this.checklist,
      completed: updates.completed !== undefined ? updates.completed : this.completed,
      projectId: updates.projectId !== undefined ? updates.projectId : this.projectId,
      createdAt: this.createdAt,
      updatedAt: new Date()
    };

    // Validate and update properties
    const updatedTask = new Task(updatedData);
    Object.assign(this, updatedTask);
    return this;
  }

  /**
   * Toggle task completion status
   */
  toggleCompletion() {
    this.completed = !this.completed;
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Add checklist item
   */
  addChecklistItem(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Checklist item text is required');
    }

    this.checklist.push({
      id: uuidv4(),
      text: text.trim(),
      completed: false
    });
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Update checklist item
   */
  updateChecklistItem(itemId, updates) {
    const item = this.checklist.find(item => item.id === itemId);
    if (!item) {
      throw new Error('Checklist item not found');
    }

    if (updates.text !== undefined) {
      if (!updates.text || typeof updates.text !== 'string' || updates.text.trim() === '') {
        throw new Error('Checklist item text is required');
      }
      item.text = updates.text.trim();
    }

    if (updates.completed !== undefined) {
      item.completed = Boolean(updates.completed);
    }

    this.updatedAt = new Date();
    return this;
  }

  /**
   * Remove checklist item
   */
  removeChecklistItem(itemId) {
    const index = this.checklist.findIndex(item => item.id === itemId);
    if (index === -1) {
      throw new Error('Checklist item not found');
    }

    this.checklist.splice(index, 1);
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Get checklist completion progress
   */
  getChecklistProgress() {
    if (this.checklist.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = this.checklist.filter(item => item.completed).length;
    const total = this.checklist.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }

  /**
   * Check if task is overdue
   */
  isOverdue() {
    if (!this.dueDate || this.completed) {
      return false;
    }
    return new Date() > this.dueDate;
  }

  /**
   * Serialize task to JSON-compatible object
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      priority: this.priority,
      notes: this.notes,
      checklist: this.checklist,
      completed: this.completed,
      projectId: this.projectId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Create Task instance from JSON data
   */
  static fromJSON(data) {
    return new Task({
      id: data.id,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority,
      notes: data.notes,
      checklist: data.checklist || [],
      completed: data.completed,
      projectId: data.projectId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  /**
   * Validate task data structure
   */
  static validate(data) {
    try {
      new Task(data);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }
}