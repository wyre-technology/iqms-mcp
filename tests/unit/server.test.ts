import { describe, expect, it } from 'vitest';
import { DOMAINS, getNavigationTools } from '../../src/domains/navigation.js';
import { getDomainHandler } from '../../src/domains/index.js';

describe('navigation', () => {
  it('exposes iqms_navigate and iqms_status', () => {
    const tools = getNavigationTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['iqms_navigate', 'iqms_status']);
  });

  it('defines all 7 expected domains', () => {
    expect(DOMAINS).toEqual([
      'workorders',
      'inventory',
      'boms',
      'sales_orders',
      'purchase_orders',
      'schedule',
      'quality',
    ]);
  });
});

describe('domain handlers', () => {
  it.each(DOMAINS)('domain "%s" exposes at least one tool', async (domain) => {
    const handler = await getDomainHandler(domain);
    const tools = handler.getTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^iqms_/);
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('every tool name across all domains is unique', async () => {
    const seen = new Set<string>();
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      for (const tool of handler.getTools()) {
        expect(seen.has(tool.name), `Duplicate tool name: ${tool.name}`).toBe(false);
        seen.add(tool.name);
      }
    }
    // Sanity: workorders alone has 4 tools, so the total should comfortably exceed 7.
    expect(seen.size).toBeGreaterThanOrEqual(13);
  });
});
