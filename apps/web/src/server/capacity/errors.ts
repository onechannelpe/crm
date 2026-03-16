export type CapacityRequestError =
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type CapacityApprovalError =
  | { reason: "not_found"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type CapacityManageError =
  | { reason: "not_found"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type CapacityReadError =
  | { reason: "forbidden"; message: string }
  | { reason: "not_found"; message: string }
  | { reason: "unexpected"; message: string };
