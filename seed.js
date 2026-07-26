require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Driver = require('./models/Driver');
const Bin = require('./models/Bin');
const Complaint = require('./models/Complaint');
const Counter = require('./models/Counter');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_management';

const wards = ['Ward-12', 'Ward-15', 'Ward-18'];
const zones = ['North', 'Central', 'East'];

const depotLat = 28.6139;
const depotLng = 77.209;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Admin.deleteMany({}),
    Driver.deleteMany({}),
    Bin.deleteMany({}),
    Complaint.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const admin = await Admin.create({
    name: 'City Admin',
    email: 'admin@smartcity.gov.in',
    password: 'admin123',
    department: 'Solid Waste',
    zone: 'Central',
  });

  const drivers = await Driver.insertMany([
    {
      name: 'Ravi Kumar',
      email: 'ravi@fleet.in',
      password: 'driver123',
      vehicleNumber: 'DL-01-AB-1001',
      assignedZone: 'North',
      licenseNumber: 'DL-123456',
    },
    {
      name: 'Sunita Devi',
      email: 'sunita@fleet.in',
      password: 'driver123',
      vehicleNumber: 'DL-01-CD-2202',
      assignedZone: 'East',
      licenseNumber: 'DL-654321',
    },
  ]);

  const citizens = await User.insertMany([
    {
      name: 'Ananya Sharma',
      email: 'ananya@mail.in',
      password: 'citizen123',
      ward: wards[0],
      phone: '9810011001',
      address: 'Sector 4',
    },
    {
      name: 'Vikram Singh',
      email: 'vikram@mail.in',
      password: 'citizen123',
      ward: wards[1],
      phone: '9810011002',
    },
    {
      name: 'Meera Iyer',
      email: 'meera@mail.in',
      password: 'citizen123',
      ward: wards[2],
    },
    {
      name: 'Arjun Patel',
      email: 'arjun@mail.in',
      password: 'citizen123',
      ward: wards[0],
    },
    {
      name: 'Kavita Rao',
      email: 'kavita@mail.in',
      password: 'citizen123',
      ward: wards[1],
    },
  ]);

  const binDocs = [];
  for (let i = 1; i <= 15; i++) {
    const w = wards[i % 3];
    const z = zones[i % 3];
    const lat = depotLat + (Math.random() - 0.5) * 0.08;
    const lng = depotLng + (Math.random() - 0.5) * 0.08;
    const fill = [15, 25, 45, 55, 72, 78, 85, 92, 30, 40, 60, 88, 95, 20, 70][i - 1];
    binDocs.push({
      binId: `BIN-DL-${String(i).padStart(3, '0')}`,
      location: {
        address: `${i} Main Street, ${w}`,
        ward: w,
        zone: z,
        lat,
        lng,
      },
      fillLevel: fill,
      wasteType: i % 3 === 0 ? 'wet' : i % 3 === 1 ? 'dry' : 'mixed',
      assignedDriver: i % 4 === 0 ? drivers[0]._id : undefined,
    });
  }
  const bins = await Bin.insertMany(binDocs);

  const statuses = ['pending', 'in-progress', 'resolved', 'pending', 'resolved'];
  const categories = ['overflow', 'missed-pickup', 'smell', 'illegal-dumping', 'damaged-bin'];
  for (let i = 0; i < 10; i++) {
    await Complaint.create({
      citizen: citizens[i % citizens.length]._id,
      title: `Sample issue ${i + 1}`,
      description: 'Reported during seed — bins or pickup in the area.',
      category: categories[i % categories.length],
      location: {
        address: `Near park, ${wards[i % 3]}`,
        ward: wards[i % 3],
        lat: depotLat + 0.01 * i,
        lng: depotLng + 0.01 * i,
      },
      status: statuses[i % statuses.length],
      priority: i % 2 === 0 ? 'high' : 'medium',
      adminRemarks: i > 4 ? 'Team notified.' : '',
      assignedDriver: i % 3 === 0 ? drivers[1]._id : undefined,
      resolvedAt: statuses[i % statuses.length] === 'resolved' ? new Date() : undefined,
    });
  }

  console.log('Seed complete.');
  console.log('Admin: admin@smartcity.gov.in / admin123');
  console.log('Drivers: ravi@fleet.in / driver123, sunita@fleet.in / driver123');
  console.log('Citizens: ananya@mail.in / citizen123 (and others same password)');
  console.log(`Bins: ${bins.length}, Complaints: 10`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
