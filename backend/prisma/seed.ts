import 'dotenv/config';
import { CouponType, PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Popula dados mínimos para começar a desenvolver/testar:
// - a empresa padrão (Lanchonete Delivery)
// - uma conta de teste por setor (role), vinculada a ela
// - categorias básicas do cardápio
async function main() {
  // Este seed cria contas de teste com senhas fracas e conhecidas
  // (admin123456 etc.) — nunca deve rodar contra o banco de produção.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed bloqueado: NODE_ENV=production. Isso criaria contas de teste com senha conhecida.');
  }

  const prisma = new PrismaClient();
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log('Criando empresa padrão...');
  const company = await prisma.company.upsert({
    where: { slug: 'lanchonete-delivery' },
    create: {
      slug: 'lanchonete-delivery',
      customDomain: 'argramtech.com.br',
      name: 'Lanchonete Delivery',
      primaryColor: '#FF7A00',
      deliveryFeeDefault: 5,
      minOrderValue: 0,
      status: 'OPEN',
    },
    update: {},
  });

  const { data: listUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
  if (listUsersError) throw listUsersError;
  // Extraído para uma variável separada e concreta (array simples, sem
  // union/nulidade) de propósito: TypeScript não propaga o estreitamento
  // de tipo de uma verificação de erro para dentro de funções aninhadas
  // (closures), então referenciar `listUsersData.users` direto dali de
  // dentro de upsertStaffUser voltaria a dar erro de tipo.
  const existingUsers = listUsersData.users;

  async function upsertStaffUser(email: string, password: string, name: string, role: UserRole) {
    let authId = existingUsers.find((u) => u.email === email)?.id;
    if (!authId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) throw error;
      authId = data.user.id;
    }
    await prisma.user.upsert({
      where: { id: authId },
      create: { id: authId, email, name },
      update: { email, name },
    });

    const membership = await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: authId, companyId: company.id } },
      create: { userId: authId, companyId: company.id, role },
      update: { role },
    });
    return membership.id;
  }

  // Uma conta de teste por setor (role) do sistema, para permitir testar
  // cada painel/acesso separadamente. DRIVER também precisa de uma linha
  // em delivery_drivers (a FK usa o id da membership); CUSTOMER também
  // precisa de uma linha em customers — os demais setores usam só a
  // membership.
  const staffAccounts = [
    { email: 'admin@lanchonete.local', password: 'admin123456', name: 'Administrador', role: UserRole.ADMIN },
    { email: 'gerente@lanchonete.local', password: 'gerente123456', name: 'Gerente', role: UserRole.MANAGER },
    { email: 'atendente@lanchonete.local', password: 'atendente123456', name: 'Atendente', role: UserRole.ATTENDANT },
    { email: 'cozinha@lanchonete.local', password: 'cozinha123456', name: 'Equipe Cozinha', role: UserRole.KITCHEN },
    { email: 'entregador@lanchonete.local', password: 'entregador123456', name: 'Entregador', role: UserRole.DRIVER },
    { email: 'cliente@lanchonete.local', password: 'cliente123456', name: 'Cliente Teste', role: UserRole.CUSTOMER },
  ];

  for (const account of staffAccounts) {
    console.log(`Criando usuário ${account.role}...`);
    const membershipId = await upsertStaffUser(account.email, account.password, account.name, account.role);

    if (account.role === UserRole.DRIVER) {
      await prisma.deliveryDriver.upsert({
        where: { id: membershipId },
        create: { id: membershipId },
        update: {},
      });
    }
    if (account.role === UserRole.CUSTOMER) {
      await prisma.customer.upsert({
        where: { id: membershipId },
        create: { id: membershipId },
        update: {},
      });
    }
  }

  console.log('Criando categorias básicas...');
  const categories = ['Lanches', 'Hambúrgueres', 'Combos', 'Porções', 'Bebidas', 'Sobremesas'];
  for (const [index, name] of categories.entries()) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-');

    await prisma.category.upsert({
      where: { companyId_slug: { companyId: company.id, slug } },
      create: { companyId: company.id, name, slug, position: index },
      update: {},
    });
  }

  console.log('Criando cupom de exemplo...');
  await prisma.coupon.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PRIMEIRACOMPRA' } },
    create: {
      companyId: company.id,
      code: 'PRIMEIRACOMPRA',
      type: CouponType.PERCENTAGE,
      value: 10,
      usageLimitPerCustomer: 1,
      active: true,
    },
    update: {},
  });

  console.log('Seed concluído.');
  for (const account of staffAccounts) {
    console.log(`Login ${account.role.padEnd(10)} -> e-mail: ${account.email} | senha: ${account.password}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
