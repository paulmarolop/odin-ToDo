/**
 * Input validation and sanitization utilities
 */
export class Validation {
  /**
   * Validate and sanitize text input
   */
  static sanitizeText(text, maxLength = null) {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Trim whitespace
    let sanitized = text.trim();
    
    // Remove potentially harmful characters
    sanitized = sanitized.replace(/[<>]/g, '');
    
    // Limit length if specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Validate required text field
   */
  static validateRequired(value, fieldName = 'Field') {
    const sanitized = this.sanitizeText(value);
    
    if (!sanitized || sanitized.length === 0) {
      return {
        valid: false,
        error: `${fieldName} is required`,
        value: sanitized
      };
    }
    
    return {
      valid: true,
      error: null,
      value: sanitized
    };
  }

  /**
   * Validate text length
   */
  static validateLength(value, minLength = 0, maxLength = null, fieldName = 'Field') {
    const sanitized = this.sanitizeText(value);
    
    if (sanitized.length < minLength) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${minLength} characters long`,
        value: sanitized
      };
    }
    
    if (maxLength && sanitized.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} must be no more than ${maxLength} characters long`,
        value: sanitized
      };
    }
    
    return {
      valid: true,
      error: null,
      value: sanitized
    };
  }

  /**
   * Validate priority value
   */
  static validatePriority(priority) {
    const validPriorities = ['high', 'medium', 'low'];
    
    // Use default if not provided
    if (!priority || typeof priority !== 'string') {
      return {
        valid: true,
        error: null,
        value: 'medium'
      };
    }
    
    const normalizedPriority = priority.toLowerCase().trim();
    
    if (!validPriorities.includes(normalizedPriority)) {
      return {
        valid: false,
        error: `Priority must be one of: ${validPriorities.join(', ')}`,
        value: 'medium'
      };
    }
    
    return {
      valid: true,
      error: null,
      value: normalizedPriority
    };
  }

  /**
   * Validate date input
   */
  static validateDate(dateValue, fieldName = 'Date') {
    if (!dateValue) {
      return {
        valid: true,
        error: null,
        value: null
      };
    }
    
    let dateObj;
    
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === 'string') {
      dateObj = new Date(dateValue);
    } else {
      return {
        valid: false,
        error: `${fieldName} must be a valid date`,
        value: null
      };
    }
    
    if (isNaN(dateObj.getTime())) {
      return {
        valid: false,
        error: `${fieldName} must be a valid date`,
        value: null
      };
    }
    
    return {
      valid: true,
      error: null,
      value: dateObj
    };
  }

  /**
   * Validate checklist items
   */
  static validateChecklist(checklist) {
    if (!checklist) {
      return {
        valid: true,
        error: null,
        value: []
      };
    }
    
    if (!Array.isArray(checklist)) {
      return {
        valid: false,
        error: 'Checklist must be an array',
        value: []
      };
    }
    
    const validatedItems = [];
    const errors = [];
    
    checklist.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Checklist item ${index + 1} must be an object`);
        return;
      }
      
      const textValidation = this.validateRequired(item.text, `Checklist item ${index + 1} text`);
      if (!textValidation.valid) {
        errors.push(textValidation.error);
        return;
      }
      
      validatedItems.push({
        id: item.id || null,
        text: textValidation.value,
        completed: Boolean(item.completed)
      });
    });
    
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
        value: validatedItems
      };
    }
    
    return {
      valid: true,
      error: null,
      value: validatedItems
    };
  }

  /**
   * Validate task data
   */
  static validateTaskData(taskData) {
    const errors = [];
    const validatedData = {};
    
    // Validate title (required)
    const titleValidation = this.validateRequired(taskData.title, 'Title');
    if (!titleValidation.valid) {
      errors.push(titleValidation.error);
    } else {
      const lengthValidation = this.validateLength(titleValidation.value, 1, 200, 'Title');
      if (!lengthValidation.valid) {
        errors.push(lengthValidation.error);
      } else {
        validatedData.title = lengthValidation.value;
      }
    }
    
    // Validate description (optional)
    if (taskData.description !== undefined) {
      const descValidation = this.validateLength(taskData.description, 0, 1000, 'Description');
      if (!descValidation.valid) {
        errors.push(descValidation.error);
      } else {
        validatedData.description = descValidation.value;
      }
    }
    
    // Validate due date (optional)
    if (taskData.dueDate !== undefined) {
      const dateValidation = this.validateDate(taskData.dueDate, 'Due date');
      if (!dateValidation.valid) {
        errors.push(dateValidation.error);
      } else {
        validatedData.dueDate = dateValidation.value;
      }
    }
    
    // Validate priority
    const priorityValidation = this.validatePriority(taskData.priority);
    if (!priorityValidation.valid) {
      errors.push(priorityValidation.error);
    }
    validatedData.priority = priorityValidation.value;
    
    // Validate notes (optional)
    if (taskData.notes !== undefined) {
      const notesValidation = this.validateLength(taskData.notes, 0, 2000, 'Notes');
      if (!notesValidation.valid) {
        errors.push(notesValidation.error);
      } else {
        validatedData.notes = notesValidation.value;
      }
    }
    
    // Validate checklist (optional)
    if (taskData.checklist !== undefined) {
      const checklistValidation = this.validateChecklist(taskData.checklist);
      if (!checklistValidation.valid) {
        errors.push(checklistValidation.error);
      } else {
        validatedData.checklist = checklistValidation.value;
      }
    }
    
    // Validate project ID
    if (taskData.projectId !== undefined) {
      const projectIdValidation = this.validateRequired(taskData.projectId, 'Project ID');
      if (!projectIdValidation.valid) {
        errors.push(projectIdValidation.error);
      } else {
        validatedData.projectId = projectIdValidation.value;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      data: validatedData
    };
  }

  /**
   * Validate project data
   */
  static validateProjectData(projectData) {
    const errors = [];
    const validatedData = {};
    
    // Validate name (required)
    const nameValidation = this.validateRequired(projectData.name, 'Project name');
    if (!nameValidation.valid) {
      errors.push(nameValidation.error);
    } else {
      const lengthValidation = this.validateLength(nameValidation.value, 1, 100, 'Project name');
      if (!lengthValidation.valid) {
        errors.push(lengthValidation.error);
      } else {
        validatedData.name = lengthValidation.value;
      }
    }
    
    // Validate task count (optional)
    if (projectData.taskCount !== undefined) {
      if (typeof projectData.taskCount !== 'number' || projectData.taskCount < 0) {
        errors.push('Task count must be a non-negative number');
      } else {
        validatedData.taskCount = projectData.taskCount;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      data: validatedData
    };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }
    
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Validate form data generically
   */
  static validateForm(formData, rules) {
    const errors = {};
    const validatedData = {};
    
    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = formData[field];
      
      // Check if field is required
      if (rule.required) {
        const requiredValidation = this.validateRequired(value, rule.label || field);
        if (!requiredValidation.valid) {
          errors[field] = requiredValidation.error;
          return;
        }
        validatedData[field] = requiredValidation.value;
      } else if (value !== undefined && value !== null && value !== '') {
        validatedData[field] = this.sanitizeText(value);
      }
      
      // Check length constraints
      if (rule.minLength || rule.maxLength) {
        const lengthValidation = this.validateLength(
          validatedData[field] || value,
          rule.minLength || 0,
          rule.maxLength || null,
          rule.label || field
        );
        if (!lengthValidation.valid) {
          errors[field] = lengthValidation.error;
          return;
        }
        validatedData[field] = lengthValidation.value;
      }
      
      // Custom validation function
      if (rule.validator && typeof rule.validator === 'function') {
        const customValidation = rule.validator(validatedData[field] || value);
        if (!customValidation.valid) {
          errors[field] = customValidation.error;
          return;
        }
        if (customValidation.value !== undefined) {
          validatedData[field] = customValidation.value;
        }
      }
    });
    
    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      data: validatedData
    };
  }
}