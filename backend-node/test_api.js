
const BASE_URL = 'http://localhost:5000/api/v1';

async function testEndpoint(name, url, token = null) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}${url}`, { headers });
        const text = await res.text();

        console.log(`Status: ${res.status}`);
        try {
            const data = JSON.parse(text);
            if (res.status === 200) {
                console.log('Success. Data keys:', Object.keys(data));
                if (data.status_breakdown) console.log('Status Breakdown:', data.status_breakdown);
                return data;
            } else {
                console.log('Error Response:', data);
            }
        } catch (e) {
            console.log('Non-JSON Response:', text.slice(0, 500));
        }
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
    }
}

async function run() {
    // 1. Test without token (should use default mock admin)
    await testEndpoint('Admin Dashboard (No Token)', '/analytics/admin/');

    // 2. Test with valid dev token (btoa of JSON)
    const validPayload = JSON.stringify({ phone_number: '+919999999999', role: 'ADMIN' });
    const devToken = btoa(validPayload);
    await testEndpoint('Admin Dashboard (Dev Token)', '/analytics/admin/', devToken);

    // 3. Test with garbage token (Simulate corrupted auth)
    await testEndpoint('Admin Dashboard (Bad Token)', '/analytics/admin/', 'garbage-token-123');

    // 4. Test with what frontend might be sending if login is weird
    // Frontend: btoa(JSON.stringify({ phone_number: fullPhone }))
    const userPayload = JSON.stringify({ phone_number: '9999999999' }); // Maybe without +91?
    const userToken = btoa(userPayload);
    await testEndpoint('Admin Dashboard (Frontend Sim)', '/analytics/admin/', userToken);

    // 5. Test Zones (User reported failure)
    const zones = await testEndpoint('Zone List', '/users/zones/', devToken);

    if (zones && zones.length > 0) {
        const zoneId = zones[0].id;
        console.log(`\n--- Testing with Zone ID: ${zoneId} ---`);

        // 6. Test Supervisor Dashboard (explicit zone_id)
        await testEndpoint('Supervisor Dashboard (Query Param)', `/analytics/supervisor/?zone_id=${zoneId}`, devToken);

        // 7. Test Supervisor Dashboard (No Param - Admin Fallback)
        await testEndpoint('Supervisor Dashboard (No Param - Admin Fallback)', '/analytics/supervisor/', devToken);

        // 7. Test Supervisor Dashboard (Implicit via Token)
        // First, we need a user assigned to this zone.
        // For this test script, we can't easily switch the logged-in user in the DB without a dedicated endpoint or seed.
        // But we can simulate the "Dev Token" with a phone number that *should* exist.
        // If we don't have a supervisor user, this might fail or fallback to Admin (who has null zone).

        // Let's rely on the explicit zone_id test for now, 
        // as the frontend MIGHT be missing the zone_id pass?
        // Wait, the frontend code:
        // const response = await analyticsAPI.getSupervisorDashboard(); 
        // It passes NO arguments.
        // So it relies ENTIRELY on req.user.zoneId.

        // If the current user (Mock Admin) doesn't have a zone, it fails.
        // Admin usually doesn't have a specific zone. 
        // So Admin trying to view Supervisor Dashboard will fail unless we allow passing zone_id.
        // But the frontend `SupervisorDashboard` doesn't seem to allow selecting a zone? 
        // It says "Zone: ..." at the top, implying it's fixed to the user.

        // FIX: If the user is an ADMIN, they should probably be asked to select a zone, 
        // OR we just pick the first zone for testing?
    }
}

run();
