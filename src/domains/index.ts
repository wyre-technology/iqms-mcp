import type { DomainHandler, DomainName } from '../utils/types.js';

const domainCache = new Map<DomainName, DomainHandler>();

export async function getDomainHandler(domain: DomainName): Promise<DomainHandler> {
  const cached = domainCache.get(domain);
  if (cached) return cached;

  let handler: DomainHandler;
  switch (domain) {
    case 'workorders': {
      const { workordersHandler } = await import('./workorders.js');
      handler = workordersHandler;
      break;
    }
    case 'inventory': {
      const { inventoryHandler } = await import('./inventory.js');
      handler = inventoryHandler;
      break;
    }
    case 'boms': {
      const { bomsHandler } = await import('./boms.js');
      handler = bomsHandler;
      break;
    }
    case 'sales_orders': {
      const { salesOrdersHandler } = await import('./sales-orders.js');
      handler = salesOrdersHandler;
      break;
    }
    case 'purchase_orders': {
      const { purchaseOrdersHandler } = await import('./purchase-orders.js');
      handler = purchaseOrdersHandler;
      break;
    }
    case 'schedule': {
      const { scheduleHandler } = await import('./schedule.js');
      handler = scheduleHandler;
      break;
    }
    case 'quality': {
      const { qualityHandler } = await import('./quality.js');
      handler = qualityHandler;
      break;
    }
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }

  domainCache.set(domain, handler);
  return handler;
}
