import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainName } from '../utils/types.js';

export const DOMAINS: DomainName[] = [
  'workorders',
  'inventory',
  'boms',
  'sales_orders',
  'purchase_orders',
  'schedule',
  'quality',
];

export function getNavigationTools(): Tool[] {
  return [
    {
      name: 'iqms_navigate',
      description: `Navigate to an IQMS domain to see its tools. Domains: ${DOMAINS.join(', ')}.
- workorders: list/get work orders, post production
- inventory: on-hand quantities, lot trace, inventory adjustments
- boms: BOM explosion + where-used
- sales_orders: open SOs, ship status
- purchase_orders: open POs, expected receipts
- schedule: machine schedule + capacity load
- quality: non-conformances / CARs / CAPAs`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          domain: {
            type: 'string',
            enum: DOMAINS,
            description: 'The domain to navigate to',
          },
        },
        required: ['domain'],
      },
    },
    {
      name: 'iqms_status',
      description:
        'Check IQMS connection status — reports whether Oracle credentials are configured ' +
        'and whether the optional WebAPI (write) driver is enabled.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ];
}
