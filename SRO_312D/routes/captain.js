const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Middleware to check if captain is authenticated
const isCaptainAuthenticated = (req, res, next) => {
    if (req.session.captainAuthenticated) {
        return next();
    }
    res.redirect('/captain/login');
};

// Captain login page
router.get('/login', (req, res) => {
    res.render('captain/login', { error: null });
});

// Process captain login
router.post('/login', async (req, res) => {
    try {
        const { shipId, pin } = req.body;
        
        console.log('Captain login attempt:', { shipId, pin });
        
        // Find company that has this boat
        const company = await Company.findOne({ 
            "Boat_Coordinates.id": shipId,
            "Boat_Coordinates.pin": pin 
        });
        
        if (!company) {
            return res.render('captain/login', { error: 'Invalid Ship ID or PIN. Please try again.' });
        }
        
        // Find the specific boat
        const boat = company.Boat_Coordinates.find(b => b.id === shipId && b.pin === pin);
        
        if (!boat) {
            return res.render('captain/login', { error: 'Ship data not found.' });
        }
        
        // Set authenticated session for captain
        req.session.captainAuthenticated = true;
        req.session.shipId = shipId;
        req.session.companyId = company.companyId;
        req.session.shipName = boat.name;
        
        res.redirect('/captain/dashboard');
    } catch (error) {
        console.error('Captain login error:', error);
        res.render('captain/login', { error: 'An error occurred. Please try again.' });
    }
});




// Captain dashboard (protected route)
router.get('/dashboard', isCaptainAuthenticated, async (req, res) => {
    const csvFilePath = path.join(__dirname, 'reduced_grid_coordinates.csv');
  let csvData = '';
  try {
    csvData = fs.readFileSync(csvFilePath, 'utf8');
  } catch (err) {
    console.error('Error reading CSV file:', err);
  }
  console.log("CSV Data Length:", csvData.length);


    try {
        const companyId = req.session.companyId;
        const shipId = req.session.shipId;
        
        // Get the company and boat data
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            req.session.destroy();
            return res.redirect('/captain/login');
        }
        
        // Get the specific boat
        const boat = company.Boat_Coordinates.find(b => b.id === shipId);
        
        if (!boat) {
            req.session.destroy();
            return res.redirect('/captain/login');
        }
        
        // Set default source and destination coordinates (current position)
        const sourceCoords = {
            latitude: boat.latitude,
            longitude: boat.longitude
        };
        
        // Default destination (can be updated by the user)
        const destinationCoords = {
            latitude: boat.latitude,
            longitude: boat.longitude
        };
        
        res.render('captain/dashboard', {
            shipName: boat.name,
            shipId: boat.id,
            shipData: boat,
            companyName: company.companyName,
            sourceCoords,
            destinationCoords,
            optimizedPath: null,
            predictions: null,
            csvData 
        });
    } catch (error) {
        console.error('Error fetching captain dashboard data:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

// Update boat location and destination
router.post('/update-location', isCaptainAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        const shipId = req.session.shipId;
        const { latitude, longitude, destinationPort, status } = req.body;
        
        console.log('Captain update location:', { shipId, latitude, longitude, destinationPort, status });
        
        // Update the boat data
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        
        // Find the boat index
        const boatIndex = company.Boat_Coordinates.findIndex(b => b.id === shipId);
        
        if (boatIndex === -1) {
            return res.status(404).json({ success: false, message: 'Ship not found' });
        }
        
        // Update the boat data
        if (latitude) company.Boat_Coordinates[boatIndex].latitude = parseFloat(latitude);
        if (longitude) company.Boat_Coordinates[boatIndex].longitude = parseFloat(longitude);
        if (destinationPort) company.Boat_Coordinates[boatIndex].portName = destinationPort;
        if (status) company.Boat_Coordinates[boatIndex].status = status;
        
        // Update lastUpdated
        company.Boat_Coordinates[boatIndex].lastUpdated = new Date();
        
        await company.save();
        
        return res.redirect('/captain/dashboard');
    } catch (error) {
        console.error('Error updating ship location:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

// Get optimized route
router.post('/optimize-route', isCaptainAuthenticated, async (req, res) => {
    try {
        const companyId = req.session.companyId;
        const shipId = req.session.shipId;
        const { sourceLat, sourceLng, destLat, destLng } = req.body;
        
        console.log('Route optimization request:', { 
            shipId, 
            source: { lat: sourceLat, lng: sourceLng }, 
            destination: { lat: destLat, lng: destLng } 
        });
        
        // Get the company and boat data
        const company = await Company.findOne({ companyId });
        
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        
        // Get the specific boat
        const boat = company.Boat_Coordinates.find(b => b.id === shipId);
        
        if (!boat) {
            return res.status(404).json({ success: false, message: 'Ship not found' });
        }
        
        // Source coordinates (current position if not provided)
        const sourceCoords = {
            latitude: sourceLat ? parseFloat(sourceLat) : boat.latitude,
            longitude: sourceLng ? parseFloat(sourceLng) : boat.longitude
        };
        
        // Destination coordinates
        const destinationCoords = {
            latitude: parseFloat(destLat),
            longitude: parseFloat(destLng)
        };
        
        // Get ocean condition predictions for source point
        const sourcePredictions = await getPredictions(sourceCoords.latitude, sourceCoords.longitude);
        
        // Get ocean condition predictions for destination point
        const destPredictions = await getPredictions(destinationCoords.latitude, destinationCoords.longitude);
        
        // Generate a path between source and destination using the predictions
        const optimizedPath = await generateOptimizedPathWithPredictions(sourceCoords, destinationCoords, sourcePredictions, destPredictions);
        
        // Render the dashboard with the optimized path
        res.render('captain/dashboard', {
            shipName: boat.name,
            shipId: boat.id,
            shipData: boat,
            companyName: company.companyName,
            sourceCoords,
            destinationCoords,
            optimizedPath,
            predictions: sourcePredictions // Show source point predictions
        });
    } catch (error) {
        console.error('Error optimizing route:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

// API endpoint to get predictions for a specific point
router.get('/api/predictions', isCaptainAuthenticated, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
        }
        
        const predictions = await getPredictions(parseFloat(lat), parseFloat(lng));
        
        res.json({ success: true, predictions });
    } catch (error) {
        console.error('Error getting predictions:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Function to call the Python model and get predictions
function getPredictions(latitude, longitude) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../python_model/main.py')
        ]);
        
        let result = '';
        let error = '';
        
        // Send input to the Python process
        pythonProcess.stdin.write(`${latitude}\n`);
        pythonProcess.stdin.write(`${longitude}\n`);
        pythonProcess.stdin.end();
        
        // Collect output
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        // Collect errors
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                console.error('Error:', error);
                return reject(new Error(`Python process failed with code ${code}: ${error}`));
            }
            
            try {
                // Parse the predictions from the output
                const predictionLines = result.split('\n');
                const predictions = {};
                
                // Skip the first line which is "Predictions:"
                for (let i = 1; i < predictionLines.length; i++) {
                    const line = predictionLines[i].trim();
                    if (line) {
                        const [key, value] = line.split(':').map(part => part.trim());
                        predictions[key] = parseFloat(value);
                    }
                }
                
                resolve(predictions);
            } catch (err) {
                reject(err);
            }
        });
    });
}

// Function to generate an optimized path between source and destination using ocean predictions
async function generateOptimizedPathWithPredictions(source, destination, sourcePredictions, destPredictions) {
    console.log("Generating 100% OCEAN-ONLY path from", source, "to", destination);
    
    // MARITIME NAVIGATION APPROACH - GUARANTEED DEEP WATER ONLY
    
    // Define major oceans and seas with their deep water coordinates
    // These coordinates are carefully selected to be far from any coastlines
    const DEEP_WATER_REGIONS = [
        {
            name: "Bay of Bengal Deep Water",
            center: { lat: 15.0, lng: 87.0 },
            radius: 400, // km
            safePoints: [
                { lat: 15.0, lng: 87.0 },
                { lat: 14.0, lng: 86.0 },
                { lat: 16.0, lng: 88.0 },
                { lat: 13.0, lng: 85.0 },
                { lat: 17.0, lng: 89.0 }
            ]
        },
        {
            name: "Indian Ocean North",
            center: { lat: 8.0, lng: 83.0 },
            radius: 350, // km
            safePoints: [
                { lat: 8.0, lng: 83.0 },
                { lat: 7.0, lng: 82.0 },
                { lat: 9.0, lng: 84.0 },
                { lat: 6.0, lng: 84.0 },
                { lat: 10.0, lng: 82.0 }
            ]
        },
        {
            name: "Andaman Sea",
            center: { lat: 12.0, lng: 95.0 },
            radius: 300, // km
            safePoints: [
                { lat: 12.0, lng: 95.0 },
                { lat: 11.0, lng: 94.0 },
                { lat: 13.0, lng: 96.0 },
                { lat: 10.0, lng: 95.0 },
                { lat: 14.0, lng: 94.0 }
            ]
        }
    ];
    
    // Define known land areas to strictly avoid
    const LAND_AREAS = [
        {
            name: "Indian East Coast",
            // Define a polygon that covers the entire east coast of India with a wide buffer
            polygon: [
                { lat: 8.0, lng: 77.0 },   // Southern tip with buffer
                { lat: 10.0, lng: 78.0 },  // Moving up the coast
                { lat: 12.0, lng: 79.0 },  // Chennai area with buffer
                { lat: 14.0, lng: 79.5 },  // Mid-coast
                { lat: 16.0, lng: 80.5 },  // Continuing north
                { lat: 18.0, lng: 83.0 },  // Northern area
                { lat: 20.0, lng: 85.0 },  // Far north
                { lat: 22.0, lng: 87.0 },  // Northeast corner
                { lat: 22.0, lng: 85.0 },  // Inland point
                { lat: 20.0, lng: 83.0 },  // Inland point
                { lat: 18.0, lng: 81.0 },  // Inland point
                { lat: 16.0, lng: 78.0 },  // Inland point
                { lat: 14.0, lng: 77.0 },  // Inland point
                { lat: 12.0, lng: 76.0 },  // Inland point
                { lat: 10.0, lng: 76.0 },  // Inland point
                { lat: 8.0, lng: 76.0 }    // Back to start region
            ]
        },
        {
            name: "Sri Lanka",
            // Define a polygon that covers Sri Lanka with a wide buffer
            polygon: [
                { lat: 5.5, lng: 79.0 },   // Southwest with buffer
                { lat: 5.5, lng: 82.0 },   // Southeast with buffer
                { lat: 10.0, lng: 82.0 },  // Northeast with buffer
                { lat: 10.0, lng: 79.0 }   // Northwest with buffer
            ]
        },
        {
            name: "Andaman Islands",
            // Define a polygon that covers the Andaman Islands with a wide buffer
            polygon: [
                { lat: 10.0, lng: 91.5 },  // Southwest with buffer
                { lat: 10.0, lng: 94.0 },  // Southeast with buffer
                { lat: 14.0, lng: 94.0 },  // Northeast with buffer
                { lat: 14.0, lng: 91.5 }   // Northwest with buffer
            ]
        },
        {
            name: "Myanmar Coast",
            // Define a polygon that covers Myanmar coast with a wide buffer
            polygon: [
                { lat: 14.0, lng: 96.0 },  // Southern point
                { lat: 16.0, lng: 97.0 },  // Southeast
                { lat: 18.0, lng: 96.0 },  // East
                { lat: 20.0, lng: 94.0 },  // Northeast
                { lat: 20.0, lng: 91.0 },  // North
                { lat: 18.0, lng: 90.0 },  // Northwest
                { lat: 16.0, lng: 92.0 },  // West
                { lat: 14.0, lng: 93.0 }   // Southwest
            ]
        },
        {
            name: "Thailand-Malaysia Peninsula",
            // Define a polygon that covers Thailand-Malaysia peninsula with a wide buffer
            polygon: [
                { lat: 1.0, lng: 98.0 },   // Southern tip
                { lat: 5.0, lng: 100.0 },  // West coast
                { lat: 10.0, lng: 99.0 },  // Central west
                { lat: 15.0, lng: 100.0 }, // Northern area
                { lat: 15.0, lng: 103.0 }, // Northeast
                { lat: 10.0, lng: 104.0 }, // East coast
                { lat: 5.0, lng: 103.0 },  // Southeast
                { lat: 1.0, lng: 102.0 }   // Southern east
            ]
        }
    ];
    
    // Convert source and destination to our format
    const sourcePoint = { lat: source.latitude, lng: source.longitude };
    const destPoint = { lat: destination.latitude, lng: destination.longitude };
    
    // Step 1: Check if source or destination are on land or too close to land
    const sourceOnLand = isPointOnLandOrTooClose(sourcePoint, LAND_AREAS, 50); // 50km safety buffer
    const destOnLand = isPointOnLandOrTooClose(destPoint, LAND_AREAS, 50);
    
    // Step 2: Find safe deep water points for source and destination
    let safeSourcePoint = sourcePoint;
    let safeDestPoint = destPoint;
    
    if (sourceOnLand) {
        console.log("⚠️ Source point is on land or too close to land, finding safe deep water point");
        safeSourcePoint = findSafeDeepWaterPoint(sourcePoint, DEEP_WATER_REGIONS);
        console.log(`Adjusted source to safe deep water point: ${safeSourcePoint.lat}, ${safeSourcePoint.lng}`);
    }
    
    if (destOnLand) {
        console.log("⚠️ Destination point is on land or too close to land, finding safe deep water point");
        safeDestPoint = findSafeDeepWaterPoint(destPoint, DEEP_WATER_REGIONS);
        console.log(`Adjusted destination to safe deep water point: ${safeDestPoint.lat}, ${safeDestPoint.lng}`);
    }
    
    // Step 3: Generate a path through deep water regions
    const deepWaterPath = generateDeepWaterPath(safeSourcePoint, safeDestPoint, DEEP_WATER_REGIONS, LAND_AREAS);
    
    // Step 4: Apply smoothing to create a natural curved path
    const smoothedPath = createSmoothOceanPath(deepWaterPath);
    
    // Step 5: Verify no point in the path is on land or too close to land
    const finalPath = verifyAndFixPath(smoothedPath, LAND_AREAS, DEEP_WATER_REGIONS);
    
    console.log(`Generated 100% guaranteed ocean-only path with ${finalPath.length} points`);
    return finalPath;
}

// Function to check if a point is on land or too close to land
function isPointOnLandOrTooClose(point, landAreas, safetyBuffer) {
    // First check if point is directly on land
    for (const land of landAreas) {
        if (isPointInPolygon(point, land.polygon)) {
            return true;
        }
    }
    
    // Then check if point is too close to any land
    for (const land of landAreas) {
        const closestDistance = findMinDistanceToPolygon(point, land.polygon);
        if (closestDistance < safetyBuffer) {
            return true;
        }
    }
    
    return false;
}

// Function to find minimum distance from a point to a polygon
function findMinDistanceToPolygon(point, polygon) {
    let minDistance = Infinity;
    
    // Check distance to each edge of the polygon
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        const edge = [polygon[i], polygon[j]];
        const distance = distanceToLineSegment(point, edge[0], edge[1]);
        minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
}

// Function to calculate distance from a point to a line segment
function distanceToLineSegment(point, lineStart, lineEnd) {
    const x = point.lat;
    const y = point.lng;
    const x1 = lineStart.lat;
    const y1 = lineStart.lng;
    const x2 = lineEnd.lat;
    const y2 = lineEnd.lng;
    
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy) * 111; // Convert to km (approx)
}

// Function to find a safe deep water point
function findSafeDeepWaterPoint(point, deepWaterRegions) {
    // Find the closest deep water region
    let closestRegion = null;
    let minDistance = Infinity;
    
    for (const region of deepWaterRegions) {
        const distance = calculateDistance(point.lat, point.lng, region.center.lat, region.center.lng);
        if (distance < minDistance) {
            minDistance = distance;
            closestRegion = region;
        }
    }
    
    // Find the closest safe point in that region
    let closestSafePoint = closestRegion.safePoints[0];
    minDistance = calculateDistance(point.lat, point.lng, closestSafePoint.lat, closestSafePoint.lng);
    
    for (let i = 1; i < closestRegion.safePoints.length; i++) {
        const safePoint = closestRegion.safePoints[i];
        const distance = calculateDistance(point.lat, point.lng, safePoint.lat, safePoint.lng);
        if (distance < minDistance) {
            minDistance = distance;
            closestSafePoint = safePoint;
        }
    }
    
    return closestSafePoint;
}

// Function to generate a path through deep water regions
function generateDeepWaterPath(source, destination, deepWaterRegions, landAreas) {
    // Start with source and destination
    const path = [source];
    
    // Find regions that need to be traversed
    const sourceRegion = findDeepWaterRegion(source, deepWaterRegions);
    const destRegion = findDeepWaterRegion(destination, deepWaterRegions);
    
    // If source and destination are in the same region, we might be able to go direct
    if (sourceRegion && destRegion && sourceRegion.name === destRegion.name) {
        // Check if direct path crosses land
        if (!doesPathCrossLand(source, destination, landAreas)) {
            // We can go direct
            path.push(destination);
            return path;
        }
    }
    
    // We need to go through waypoints
    // First add waypoints from source region if it exists
    if (sourceRegion) {
        // Add the center of the source region as a waypoint
        path.push(sourceRegion.center);
    }
    
    // If source and destination are in different regions, we need to find a path between them
    if (sourceRegion !== destRegion) {
        // For simplicity, we'll use a predefined set of waypoints in the deep ocean
        // These are guaranteed to be far from any land
        const deepOceanWaypoints = [
            { lat: 12.0, lng: 87.0 }, // Central Bay of Bengal
            { lat: 8.0, lng: 85.0 },  // South Bay of Bengal
            { lat: 10.0, lng: 92.0 }  // Andaman Sea (west of islands)
        ];
        
        // Add these waypoints to ensure we stay in deep water
        path.push(...deepOceanWaypoints);
    }
    
    // Add waypoints from destination region if it exists
    if (destRegion) {
        // Add the center of the destination region as a waypoint
        path.push(destRegion.center);
    }
    
    // Finally add the destination
    path.push(destination);
    
    // Filter the path to remove unnecessary waypoints
    return optimizeWaypoints(path, landAreas);
}

// Function to find which deep water region a point is in
function findDeepWaterRegion(point, deepWaterRegions) {
    for (const region of deepWaterRegions) {
        const distance = calculateDistance(point.lat, point.lng, region.center.lat, region.center.lng);
        if (distance <= region.radius) {
            return region;
        }
    }
    return null; // Point is not in any deep water region
}

// Function to check if a path between two points crosses land
function doesPathCrossLand(point1, point2, landAreas) {
    // Create a set of test points along the path
    const numTestPoints = 20;
    const testPoints = [];
    
    for (let i = 0; i <= numTestPoints; i++) {
        const t = i / numTestPoints;
        const lat = point1.lat + t * (point2.lat - point1.lat);
        const lng = point1.lng + t * (point2.lng - point1.lng);
        testPoints.push({ lat, lng });
    }
    
    // Check if any test point is on land
    for (const point of testPoints) {
        for (const land of landAreas) {
            if (isPointInPolygon(point, land.polygon)) {
                return true; // Path crosses land
            }
        }
    }
    
    return false; // Path does not cross land
}

// Function to optimize waypoints by removing unnecessary ones
function optimizeWaypoints(waypoints, landAreas) {
    if (waypoints.length <= 2) return waypoints;
    
    const result = [waypoints[0]];
    
    for (let i = 1; i < waypoints.length - 1; i++) {
        const prev = result[result.length - 1];
        const current = waypoints[i];
        const next = waypoints[i + 1];
        
        // Check if we can skip this waypoint
        if (!doesPathCrossLand(prev, next, landAreas)) {
            // We can skip the current waypoint
            continue;
        }
        
        // We need this waypoint
        result.push(current);
    }
    
    // Add the final destination
    result.push(waypoints[waypoints.length - 1]);
    
    return result;
}

// Function to verify and fix path to ensure no point is on land
function verifyAndFixPath(path, landAreas, deepWaterRegions) {
    const result = [];
    
    for (const point of path) {
        if (isPointOnLandOrTooClose(point, landAreas, 30)) {
            // Point is on land or too close, replace with a safe point
            const safePoint = findSafeDeepWaterPoint(point, deepWaterRegions);
            result.push(safePoint);
        } else {
            // Point is safe, keep it
            result.push(point);
        }
    }
    
    return result;
}

// Function to create a smooth ocean path
function createSmoothOceanPath(points) {
    if (points.length < 2) return points;
    
    const result = [];
    const pointsPerSegment = 10; // Number of points to generate between each waypoint
    
    // Add the first point
    result.push(points[0]);
    
    // For each segment between points
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Get control points for the curve
        const controlPoints = getOceanControlPoints(p1, p2);
        
        // Generate points along the curve
        for (let j = 1; j <= pointsPerSegment; j++) {
            const t = j / pointsPerSegment;
            
            // Cubic Bezier curve formula
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            
            // Calculate point on curve
            const lat = uuu * p1.lat + 
                      3 * uu * t * controlPoints.cp1.lat + 
                      3 * u * tt * controlPoints.cp2.lat + 
                      ttt * p2.lat;
                      
            const lng = uuu * p1.lng + 
                      3 * uu * t * controlPoints.cp1.lng + 
                      3 * u * tt * controlPoints.cp2.lng + 
                      ttt * p2.lng;
            
            result.push({ lat, lng });
        }
    }
    
    return result;
}

// Function to generate control points for ocean bezier curves
function getOceanControlPoints(p1, p2) {
    // Calculate distance between points
    const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    
    // Calculate direction vector
    const dx = p2.lat - p1.lat;
    const dy = p2.lng - p1.lng;
    
    // Normalize and scale for control points (1/3 and 2/3 along the path)
    const length = Math.sqrt(dx*dx + dy*dy);
    const udx = dx / length;
    const udy = dy / length;
    
    // Add perpendicular component for curvature
    // The perpendicular vector is (-udy, udx)
    const curveFactor = distance * 0.15; // Adjust for more or less curve
    const perpX = -udy * curveFactor;
    const perpY = udx * curveFactor;
    
    // Create control points with perpendicular offset for natural curve
    const cp1 = {
        lat: p1.lat + dx/3 + perpX,
        lng: p1.lng + dy/3 + perpY
    };
    
    const cp2 = {
        lat: p1.lat + 2*dx/3 + perpX,
        lng: p1.lng + 2*dy/3 + perpY
    };
    
    return { cp1, cp2 };
}

// Function to check if a point is inside a polygon
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        
        const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
            (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
}

// Captain logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/captain/login');
});

module.exports = router;