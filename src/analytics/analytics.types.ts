// src/analytics/analytics.types.ts
import { User } from '../entities/user.entity';
import { UserRole } from '../auth/roles.enum';

export interface ConnectionStat {
  date: string;
  connections: number;
  uniqueUsers: number;
}

export interface UserAnalyticsResponse {
  users: User[]; // Array de usuarios
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  roleDistribution: {
    role: UserRole;
    count: number;
    percentage: number;
  }[];
  connectionStats: ConnectionStat[];
  topUsers: User[];
  recentConnections: {
    user: Partial<User>;
    timestamp: string;
    duration: number;
    device: string;
    location: string;
  }[];
  userGrowth: any[];
  activityHeatmap: any[];
}