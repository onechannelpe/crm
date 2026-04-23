export type LeadClock = {
  now(): number;
};

export const systemLeadClock: LeadClock = {
  now: () => Date.now(),
};
