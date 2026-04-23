export type LeadFavoriteRepository = {
  isFavoriteForUser(input: {
    leadId: string;
    userId: number;
  }): Promise<boolean>;
  addForUser(input: {
    leadId: string;
    userId: number;
    createdAt: number;
  }): Promise<void>;
  removeForUser(input: { leadId: string; userId: number }): Promise<void>;
};
