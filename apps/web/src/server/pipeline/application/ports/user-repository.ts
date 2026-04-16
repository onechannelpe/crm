export type PipelineUser = {
  id: number;
  isActive: boolean;
};

export type PipelineUserWithName = {
  id: number;
  fullName: string;
};

export type PipelineUserRepository = {
  findById(id: number): Promise<PipelineUser | undefined>;
  findByIds(ids: number[]): Promise<PipelineUserWithName[]>;
};
