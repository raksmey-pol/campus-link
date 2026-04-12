import { UserRole } from '../../database/enums';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  tokenType: 'access';
}
