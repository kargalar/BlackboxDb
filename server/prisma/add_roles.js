const { PrismaClient } = require('@prisma/client');

async function addCompanyRoles() {
    const prisma = new PrismaClient();

    try {
        // First check existing roles
        const existing = await prisma.companyRole.findMany();
        console.log('Existing roles:', existing);

        // Add new roles
        const newRoles = [
            { name: 'bookpublisher' },
            { name: 'gamepublisher' },
            { name: 'gamedeveloper' },
            { name: 'moviepublisher' },
        ];

        for (const role of newRoles) {
            try {
                const created = await prisma.companyRole.create({ data: role });
                console.log('Created:', created);
            } catch (e) {
                if (e.code === 'P2002') {
                    console.log('Role already exists:', role.name);
                } else {
                    throw e;
                }
            }
        }

        // Show final state
        const all = await prisma.companyRole.findMany();
        console.log('All roles:', all);
    } finally {
        await prisma.$disconnect();
    }
}

addCompanyRoles().catch(console.error);
