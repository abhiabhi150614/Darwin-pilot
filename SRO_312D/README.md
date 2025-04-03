# AB Shipping International - Vessel Tracking System

This application provides a web-based platform for AB Shipping International to track and manage their fleet of vessels across different locations.

## Features

- **Company Authentication**: Secure login system for shipping company access
- **Vessel Tracking**: View all vessels on interactive dashboard
- **Fleet Management**: Add, view, and remove vessel data
- **Vessel Status**: Track vessel status (active, docked, maintenance, inactive)
- **Location Data**: Store and display vessel coordinates and port information
- **User-Friendly Interface**: Intuitive dashboard with visual indicators

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to project directory:
   ```
   cd SRO_312D
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Configure environment variables:
   Create a `.env` file with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/shipping_db
   SESSION_SECRET=your_session_secret
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Access the application at:
   ```
   http://localhost:3000
   ```

## Usage

### Auto Login (For Testing)
- Navigate to `http://localhost:3000/auto-login` to automatically log in as AB Shipping International.

### Adding Vessels
1. Click the "Add Boat" button on the dashboard
2. Fill in all required fields:
   - Ship ID
   - Ship Name
   - Ship Code
   - Ship Type
   - Location details (coordinates or use "Get Location" button)
   - Status (active, docked, maintenance, inactive)
   - PIN (optional)

### Clearing All Vessels
- Use the "Clear All Boats" button (red) on the dashboard to remove all vessels
- Confirmation will be required

## Vessel Types
The system supports the following vessel types:
- Cargo
- Tanker
- Container
- Passenger
- Fishing
- Research
- Luxury
- Other

## Status Types
Vessels can have the following status:
- Active (at sea)
- Docked (at port)
- Maintenance
- Inactive

## API Endpoints

### Authentication
- POST `/login` - Authenticate company
- GET `/logout` - Log out

### Vessel Management
- POST `/api/add-boat` - Add new vessel
- POST `/api/clear-boats` - Remove all vessels

## Development

### Project Structure
- `app.js` - Main application file
- `controllers/` - Controller logic
- `models/` - Database models
- `routes/` - Route definitions
- `views/` - EJS templates
- `public/` - Static assets

### Default Login
- Company ID: ab_312d
- Password: password (in development)

## License
This project is licensed under the MIT License.

## Contributors
- AB Shipping International IT Team 