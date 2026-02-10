export interface SessionUser {
  id: number;
  name: string;
  role: "executive" | "supervisor" | "back_office" | "sales_manager" | "admin";
}

export interface AppVariables {
  sessionId: string;
  userId: number;
  userRole:
    | "executive"
    | "supervisor"
    | "back_office"
    | "sales_manager"
    | "admin";
  user: SessionUser;
}
