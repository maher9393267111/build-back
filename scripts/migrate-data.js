require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Validate environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Create a .env file with your source database connection string');
  console.error('Example: DATABASE_URL="postgresql://username:password@localhost:5432/source_database"');
  process.exit(1);
}

if (!process.env.PRODATABASE_URL) {
  console.error('ERROR: PRODATABASE_URL environment variable is not set');
  console.error('Create a .env file with your target database connection string');
  console.error('Example: PRODATABASE_URL="postgresql://username:password@localhost:5432/prod_database"');
  process.exit(1);
}

// Create two Prisma clients - one for source and one for target
const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const targetPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRODATABASE_URL,
    },
  },
});

// Define the migration order to respect foreign key dependencies
const migrationOrder = [
  'User',           // No dependencies
  'BlogCategory',   // No dependencies
  'Media',          // No dependencies  
  'Blog',           // Depends on BlogCategory
  'Faq',            // No dependencies
  'Page',           // Depends on User
  'Block',          // Depends on Page
  'BlockTemplate',  // No dependencies
  'SiteSettings'    // No dependencies
];

async function migrateModel(modelName) {
  console.log(`Migrating ${modelName}...`);
  
  // Get all records from source database
  const records = await sourcePrisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)].findMany();
  console.log(`Found ${records.length} ${modelName} records in source database`);
  
  if (records.length === 0) {
    console.log(`No ${modelName} records to migrate`);
    return 0;
  }

  // Insert records into target database
  let successCount = 0;
  
  for (const record of records) {
    try {
      // Remove any auto-generated fields before inserting
      const { id, createdAt, updatedAt, ...data } = record;
      
      // For PostgreSQL, we need to handle the ID strategy differently
      // We'll create with the original ID to maintain relations
      await targetPrisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)].create({
        data: {
          ...data,
          id: record.id, // Keep the original ID
          // Restore createdAt and updatedAt if they exist
          ...(record.createdAt && { createdAt: record.createdAt }),
          ...(record.updatedAt && { updatedAt: record.updatedAt })
        }
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to migrate ${modelName} record ID ${record.id}:`, error.message);
    }
  }
  
  console.log(`Successfully migrated ${successCount}/${records.length} ${modelName} records`);
  return successCount;
}

async function migrateData() {
  console.log('Starting database migration...');
  console.log(`Source DB: ${process.env.DATABASE_URL}`);
  console.log(`Target DB: ${process.env.PRODATABASE_URL}`);
  
  let totalMigrated = 0;
  
  // Migrate each model in order
  for (const modelName of migrationOrder) {
    try {
      const count = await migrateModel(modelName);
      totalMigrated += count;
    } catch (error) {
      console.error(`Error migrating ${modelName}:`, error);
    }
  }

  console.log(`Migration completed. Total records migrated: ${totalMigrated}`);
}

// Execute migration
migrateData()
  .then(async () => {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
    process.exit(1);
  }); 