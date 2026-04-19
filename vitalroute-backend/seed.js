require('dotenv').config();
const { db } = require('./src/config/firebase');

const inv = (o, t) => ({ quantity: o, threshold: t }); // shorthand

const HOSPITALS = [
  // ── Chowk / Old City ──────────────────────────────────────────────────────
  { id:'h01', name:"King George's Medical University", district:"Chowk",      lat:26.8638, lng:80.9228, beds:2800 },
  { id:'h02', name:"Balrampur Hospital",               district:"Golaganj",    lat:26.8611, lng:80.9175, beds:1100 },
  { id:'h03', name:"Civil Hospital Lucknow",           district:"Hussainganj", lat:26.8492, lng:80.9404, beds:680  },
  { id:'h04', name:"Queen Mary's Hospital",            district:"Chowk",       lat:26.8625, lng:80.9195, beds:450  },
  { id:'h05', name:"Shyam Shah Medical College Hosp",  district:"Chowk",       lat:26.8601, lng:80.9237, beds:520  },
  // ── Hazratganj / Central ──────────────────────────────────────────────────
  { id:'h06', name:"Ram Manohar Lohia Hospital",       district:"Vibhuti Khand",lat:26.8462,lng:80.9462, beds:850  },
  { id:'h07', name:"Errum Manzil Hospital",            district:"Hazratganj",  lat:26.8479, lng:80.9507, beds:280  },
  { id:'h08', name:"City Hospital Hazratganj",         district:"Hazratganj",  lat:26.8456, lng:80.9491, beds:310  },
  { id:'h09', name:"Shyama Prasad Mukherjee Hosp",    district:"Mahanagar",   lat:26.8683, lng:80.9574, beds:500  },
  { id:'h10', name:"Vivekananda Polyclinic",           district:"Nirala Nagar",lat:26.8529, lng:80.9819, beds:300  },
  // ── Gomti Nagar ───────────────────────────────────────────────────────────
  { id:'h11', name:"Medanta Hospital Lucknow",         district:"Gomti Nagar", lat:26.8456, lng:81.0041, beds:550  },
  { id:'h12', name:"Apollomedics Super Speciality",    district:"Gomti Nagar", lat:26.8573, lng:80.9988, beds:600  },
  { id:'h13', name:"Sahara Hospital",                  district:"Gomti Nagar", lat:26.8512, lng:80.9956, beds:480  },
  { id:'h14', name:"Max Super Speciality Hospital",    district:"Gomti Nagar", lat:26.8481, lng:81.0019, beds:420  },
  { id:'h15', name:"Sushila Tiwari Memorial Hospital", district:"Gomti Nagar", lat:26.8537, lng:80.9903, beds:350  },
  // ── Indira Nagar ──────────────────────────────────────────────────────────
  { id:'h16', name:"Rama Hospital Indira Nagar",       district:"Indira Nagar",lat:26.8871, lng:80.9914, beds:260  },
  { id:'h17', name:"Sahitya Hospital",                 district:"Indira Nagar",lat:26.8825, lng:80.9887, beds:220  },
  { id:'h18', name:"Nirogi Healthcare Indira Nagar",   district:"Indira Nagar",lat:26.8793, lng:80.9853, beds:180  },
  { id:'h19', name:"City Care Hospital Sec 21",        district:"Indira Nagar",lat:26.8912, lng:80.9932, beds:195  },
  { id:'h20', name:"Fortis Hospital Indira Nagar",     district:"Indira Nagar",lat:26.8848, lng:80.9901, beds:310  },
  // ── Aliganj / Vikas Nagar ─────────────────────────────────────────────────
  { id:'h21', name:"Kesari Hospital Aliganj",          district:"Aliganj",     lat:26.8821, lng:80.9674, beds:240  },
  { id:'h22', name:"Pal Hospital Aliganj",             district:"Aliganj",     lat:26.8796, lng:80.9644, beds:190  },
  { id:'h23', name:"Lucknow Heart Institute",          district:"Vikas Nagar", lat:26.8944, lng:80.9737, beds:280  },
  { id:'h24', name:"Pushpanjali Hospital Aliganj",     district:"Aliganj",     lat:26.8858, lng:80.9691, beds:210  },
  { id:'h25', name:"Rubi Hall Clinic",                 district:"Vikas Nagar", lat:26.8978, lng:80.9762, beds:170  },
  // ── Rajajipuram / Alambagh ────────────────────────────────────────────────
  { id:'h26', name:"Mayo Medical Centre",              district:"Alambagh",    lat:26.8113, lng:80.9091, beds:420  },
  { id:'h27', name:"Life Line Hospital Alambagh",      district:"Alambagh",    lat:26.8154, lng:80.9124, beds:310  },
  { id:'h28', name:"Sanjivini Hospital Rajajipuram",   district:"Rajajipuram", lat:26.8362, lng:80.9052, beds:275  },
  { id:'h29', name:"Apex Hospital Alambagh",           district:"Alambagh",    lat:26.8079, lng:80.9078, beds:230  },
  { id:'h30', name:"District Women Hospital",          district:"Rajajipuram", lat:26.8341, lng:80.9017, beds:380  },
  // ── Kanpur Road / Amausi ──────────────────────────────────────────────────
  { id:'h31', name:"Command Hospital Lucknow",         district:"Kanpur Road", lat:26.8226, lng:80.9049, beds:680  },
  { id:'h32', name:"City Heart Institute Amausi",      district:"Amausi",      lat:26.7986, lng:80.8897, beds:350  },
  { id:'h33', name:"Chandan Hospital Kanpur Road",     district:"Kanpur Road", lat:26.8189, lng:80.8974, beds:240  },
  { id:'h34', name:"Lotus Hospital Amausi",            district:"Amausi",      lat:26.8042, lng:80.8921, beds:195  },
  { id:'h35', name:"Sunrise Hospital Kanpur Road",     district:"Kanpur Road", lat:26.8157, lng:80.8952, beds:215  },
  // ── Raebareli Road / South ────────────────────────────────────────────────
  { id:'h36', name:"Sanjay Gandhi PGI",                district:"Raebareli Rd",lat:26.8153, lng:80.9820, beds:960  },
  { id:'h37', name:"Era's Lucknow Medical College",    district:"Sarfarazganj",lat:26.8087, lng:80.9583, beds:700  },
  { id:'h38', name:"AIIMS Lucknow",                   district:"Raebareli Rd",lat:26.8018, lng:80.9901, beds:900  },
  { id:'h39', name:"Integral Medical College",        district:"Kursi Road",  lat:26.8247, lng:81.0231, beds:500  },
  { id:'h40', name:"Jeevan Jyoti Hospital",           district:"Raebareli Rd",lat:26.8121, lng:80.9762, beds:320  },
  // ── Chinhat / Faizabad Road ───────────────────────────────────────────────
  { id:'h41', name:"Vatsalya Hospital Chinhat",        district:"Chinhat",     lat:26.8791, lng:81.0334, beds:245  },
  { id:'h42', name:"Sai Hospital Faizabad Road",       district:"Faizabad Rd", lat:26.8831, lng:81.0102, beds:210  },
  { id:'h43', name:"Bharat Hospital Chinhat",          district:"Chinhat",     lat:26.8824, lng:81.0412, beds:185  },
  { id:'h44', name:"Noor Hospital IT City",            district:"Chinhat",     lat:26.8856, lng:81.0378, beds:170  },
  { id:'h45', name:"Green City Hospital",              district:"Faizabad Rd", lat:26.8903, lng:81.0199, beds:225  },
  // ── Nishatganj / Kaiserbagh ───────────────────────────────────────────────
  { id:'h46', name:"Nishatganj Hospital",              district:"Nishatganj",  lat:26.8714, lng:80.9382, beds:290  },
  { id:'h47', name:"Babu Banarasi Das City Hospital",  district:"Faizabad Rd", lat:26.8768, lng:81.0078, beds:400  },
  { id:'h48', name:"Avadh Hospital Kaiserbagh",        district:"Kaiserbagh",  lat:26.8556, lng:80.9327, beds:265  },
  { id:'h49', name:"Tata Memorial Affiliate Lucknow",  district:"Vibhuti Khand",lat:26.8439,lng:80.9431, beds:335  },
  { id:'h50', name:"Dufferin Hospital",                district:"Chowk",       lat:26.8588, lng:80.9213, beds:490  },
];

// Inventory generator — creates realistic, varied stock levels
const makeInventory = (seed) => {
  const r = (max, thr, bias=1) => {
    const base = Math.floor(Math.random() * max * bias);
    return inv(Math.max(0, base), thr);
  };
  const biases = [0.1, 0.3, 0.5, 0.7, 0.9, 1.2]; // ensures some red/yellow/green spread
  const b = biases[seed % biases.length];
  return {
    oxygen_tanks:    r(40,  8,  b),
    blood_O_negative:r(20,  4,  b),
    blood_A_positive:r(20,  4,  b * 0.8),
    blood_B_positive:r(20,  4,  b * 0.9),
    blood_AB_positive:r(15, 3,  b * 0.7),
    ventilators:     r(12,  3,  b),
    morphine_vials:  r(200, 20, b),
    epinephrine:     r(100, 15, b),
  };
};

const computeStatus = (inventory) => {
  const items = Object.values(inventory);
  if (items.some(i => i.quantity === 0)) return 'red';
  if (items.some(i => i.quantity < i.threshold)) return 'yellow';
  return 'green';
};

const SUPPLIERS = [
  { id:'sup01', name:"MedLine Oxygen Pvt Ltd",         type:"oxygen_supplier", lat:26.8734, lng:80.9284 },
  { id:'sup02', name:"Lucknow Central Blood Bank",     type:"blood_bank",      lat:26.8501, lng:80.9373 },
  { id:'sup03', name:"Apollo Pharmacy Hub",            type:"pharmacy",        lat:26.8623, lng:80.9981 },
  { id:'sup04', name:"National Medical Logistics",     type:"medical_store",   lat:26.8601, lng:80.9601 },
  { id:'sup05', name:"OxyGen Express",                 type:"oxygen_supplier", lat:26.8192, lng:80.9041 },
  { id:'sup06', name:"Alambagh Medical Store",         type:"pharmacy",        lat:26.8143, lng:80.9087 },
  { id:'sup07', name:"City Blood Bank Gomti Nagar",    type:"blood_store",    lat:26.8556, lng:80.9971 },
  { id:'sup08', name:"Faizabad Rd Oxygen Supply",      type:"oxygen_supplier", lat:26.8872, lng:81.0089 },
  { id:'sup09', name:"Indira Nagar Pharma Depot",      type:"pharmacy",        lat:26.8832, lng:80.9921 },
  { id:'sup10', name:"KGMU Medical Stores",            type:"medical_store",   lat:26.8651, lng:80.9241 },
];

const SUPPLIER_INVENTORY = {
  oxygen_tanks:    inv(200, 20),
  blood_O_negative:inv(500, 50),
  blood_A_positive:inv(400, 40),
  blood_B_positive:inv(400, 40),
  blood_AB_positive:inv(300, 30),
  ventilators:     inv(25,  5),
  morphine_vials:  inv(2000,200),
  epinephrine:     inv(1000,100),
};

const DEMO_REQUESTS = [
  {
    id:'req_demo_01',
    requestingHospitalId:'h01',
    rawText:'Need 10 units O-negative blood and 2 ventilators URGENT highway accident',
    items:[{category:'blood',name:'O-negative blood',quantity:10,unit:'units'},{category:'equipment',name:'ventilators',quantity:2,unit:'units'}],
    urgency:'CRITICAL', status:'matched', contextNote:'Mass casualty highway accident',
    flags:['mass_casualty'], createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id:'req_demo_02',
    requestingHospitalId:'h26',
    rawText:'ICU oxygen running critically low',
    items:[{category:'oxygen',name:'oxygen tanks',quantity:5,unit:'tanks'}],
    urgency:'CRITICAL', status:'in_transit', contextNote:'ICU oxygen depletion',
    flags:['none'], createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id:'req_demo_03',
    requestingHospitalId:'h16',
    rawText:'Request 50 vials morphine for post-op ward',
    items:[{category:'medicine',name:'morphine vials',quantity:50,unit:'vials'}],
    urgency:'NORMAL', status:'pending', contextNote:'Routine post-op supply',
    flags:['none'], createdAt: new Date(), updatedAt: new Date(),
  },
];

// ── Seed runner ───────────────────────────────────────────────────────────────
const seedData = async () => {
  console.log('🌱 Seeding VitalRoute — 50 hospitals, 10 suppliers, 3 demo requests...\n');

  // Hospitals in batches of 10 (Firestore batch limit is 500 ops, but let's be clean)
  let count = 0;
  for (const h of HOSPITALS) {
    const inventory = makeInventory(count);
    const status = computeStatus(inventory);
    await db.collection('hospitals').doc(h.id).set({
      ...h,
      inventory,
      status,
      contactEmail: `admin@${h.id}.vitalroute.in`,
      contactPhone: `+91-522-${Math.floor(2000000 + Math.random() * 7999999)}`,
      lastUpdated:  new Date(),
    });
    console.log(`✅ Hospital ${++count}/50: ${h.name} [${status.toUpperCase()}]`);
  }

  console.log('');
  count = 0;
  for (const s of SUPPLIERS) {
    await db.collection('suppliers').doc(s.id).set({
      ...s,
      inventory: SUPPLIER_INVENTORY,
      isVerified: true,
      contactEmail: `ops@${s.id}.vitalroute.in`,
      lastUpdated: new Date(),
    });
    console.log(`✅ Supplier ${++count}/10: ${s.name}`);
  }

  console.log('');
  for (const r of DEMO_REQUESTS) {
    await db.collection('supply_requests').doc(r.id).set(r);
    console.log(`✅ Demo request: ${r.id} [${r.status}]`);
  }

  console.log('\n🎉 Seeding complete! 50 hospitals, 10 suppliers, 3 requests ready.');
  console.log('   Run: node seed.js — then open Firebase Console to verify.');
  process.exit(0);
};

seedData().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
