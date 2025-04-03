/**
 * SRO 312D Google Maps Helper
 * This file helps properly initialize the Google Maps API
 */

// Store the API key globally
window.GOOGLE_MAPS_API_KEY = 'AIzaSyClrhOKzru5eVbTkViOCRixNQ5nOvwep2I';

// Initialize Google Maps API with proper parameters
function loadGoogleMapsAPI(callback) {
    // Check if the API is already loaded
    if (window.google && window.google.maps) {
        console.log('Google Maps API already loaded');
        if (window[callback]) window[callback]();
        return;
    }

    // Create script element to load the API
    const script = document.createElement('script');
    
    // Use proper URL parameters for optimal loading
    script.src = `https://maps.googleapis.com/maps/api/js?key=${window.GOOGLE_MAPS_API_KEY}&libraries=geometry,places&v=quarterly&callback=${callback}`;
    script.async = true;
    script.defer = true;
    
    // Handle errors
    script.onerror = function() {
        console.error('Error loading Google Maps API');
        const mapElements = document.querySelectorAll('#map, #admin-map');
        mapElements.forEach(el => {
            el.innerHTML = '<div style="padding: 20px; text-align: center;"><p>Error loading map. Please try refreshing the page.</p></div>';
        });
    };
    
    document.head.appendChild(script);
    console.log('Google Maps API loading...');
}

// Function to change map type with enhanced handling
function changeMapType(map, type) {
    if (!map || !google || !google.maps) {
        console.error('Map or Google Maps API not available');
        return;
    }
    
    const mapTypes = {
        'satellite': google.maps.MapTypeId.SATELLITE,
        'terrain': google.maps.MapTypeId.TERRAIN,
        'roadmap': google.maps.MapTypeId.ROADMAP,
        'hybrid': google.maps.MapTypeId.HYBRID
    };
    
    // Update map type safely
    if (mapTypes[type]) {
        map.setMapTypeId(mapTypes[type]);
    }
}

// Function to handle responsive map sizing
function resizeMap(mapElement) {
    if (!mapElement) return;
    
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target.id === 'map' || entry.target.id === 'admin-map') {
                const map = entry.target.id === 'map' ? window.map : window.adminMap;
                if (map && map.getCenter) {
                    google.maps.event.trigger(map, 'resize');
                    // Maintain center point after resize
                    const center = map.getCenter();
                    setTimeout(() => {
                        map.setCenter(center);
                    }, 10);
                }
            }
        }
    });
    
    resizeObserver.observe(mapElement);
}

// Export functions for global use
window.SRO_312D = window.SRO_312D || {};
window.SRO_312D.maps = {
    loadGoogleMapsAPI,
    changeMapType,
    resizeMap
}; 