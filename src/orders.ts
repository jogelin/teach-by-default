import { db } from './db';
import type { User } from './users';

export interface Item {
  sku: string;
  quantity: number;
  price: number;
}

export async function checkout(customer: User, items: Item[]): Promise<string> {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await db.orders.insert({ customerId: customer.id, items, total, shipTo: customer.address });
  return order.id;
}
