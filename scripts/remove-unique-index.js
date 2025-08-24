// Script to remove old unique index from voucher_user collection
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function removeUniqueIndex() {
  try {
    const db = mongoose.connection.db;
    
    // List all collections first
    console.log('🔍 Listing all collections...');
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections:', collections.map(c => c.name));
    
    // Try different collection names
    const possibleNames = ['voucher_user', 'voucher_users', 'Voucher_User'];
    let collection = null;
    
    for (const name of possibleNames) {
      try {
        const testCollection = db.collection(name);
        const count = await testCollection.countDocuments();
        console.log(`📊 Collection '${name}' has ${count} documents`);
        collection = testCollection;
        break;
      } catch (err) {
        console.log(`❌ Collection '${name}' not found`);
      }
    }
    
    if (!collection) {
      throw new Error('Voucher user collection not found');
    }
    
    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes);
    
    // Find and remove unique indexes
    for (const index of indexes) {
      const indexName = index.name;
      if (indexName.includes('Account_id') && indexName.includes('voucher_id') && index.unique) {
        console.log(`❌ Removing unique index ${indexName}...`);
        await collection.dropIndex(indexName);
        console.log(`✅ Index ${indexName} removed!`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

mongoose.connection.once('open', () => {
  console.log('🔗 Connected to MongoDB');
  removeUniqueIndex();
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});
