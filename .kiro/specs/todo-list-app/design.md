# Design Document

## Overview

The ToDo List application will be built as a modern, modular JavaScript application using a clean architecture that separates concerns between business logic, data persistence, and user interface. The application will use Webpack for bundling, npm for dependency management, and localStorage for client-side data persistence.

### Key Design Principles

- **Separation of Concerns**: Business logic, data management, and UI rendering are kept in separate modules
- **Modular Architecture**: Each feature is implemented as an independent module with clear interfaces
- **Modern JavaScript**: ES6+ features including modules, classes, and async/await
- **Build Tooling**: Webpack for bundling and development workflow
- **External Dependencies**: Leveraging proven libraries like date-fns for specialized functionality

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Business Logic │    │  Data Layer     │
│                 │    │                 │    │                 │
│ - DOM Renderer  │◄──►│ - Task Manager  │◄──►│ - Storage API   │
│ - Event Handler │    │ - Project Mgr   │    │ - Data Models   │
│ - UI Components │    │ - Validation    │    │ - Serialization │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Module Structure

```
src/
├── index.js                 # Application entry point
├── styles/
│   ├── main.css            # Main stylesheet
│   ├── components.css      # Component-specific styles
│   └── responsive.css      # Responsive design rules
├── modules/
│   ├── models/
│   │   ├── Task.js         # Task data model
│   │   └── Project.js      # Project data model
│   ├── services/
│   │   ├── TaskService.js  # Task business logic
│   │   ├── ProjectService.js # Project business logic
│   │   └── StorageService.js # Data persistence
│   ├── ui/
│   │   ├── DOMRenderer.js  # DOM manipulation
│   │   ├── EventHandler.js # Event management
│   │   └── UIComponents.js # Reusable UI components
│   └── utils/
│       ├── DateUtils.js    # Date formatting utilities
│       └── Validation.js   # Input validation
└── assets/
    └── icons/              # Application icons
```

## Components and Interfaces

### Data Models

#### Task Model
```javascript
class Task {
  constructor({
    id,
    title,
    description = '',
    dueDate = null,
    priority = 'medium',
    notes = '',
    checklist = [],
    completed = false,
    projectId = 'default',
    createdAt = new Date(),
    updatedAt = new Date()
  })
}
```

#### Project Model
```javascript
class Project {
  constructor({
    id,
    name,
    createdAt = new Date(),
    taskCount = 0
  })
}
```

### Service Layer Interfaces

#### TaskService
- `createTask(taskData)` - Creates a new task
- `updateTask(taskId, updates)` - Updates existing task
- `deleteTask(taskId)` - Removes a task
- `toggleTaskCompletion(taskId)` - Toggles completion status
- `getTasksByProject(projectId)` - Retrieves tasks for a project
- `moveTaskToProject(taskId, projectId)` - Moves task between projects

#### ProjectService
- `createProject(name)` - Creates a new project
- `deleteProject(projectId)` - Removes a project
- `getAllProjects()` - Retrieves all projects
- `getProjectById(projectId)` - Gets specific project
- `updateProjectTaskCount(projectId)` - Updates task count

#### StorageService
- `save(key, data)` - Saves data to localStorage
- `load(key)` - Loads data from localStorage
- `remove(key)` - Removes data from localStorage
- `clear()` - Clears all application data
- `isAvailable()` - Checks localStorage availability

### UI Layer Interfaces

#### DOMRenderer
- `renderTaskList(tasks, projectId)` - Renders task list for project
- `renderProjectList(projects)` - Renders project navigation
- `renderTaskForm(task = null)` - Renders task creation/edit form
- `renderTaskDetails(task)` - Renders expanded task view
- `updateTaskDisplay(task)` - Updates single task in DOM

#### EventHandler
- `bindTaskEvents()` - Binds task-related event listeners
- `bindProjectEvents()` - Binds project-related event listeners
- `bindFormEvents()` - Binds form submission events
- `handleTaskCreate(formData)` - Handles task creation
- `handleTaskUpdate(taskId, formData)` - Handles task updates

## Data Models

### Task Data Structure
```javascript
{
  id: 'uuid-string',
  title: 'Task title',
  description: 'Detailed description',
  dueDate: '2024-12-31T23:59:59.000Z', // ISO string or null
  priority: 'high' | 'medium' | 'low',
  notes: 'Additional notes',
  checklist: [
    {
      id: 'checklist-item-uuid',
      text: 'Checklist item text',
      completed: false
    }
  ],
  completed: false,
  projectId: 'project-uuid',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}
```

### Project Data Structure
```javascript
{
  id: 'uuid-string',
  name: 'Project name',
  createdAt: '2024-01-01T00:00:00.000Z',
  taskCount: 5
}
```

### LocalStorage Schema
```javascript
{
  'todoapp_tasks': [Task, Task, ...],
  'todoapp_projects': [Project, Project, ...],
  'todoapp_settings': {
    currentProjectId: 'project-uuid',
    theme: 'light',
    lastAccessed: '2024-01-01T00:00:00.000Z'
  }
}
```

## Error Handling

### Storage Errors
- **localStorage unavailable**: Graceful degradation to session-only mode
- **Storage quota exceeded**: User notification with cleanup options
- **Data corruption**: Validation and recovery mechanisms

### Validation Errors
- **Empty task title**: Prevent creation with user feedback
- **Invalid date format**: Date parsing with fallback handling
- **Missing required fields**: Form validation with clear error messages

### UI Errors
- **DOM element not found**: Defensive programming with null checks
- **Event binding failures**: Error logging and graceful degradation
- **Rendering errors**: Try-catch blocks around DOM manipulation

## Testing Strategy

### Unit Testing
- **Models**: Test data validation and serialization
- **Services**: Test business logic and data operations
- **Utilities**: Test date formatting and validation functions

### Integration Testing
- **Storage Integration**: Test localStorage operations
- **Service Integration**: Test service layer interactions
- **UI Integration**: Test DOM rendering and event handling

### End-to-End Testing
- **Task Management Flow**: Create, edit, complete, delete tasks
- **Project Management Flow**: Create projects, move tasks between projects
- **Data Persistence**: Verify data survives page refresh

### Manual Testing
- **Responsive Design**: Test on various screen sizes
- **Browser Compatibility**: Test on major browsers
- **Accessibility**: Test keyboard navigation and screen readers

## Build Configuration

### Webpack Configuration
- **Entry Point**: `src/index.js`
- **Output**: `dist/bundle.js` and `dist/styles.css`
- **Development Server**: Hot reload for development
- **Production Build**: Minification and optimization
- **Asset Handling**: CSS, images, and fonts processing

### NPM Scripts
- `npm start` - Development server
- `npm run build` - Production build
- `npm run test` - Run test suite
- `npm run lint` - Code linting

### Dependencies
- **date-fns**: Date manipulation and formatting
- **uuid**: Unique identifier generation
- **webpack**: Module bundling
- **webpack-dev-server**: Development server
- **css-loader**: CSS processing
- **html-webpack-plugin**: HTML template processing

## User Interface Design

### Layout Structure
- **Header**: Application title and project selector
- **Sidebar**: Project list and navigation
- **Main Content**: Task list and task details
- **Footer**: Add task button and application info

### Responsive Breakpoints
- **Mobile**: < 768px (single column, collapsible sidebar)
- **Tablet**: 768px - 1024px (two column layout)
- **Desktop**: > 1024px (three column layout with sidebar)

### Visual Design Elements
- **Priority Indicators**: Color-coded priority levels
- **Due Date Warnings**: Visual indicators for overdue tasks
- **Progress Indicators**: Checklist completion progress bars
- **Interactive States**: Hover, focus, and active states for all controls