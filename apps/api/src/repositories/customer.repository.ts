import type { Prisma } from "database";

export class CustomerRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  /**
   * Finds the customer by normalized phone or creates one, and sets the name
   * to the one just provided (BR-15). The phone is never read back out to
   * clients (BR-16).
   */
  upsertByPhone(name: string, phone: string) {
    return this.prisma.customer.upsert({
      where: { phone },
      create: { name, phone },
      update: { name },
      select: { id: true },
    });
  }
}
