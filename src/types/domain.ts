export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  defaultLocationId: string | null;
  defaultLocationName: string | null;
};

export type SelectOption = {
  value: string;
  label: string;
};

