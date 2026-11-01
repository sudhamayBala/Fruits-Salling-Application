import { connection } from "./config";
import { requestJson } from "./http";
const ACCESS_TOKEN_KEY = "indkan_access_token";
const USER_ROLE_KEY = "indkan_user_role";
let logoutRequest: Promise<void> | undefined;

type User = {
  customer_id: string;
  full_name: string;
  email: string;
  contract_number: string;
  role: string;
  phone?: string | null;
  address?: string | null;
};

export type CurrentUser = User;

type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

type AuthCredentials = {
  email: string;
  password: string;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return requestJson<T>(
    `${connection.authApiBaseUrl}${path}`,
    { ...options, headers },
    "Authentication request failed",
  );
}

async function saveSession(path: string, data: object): Promise<AuthResponse> {
  const session = await request<AuthResponse>(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
  localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_ROLE_KEY, session.user.role);
  return session;
}

export function register(data: {
  full_name: string;
  email: string;
  password: string;
  contract_number?: string;
  phone?: string;
  address?: string;
}): Promise<AuthResponse> {
  return saveSession("/register", data);
}

export type IssuedEmployeeId = {
  employee_id: string;
  employee_name: string;
  date_of_birth: string;
  joining_date: string;
  employee_type: string;
  phone: string;
  address: string;
  email: string;
};

export async function issueOwnerEmployeeId(data: {
  employee_name: string;
  date_of_birth: string;
  joining_date: string;
  employee_type: string;
  phone: string;
  address: string;
}): Promise<IssuedEmployeeId> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Please log in as an owner to issue an employee ID.");
  }
  return request<IssuedEmployeeId>("/employee-ids", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function login(data: AuthCredentials): Promise<AuthResponse> {
  return saveSession("/login", data);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getCurrentUser(
  loginPrompt = "Please log in to access the owner dashboard",
): Promise<CurrentUser> {
  const token = getAccessToken();
  if (!token) {
    throw new Error(loginPrompt);
  }

  return request<CurrentUser>("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateCurrentUser(data: {
  full_name: string;
  phone: string | null;
  address: string | null;
}): Promise<CurrentUser> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Please log in to update your account settings.");
  }
  return request<CurrentUser>("/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function getManagedCustomers(token: string): Promise<CurrentUser[]> {
  return request<CurrentUser[]>("/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function logout(): Promise<void> {
  if (!logoutRequest) {
    logoutRequest = (async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      try {
        await request<void>("/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } finally {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_ROLE_KEY);
      }
    })().finally(() => {
      logoutRequest = undefined;
    });
  }
  return logoutRequest;
}
