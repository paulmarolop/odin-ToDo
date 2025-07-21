// Test setup file
import { vi } from 'vitest';

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Reset localStorage mock before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  localStorageMock.key.mockClear();
});

// Global test utilities
global.createMockTask = (overrides = {}) => ({
  id: 'test-task-id',
  title: 'Test Task',
  description: 'Test Description',
  dueDate: null,
  priority: 'medium',
  notes: '',
  checklist: [],
  completed: false,
  projectId: 'default',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides
});

global.createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  taskCount: 0,
  ...overrides
});