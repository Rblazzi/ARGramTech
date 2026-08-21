import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let supabase: any;
  let prisma: any;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    supabase = { verifyAccessToken: jest.fn() };
    prisma = { companyMembership: { findUnique: jest.fn() } };
    guard = new JwtAuthGuard(supabase, prisma);
  });

  it('rejects requests without a Bearer token', async () => {
    const request = { headers: {}, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a malformed authorization header', async () => {
    const request = { headers: { authorization: 'Basic abc' }, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    supabase.verifyAccessToken.mockRejectedValue(new Error('bad token'));
    const request = { headers: { authorization: 'Bearer xyz' }, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the user has no membership in this company', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.companyMembership.findUnique.mockResolvedValue(null);
    const request = { headers: { authorization: 'Bearer xyz' }, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive membership', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.companyMembership.findUnique.mockResolvedValue({
      active: false,
      user: { active: true, deletedAt: null },
    });
    const request = { headers: { authorization: 'Bearer xyz' }, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive or deleted user even with an active membership', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.companyMembership.findUnique.mockResolvedValue({
      active: true,
      user: { active: false, deletedAt: null },
    });
    const request = { headers: { authorization: 'Bearer xyz' }, companyId: 'company-1' };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the authenticated user to the request and allows access', async () => {
    supabase.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    prisma.companyMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      companyId: 'company-1',
      role: 'ADMIN',
      active: true,
      user: { id: 'user-1', email: 'a@b.com', name: 'Ana', active: true, deletedAt: null, isPlatformAdmin: false },
    });
    const request: any = { headers: { authorization: 'Bearer xyz' }, companyId: 'company-1' };

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ id: 'user-1', role: 'ADMIN', companyId: 'company-1', membershipId: 'membership-1' }),
    );
  });
});
