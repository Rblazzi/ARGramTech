import { ForbiddenException, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

function makeContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  let supabase: any;
  let prisma: any;
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    supabase = { verifyAccessToken: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new PlatformAdminGuard(supabase, prisma);
  });

  it('rejects requests without a token', async () => {
    const request = { headers: {} };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    supabase.verifyAccessToken.mockRejectedValue(new Error('bad token'));
    const request = { headers: { authorization: 'Bearer xyz' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a user that does not exist', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    const request = { headers: { authorization: 'Bearer xyz' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('rejects a user without the platform admin flag', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: true, isPlatformAdmin: false });
    const request = { headers: { authorization: 'Bearer xyz' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('rejects an inactive platform admin', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: false, isPlatformAdmin: true });
    const request = { headers: { authorization: 'Bearer xyz' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('attaches the platform user to the request and allows access', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    const user = { id: 'user-1', active: true, isPlatformAdmin: true };
    prisma.user.findUnique.mockResolvedValue(user);
    const request: any = { headers: { authorization: 'Bearer xyz' } };

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.platformUser).toBe(user);
  });
});
