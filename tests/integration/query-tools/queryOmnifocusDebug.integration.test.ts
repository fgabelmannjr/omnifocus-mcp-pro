import { describe, expect, it } from 'vitest';
import { queryOmnifocusDebug } from '../../../src/tools/primitives/queryOmnifocusDebug.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('queryOmnifocusDebug integration', () => {
  skipIfOmniFocusUnavailable();

  it('should return debug info for task entity', async () => {
    const result = await queryOmnifocusDebug('task');

    // Result should be an object (parsed JSON) with entity information
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    // Check for expected structure
    const data = result as {
      entityType?: string;
      itemName?: string;
      allProperties?: Record<string, unknown>;
      expectedProperties?: Record<string, unknown>;
      error?: string;
    };

    if (data.error) {
      // If no tasks exist, we get an error - that's valid
      expect(data.error).toContain('No items found');
    } else {
      expect(data.entityType).toBe('task');
      expect(data.itemName).toBeDefined();
      expect(data.allProperties).toBeDefined();
      expect(data.expectedProperties).toBeDefined();
    }
  });

  it('should return debug info for project entity', async () => {
    const result = await queryOmnifocusDebug('project');

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    const data = result as {
      entityType?: string;
      itemName?: string;
      allProperties?: Record<string, unknown>;
      expectedProperties?: Record<string, unknown>;
      error?: string;
    };

    if (data.error) {
      expect(data.error).toContain('No items found');
    } else {
      expect(data.entityType).toBe('project');
      expect(data.itemName).toBeDefined();
      expect(data.allProperties).toBeDefined();
      expect(data.expectedProperties).toBeDefined();
    }
  });

  it('should return debug info for folder entity', async () => {
    const result = await queryOmnifocusDebug('folder');

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    const data = result as {
      entityType?: string;
      itemName?: string;
      allProperties?: Record<string, unknown>;
      expectedProperties?: Record<string, unknown>;
      error?: string;
    };

    if (data.error) {
      expect(data.error).toContain('No items found');
    } else {
      expect(data.entityType).toBe('folder');
      expect(data.itemName).toBeDefined();
      expect(data.allProperties).toBeDefined();
      expect(data.expectedProperties).toBeDefined();
    }
  });

  it('should include property type information for task', async () => {
    const result = await queryOmnifocusDebug('task');
    const data = result as {
      allProperties?: Record<string, { type?: string; value?: unknown }>;
      expectedProperties?: Record<string, { exists?: boolean; type?: string }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no tasks exist
      return;
    }

    // Check that properties include type information
    if (data.allProperties) {
      const propValues = Object.values(data.allProperties);
      const hasTypeInfo = propValues.some(
        (prop) => prop && typeof prop === 'object' && 'type' in prop
      );
      expect(hasTypeInfo).toBe(true);
    }
  });

  it('should check expected task properties', async () => {
    const result = await queryOmnifocusDebug('task');
    const data = result as {
      expectedProperties?: Record<string, { exists?: boolean; type?: string; value?: unknown }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no tasks exist
      return;
    }

    // Expected properties should include common task fields
    const expectedProps = data.expectedProperties;
    if (expectedProps) {
      expect('id' in expectedProps).toBe(true);
      expect('name' in expectedProps).toBe(true);
      expect('note' in expectedProps).toBe(true);
      expect('flagged' in expectedProps).toBe(true);
      expect('dueDate' in expectedProps).toBe(true);
      expect('deferDate' in expectedProps).toBe(true);
    }
  });

  it('should check expected project properties', async () => {
    const result = await queryOmnifocusDebug('project');
    const data = result as {
      expectedProperties?: Record<string, { exists?: boolean; type?: string; value?: unknown }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no projects exist
      return;
    }

    // Expected properties should include common project fields
    const expectedProps = data.expectedProperties;
    if (expectedProps) {
      expect('id' in expectedProps).toBe(true);
      expect('name' in expectedProps).toBe(true);
      expect('note' in expectedProps).toBe(true);
      expect('status' in expectedProps).toBe(true);
    }
  });

  it('should check expected folder properties', async () => {
    const result = await queryOmnifocusDebug('folder');
    const data = result as {
      expectedProperties?: Record<string, { exists?: boolean; type?: string; value?: unknown }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no folders exist
      return;
    }

    // Expected properties should include common folder fields
    const expectedProps = data.expectedProperties;
    if (expectedProps) {
      expect('id' in expectedProps).toBe(true);
      expect('name' in expectedProps).toBe(true);
    }
  });

  it('should handle functions in property discovery', async () => {
    const result = await queryOmnifocusDebug('task');
    const data = result as {
      allProperties?: Record<string, { type?: string; value?: unknown }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no tasks exist
      return;
    }

    // Functions should be identified as such
    if (data.allProperties) {
      const propValues = Object.values(data.allProperties);
      const functionProp = propValues.find((prop) => prop?.type === 'function');
      if (functionProp) {
        expect(functionProp.value).toBe('[Function]');
      }
    }
  });

  it('should handle arrays in property discovery', async () => {
    const result = await queryOmnifocusDebug('task');
    const data = result as {
      allProperties?: Record<string, { type?: string; length?: number }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no tasks exist
      return;
    }

    // Arrays should include length
    if (data.allProperties) {
      const propValues = Object.values(data.allProperties);
      const arrayProp = propValues.find((prop) => prop?.type === 'Array');
      if (arrayProp) {
        expect(typeof arrayProp.length).toBe('number');
      }
    }
  });

  it('should handle OmniFocus objects in property discovery', async () => {
    const result = await queryOmnifocusDebug('task');
    const data = result as {
      allProperties?: Record<string, { type?: string; id?: string; name?: string | null }>;
      error?: string;
    };

    if (data.error) {
      // Skip if no tasks exist
      return;
    }

    // OmniFocus objects should include id
    if (data.allProperties) {
      const propValues = Object.values(data.allProperties);
      const ofObjProp = propValues.find((prop) => prop?.type === 'OFObject');
      if (ofObjProp) {
        expect(ofObjProp.id).toBeDefined();
      }
    }
  });
});
