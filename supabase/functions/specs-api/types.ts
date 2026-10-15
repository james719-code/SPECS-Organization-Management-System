export type JsonMap = Record<string, unknown>;

export type FirebaseClaims = JsonMap & {
  sub?: string;
  user_id?: string;
  email?: string;
  role?: string;
};

export type AuthenticatedUser = FirebaseClaims & {
  uid: string;
  role: string;
};

export type AppConfig = {
  collections: {
    accounts: string;
    students: string;
    officers: string;
    admins: string;
    stories: string;
  };
  teams: {
    students?: string;
    officers?: string;
    volunteers?: string;
  };
  teamCollection: string;
};

export type ActionResult = JsonMap;
