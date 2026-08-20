import 'dotenv/config';
import { CouponType, PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Popula dados mínimos para começar a desenvolver/testar:
// - configurações padrão da loja
// - um usuário administrador (login: admin@lanchonete.local / admin123456)
// - categorias básicas do cardápio
async function main() {
  const prisma = new PrismaClient();
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log('Criando configurações padrão da loja...');
  const existingSettings = await prisma.storeSettings.findFirst();
  if (!existingSettings) {
    await prisma.storeSettings.create({
      data: {
        name: 'Lanchonete Delivery',
        primaryColor: '#FF7A00',
        deliveryFeeDefault: 5,
        minOrderValue: 0,
        status: 'OPEN',
      },
    });
  }

  const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
  if (listUsersError) throw listUsersError;

  async function upsertStaffUser(email: string, password: string, name: string, role: UserRole) {
    let authId = existingUsers.users.find((u) => u.email === email)?.id;
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
      create: { id: authId, email, name, role },
      update: { role },
    });
  }

  console.log('Criando usuário administrador...');
  const adminEmail = 'admin@lanchonete.local';
  const adminPassword = 'admin123456';
  await upsertStaffUser(adminEmail, adminPassword, 'Administrador', UserRole.ADMIN);

  console.log('Criando usuário da cozinha...');
  const kitchenEmail = 'cozinha@lanchonete.local';
  const kitchenPassword = 'cozinha123456';
  await upsertStaffUser(kitchenEmail, kitchenPassword, 'Equipe Cozinha', UserRole.KITCHEN);

  console.log('Criando categorias básicas...');
  const categories = ['Lanches', 'Hambúrgueres', 'Combos', 'Porções', 'Bebidas', 'Sobremesas'];
  for (const [index, name] of categories.entries()) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-');

    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, position: index },
      update: {},
    });
  }

  console.log('Criando cupom de exemplo...');
  await prisma.coupon.upsert({
    where: { code: 'PRIMEIRACOMPRA' },
    create: {
      code: 'PRIMEIRACOMPRA',
      type: CouponType.PERCENTAGE,
      value: 10,
      usageLimitPerCustomer: 1,
      active: true,
    },
    update: {},
  });

  console.log('Seed concluído.');
  console.log(`Login admin   -> e-mail: ${adminEmail} | senha: ${adminPassword}`);
  console.log(`Login cozinha -> e-mail: ${kitchenEmail} | senha: ${kitchenPassword}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
