import { v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * UUID utility functions for generating and validating unique identifiers
 */
export class UUIDUtils {
  /**
   * Generate a new UUID v4
   */
  static generate() {
    return uuidv4();
  }

  /**
   * Validate if a string is a valid UUID
   */
  static isValid(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    
    return uuidValidate(uuid);
  }

  /**
   * Get UUID version
   */
  static getVersion(uuid) {
    if (!this.isValid(uuid)) {
      return null;
    }
    
    return uuidVersion(uuid);
  }

  /**
   * Generate a short UUID (first 8 characters)
   * Note: This reduces uniqueness, use only when appropriate
   */
  static generateShort() {
    return uuidv4().substring(0, 8);
  }

  /**
   * Generate multiple UUIDs
   */
  static generateMultiple(count) {
    if (typeof count !== 'number' || count < 1) {
      throw new Error('Count must be a positive number');
    }
    
    const uuids = [];
    for (let i = 0; i < count; i++) {
      uuids.push(uuidv4());
    }
    
    return uuids;
  }

  /**
   * Check if UUID is version 4
   */
  static isV4(uuid) {
    return this.isValid(uuid) && this.getVersion(uuid) === 4;
  }

  /**
   * Generate UUID with prefix
   */
  static generateWithPrefix(prefix) {
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Prefix must be a non-empty string');
    }
    
    return `${prefix}-${uuidv4()}`;
  }

  /**
   * Extract UUID from prefixed string
   */
  static extractFromPrefixed(prefixedUuid, prefix) {
    if (!prefixedUuid || typeof prefixedUuid !== 'string') {
      return null;
    }
    
    if (!prefix || typeof prefix !== 'string') {
      return null;
    }
    
    const expectedPrefix = `${prefix}-`;
    if (!prefixedUuid.startsWith(expectedPrefix)) {
      return null;
    }
    
    const uuid = prefixedUuid.substring(expectedPrefix.length);
    return this.isValid(uuid) ? uuid : null;
  }

  /**
   * Generate UUID for specific entity types
   */
  static generateForTask() {
    return this.generateWithPrefix('task');
  }

  static generateForProject() {
    return this.generateWithPrefix('project');
  }

  static generateForChecklistItem() {
    return this.generateWithPrefix('checklist');
  }

  /**
   * Validate entity-specific UUIDs
   */
  static isTaskUUID(uuid) {
    return uuid && typeof uuid === 'string' && uuid.startsWith('task-') && 
           this.isValid(this.extractFromPrefixed(uuid, 'task'));
  }

  static isProjectUUID(uuid) {
    return uuid && typeof uuid === 'string' && uuid.startsWith('project-') && 
           this.isValid(this.extractFromPrefixed(uuid, 'project'));
  }

  static isChecklistItemUUID(uuid) {
    return uuid && typeof uuid === 'string' && uuid.startsWith('checklist-') && 
           this.isValid(this.extractFromPrefixed(uuid, 'checklist'));
  }
}