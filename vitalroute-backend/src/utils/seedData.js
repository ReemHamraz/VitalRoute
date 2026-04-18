const { db } = require('../config/firebase');

const LUCKNOW_CENTER = { lat: 26.8467, lng: 80.9462 };

const generateRandomLocation = (center, radiusStr) => {
    const radius = parseFloat(radiusStr) / 111; 
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return {
        lat: center.lat + r * Math.cos(theta),
        lng: center.lng + r * Math.sin(theta)
    }
};

const defaultInventory = (multiplier = 1) => ({
    oxygen_tanks: { quantity: Math.floor(Math.random() * 50 * multiplier), threshold: 10 },
    blood_O_negative: { quantity: Math.floor(Math.random() * 20 * multiplier), threshold: 5 },
    blood_A_positive: { quantity: Math.floor(Math.random() * 30 * multiplier), threshold: 10 },
    blood_B_positive: { quantity: Math.floor(Math.random() * 30 * multiplier), threshold: 10 },
    blood_AB_positive: { quantity: Math.floor(Math.random() * 10 * multiplier), threshold: 2 },
    ventilators: { quantity: Math.floor(Math.random() * 15 * multiplier), threshold: 2 },
    morphine_vials: { quantity: Math.floor(Math.random() * 100 * multiplier), threshold: 20 },
    epinephrine: { quantity: Math.floor(Math.random() * 50 * multiplier), threshold: 10 },
});

const getStatus = (inventory) => {
    let isCrit = false;
    let isWarn = false;
    for(const k of Object.values(inventory)) {
        if (k.quantity === 0) isCrit = true;
        else if (k.quantity < k.threshold) isWarn = true;
    }
    if (isCrit) return 'red';
    if (isWarn) return 'yellow';
    return 'green';
};

const seed = async () => {
    console.log("Starting Seeding Process...");
    try {
        const batchHospitals = db.batch();
        for (let i = 1; i <= 50; i++) {
            const loc = generateRandomLocation(LUCKNOW_CENTER, 15);
            const ref = db.collection('hospitals').doc();
            const inv = defaultInventory(1); 
            batchHospitals.set(ref, {
                name: `Lucknow General Hospital ${i}`,
                address: `Sector ${i}, Lucknow`,
                lat: loc.lat,
                lng: loc.lng,
                contactEmail: `contact${i}@hospital.com`,
                contactPhone: `+91 99999${i.toString().padStart(5, '0')}`,
                adminUserId: `admin_${i}`,
                inventory: inv,
                status: getStatus(inv),
                lastUpdated: new Date()
            });
        }
        await batchHospitals.commit();
        console.log("Seeded 50 Hospitals.");

        const batchSuppliers = db.batch();
        const types = ['pharmacy', 'medical_store', 'blood_bank', 'oxygen_supplier'];
        for (let i = 1; i <= 15; i++) {
            const loc = generateRandomLocation(LUCKNOW_CENTER, 20);
            const ref = db.collection('suppliers').doc();
            const type = types[i % 4];
            
            const inv = defaultInventory(10); 
            
            batchSuppliers.set(ref, {
                name: `Lucknow Metro Supplier ${i}`,
                type: type,
                lat: loc.lat,
                lng: loc.lng,
                inventory: inv,
                isVerified: true
            });
        }
        await batchSuppliers.commit();
        console.log("Seeded 15 Suppliers.");

        const hospitalsListResponse = await db.collection('hospitals').limit(3).get();
        const hospList = [];
        hospitalsListResponse.forEach(d => hospList.push(d.id));

        if (hospList.length === 3) {
            await db.collection('supply_requests').add({
                requestingHospitalId: hospList[0],
                items: [{ category: 'blood', name: 'blood_O_negative', quantity: 10, unit: 'units' }],
                urgency: 'CRITICAL',
                status: 'pending',
                contextNote: 'Emergency ward accident victims',
                flags: ['mass_casualty'],
                matches: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await db.collection('supply_requests').add({
                requestingHospitalId: hospList[1],
                items: [{ category: 'oxygen', name: 'oxygen_tanks', quantity: 5, unit: 'tanks' }],
                urgency: 'URGENT',
                status: 'in_transit',
                contextNote: 'ICU running low',
                flags: [],
                matches: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await db.collection('supply_requests').add({
                requestingHospitalId: hospList[2],
                items: [{ category: 'medicine', name: 'morphine_vials', quantity: 20, unit: 'vials' }],
                urgency: 'NORMAL',
                status: 'delivered',
                contextNote: 'Restock pending',
                flags: [],
                matches: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log("Seeded 3 Supply Requests.");
        }

        console.log("Seeding Complete!");
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
