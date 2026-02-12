export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class QuotaExceededError extends DomainError {
  constructor(used: number, limit: number) {
    super(`Quota exceeded: ${used}/${limit} used`);
  }
}

export class ContactCooldownError extends DomainError {
  constructor(cooldownUntil: number) {
    super(`Contact in cooldown until ${new Date(cooldownUntil).toISOString()}`);
  }
}

export class OrganizationLockedError extends DomainError {
  constructor(ruc: string, branchId: number) {
    super(`Organization ${ruc} locked to branch ${branchId}`);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
  }
}

export class InventoryUnavailableError extends DomainError {
  constructor(productId: number) {
    super(`Product ${productId} out of stock`);
  }
}
