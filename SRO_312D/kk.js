const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://thummalanithinreddy4:niThin45@cluster0.rzh9o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Define the boat schema
const boatSchema = new mongoose.Schema({
  id: String,
  name: String,
  code: String,
  latitude: Number,
  longitude: Number,
  status: String,
  lastUpdated: Date,
  portName: String,
  boatType: String
});

const Boat = mongoose.model('Boat', boatSchema);

const boatData = [
  {
    id: "1",
    name: "Perth Pioneer",
    code: "PP-001",
    latitude: -32.0397,
    longitude: 115.7395,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Fremantle Port, Australia",
    boatType: "cargo"
  },
  {
    id: "2",
    name: "Darwin Voyager",
    code: "DV-002",
    latitude: -12.4634,
    longitude: 130.8456,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Darwin, Australia",
    boatType: "tanker"
  },
  {
    id: "3",
    name: "Toamasina Trader",
    code: "TT-003",
    latitude: -18.1495,
    longitude: 49.4024,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Toamasina, Madagascar",
    boatType: "container"
  },
  {
    id: "4",
    name: "Mahajanga Mariner",
    code: "MM-004",
    latitude: -15.7167,
    longitude: 46.3167,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Mahajanga, Madagascar",
    boatType: "fishing"
  },
  {
    id: "5",
    name: "Ocean Explorer",
    code: "OE-005",
    latitude: -15.9,
    longitude: 75.3,
    status: "active",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    boatType: "research"
  },
  {
    id: "6",
    name: "Indian Voyager",
    code: "IV-006",
    latitude: -12.5,
    longitude: 80.2,
    status: "active",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    boatType: "cargo"
  },
  {
    id: "7",
    name: "Mumbai Merchant",
    code: "MM-007",
    latitude: 18.9398,
    longitude: 72.8583,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Mumbai Port, India",
    boatType: "container"
  },
  {
    id: "8",
    name: "Dubai Deliverance",
    code: "DD-008",
    latitude: 25.2697,
    longitude: 55.2708,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port Rashid, Dubai",
    boatType: "luxury"
  },
  {
    id: "9",
    name: "Singapore Star",
    code: "SS-009",
    latitude: 1.2655,
    longitude: 103.824,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Singapore",
    boatType: "tanker"
  },
  {
    id: "10",
    name: "Colombo Carrier",
    code: "CC-010",
    latitude: 6.9417,
    longitude: 79.8425,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Colombo, Sri Lanka",
    boatType: "cargo"
  },
  {
    id: "11",
    name: "Mombasa Master",
    code: "MM-011",
    latitude: -4.0435,
    longitude: 39.6682,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Mombasa, Kenya",
    boatType: "container"
  },
  {
    id: "12",
    name: "Cape Town Cruiser",
    code: "CT-012",
    latitude: -33.9062,
    longitude: 18.4355,
    status: "docked",
    lastUpdated: new Date("2025-03-29T12:00:00Z"),
    portName: "Port of Cape Town, South Africa",
    boatType: "passenger"
  }
];

async function insertBoatData() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("Connected to MongoDB");

    const companiesCollection = mongoose.connection.db.collection('companies');

    // Update the company with companyID 'ab_312d' and set the Boat_Coordinates field
    const result = await companiesCollection.updateOne(
      { companyID: 'ab_312d' }, 
      { $set: { Boat_Coordinates: boatData } }, 
      { upsert: true } // Creates a new document if not found
    );

    if (result.matchedCount > 0) {
      console.log("Boat_Coordinates field updated successfully");
    } else {
      console.log("Company not found, created new document with Boat_Coordinates");
    }
    
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Execute the function
insertBoatData();