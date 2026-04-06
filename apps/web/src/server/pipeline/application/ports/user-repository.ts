export type PipelineUser = {
  id: number;
  isActive: boolean;
};

export type PipelineUserRepository = {
  findById(id: number): Promise<PipelineUser | undefined>;
};
