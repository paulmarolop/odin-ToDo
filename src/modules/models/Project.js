import { v4 as uuidv4 } from 'uuid';

/**
 * Project data model with validation and serialization
 */
export class Project {
  constructor({
    id = null,
    name,
    createdAt = null,
    taskCount = 0
  }) {
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Project name is required and must be a non-empty string');
    }

    // Validate taskCount
    if (typeof taskCount !== 'number' || taskCount < 0) {
      throw new Error('Task count must be a non-negative number');
    }

    // Set properties
    this.id = id || uuidv4();
    this.name = name.trim();
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.taskCount = taskCount;
  }

  /**
   * Update project properties
   */
  update(updates) {
    if (updates.name !== undefined) {
      if (!updates.name || typeof updates.name !== 'string' || updates.name.trim() === '') {
        throw new Error('Project name is required and must be a non-empty string');
      }
      this.name = updates.name.trim();
    }

    if (updates.taskCount !== undefined) {
      if (typeof updates.taskCount !== 'number' || updates.taskCount < 0) {
        throw new Error('Task count must be a non-negative number');
      }
      this.taskCount = updates.taskCount;
    }

    return this;
  }

  /**
   * Increment task count
   */
  incrementTaskCount() {
    this.taskCount++;
    return this;
  }

  /**
   * Decrement task count
   */
  decrementTaskCount() {
    if (this.taskCount > 0) {
      this.taskCount--;
    }
    return this;
  }

  /**
   * Set task count to specific value
   */
  setTaskCount(count) {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Task count must be a non-negative number');
    }
    this.taskCount = count;
    return this;
  }

  /**
   * Check if this is the default project
   */
  isDefault() {
    return this.id === 'default' || this.name.toLowerCase() === 'default';
  }

  /**
   * Serialize project to JSON-compatible object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      taskCount: this.taskCount
    };
  }

  /**
   * Create Project instance from JSON data
   */
  static fromJSON(data) {
    return new Project({
      id: data.id,
      name: data.name,
      createdAt: data.createdAt,
      taskCount: data.taskCount || 0
    });
  }

  /**
   * Validate project data structure
   */
  static validate(data) {
    try {
      new Project(data);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Create default project
   */
  static createDefault() {
    return new Project({
      id: 'default',
      name: 'All Tasks',
      createdAt: new Date(),
      taskCount: 0
    });
  }
}