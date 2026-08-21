import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: any;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector);
  });

  it('allows access when the route has no required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: UserRole.ATTENDANT }))).toBe(true);
  });

  it('rejects when there is no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('rejects when the user role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext({ role: UserRole.ATTENDANT }))).toThrow(ForbiddenException);
  });

  it('allows access when the user role is in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ATTENDANT]);
    expect(guard.canActivate(makeContext({ role: UserRole.ATTENDANT }))).toBe(true);
  });
});
