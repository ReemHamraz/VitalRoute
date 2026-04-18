// seed.js (Run this once locally via 'node seed.js')
require('dotenv').config();
const { db } = require('./src/config/firebase');

const seedData = async () => {
  console.log('🌱 Seeding VitalRoute Database...');



  const hospitals = [
    {
      id: 'hosp_alpha',
      name: 'City Central Hospital',
      lat: 26.8467, lng: 80.9462, // Lucknow coordinates for testing
      status: 'green',
      inventory: {
        blood_O_negative: { quantity: 15, threshold: 5 },
        oxygen_tanks: { quantity: 40, threshold: 10 },
        ventilators: { quantity: 5, threshold: 2 }
      }
    },
    {
      id: 'hosp_beta',
      name: 'Northside Medical',
      lat: 26.8500, lng: 80.9500, 
      status: 'yellow',
      inventory: {
        blood_O_negative: { quantity: 2, threshold: 5 }, // Triggers yellow
        oxygen_tanks: { quantity: 12, threshold: 10 },
        ventilators: { quantity: 0, threshold: 2 }       // Triggers red if cron runs
      }
    }
  ];

  const suppliers = [
    {
      id: 'sup_omega',
      name: 'National Medical Logistics',
      type: 'supplier',
      lat: 26.8600, lng: 80.9600,
      inventory: {
        blood_O_negative: { quantity: 500, threshold: 50 },
        oxygen_tanks: { quantity: 200, threshold: 20 },
      }
    }
  ];

  try {
    for (const h of hospitals) {
      await db.collection('hospitals').doc(h.id).set(h);
      console.log(`✅ Added Hospital: ${h.name}`);
    }
    for (const s of suppliers) {
      await db.collection('suppliers').doc(s.id).set(s);
      console.log(`✅ Added Supplier: ${s.name}`);
    }
    console.log('🎉 Seeding complete! You can now test the Matching API.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
