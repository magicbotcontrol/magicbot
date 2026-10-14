import type { RuntimeSlot } from '../contracts/types.js';

function slotKey(workspaceId: string, slot: number) {
  return `${workspaceId}:${slot}`;
}

export class SlotRegistry {
  private readonly slots = new Map<string, RuntimeSlot>();

  activate(slot: RuntimeSlot) {
    this.slots.set(slotKey(slot.workspaceId, slot.slot), slot);
  }

  deactivate(workspaceId: string, slot: number) {
    this.slots.delete(slotKey(workspaceId, slot));
  }

  replaceAll(slots: RuntimeSlot[]) {
    this.slots.clear();
    slots.forEach((slot) => this.activate(slot));
  }

  list() {
    return Array.from(this.slots.values());
  }

  has(workspaceId: string, slot: number) {
    return this.slots.has(slotKey(workspaceId, slot));
  }
}
