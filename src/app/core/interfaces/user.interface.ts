export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'EXTERNAL_TECHNICIAN'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  displayId?: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;
  role: UserRole | string;
  isActive: boolean;
  department?: string;
  location?: string;
  joiningDate?: string;
  avatarUrl?: string;
  avatarInitials?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  plainPassword?: string;
}

export interface UserFormInput {
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role: UserRole | string;
  department?: string;
  location?: string;
  joiningDate?: string;
  status?: UserStatus | boolean;
  isActive?: boolean;
  password?: string;
}
