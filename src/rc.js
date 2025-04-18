import fetch from 'node-fetch';
import express from 'express';

const rcRouter = express.Router();

const makeFetchHeaders = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
}

async function getProfileData(token) {
    const profilesMeUrl = `${process.env.RC_API_BASE_URL}/profiles/me`;
    //console.log(`Fetching profile data with token ${token ? token.substring(0, 5) : 'NONE'}...`);

    const response = await fetch(profilesMeUrl, {
        headers: makeFetchHeaders(token)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`getProfileData failed (${response.status}): ${errorBody}`);
        throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    return await response.json();
}

// Gets json with full user profile data
rcRouter.get('/profile', async (req, res) => {
    console.log('GET: /profile'); 

    if (!req.accessToken) {
        console.log('/api/profile: No access token found in request session.');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const profileData = await getProfileData(req.accessToken);
        console.log('Success fetching profile data for:', profileData.name);
        res.json(profileData); 
    } catch (error) {
        console.error('Error fetching profile data for /api/profile:', error);
        if (error.message.includes('401')) {
            if (req.session) {
                req.session.destroy();
            }
            res.status(401).json({ error: 'Authentication failed or token expired' });
        } else {
            res.status(500).json({ error: 'Could not load profile data' });
        }
    }
});

// Helper function to fetch profiles for a specific batch
async function fetchBatchProfiles(batchId, limit = 50, token) {
    if (!batchId) { return reject(new Error('Batch ID is required to fetch profiles.')); }
    if (!token) { return reject(new Error('Authentication token is required.')); }

    const profilesUrl = `${process.env.RC_API_BASE_URL}/profiles?batch_id=${batchId}&limit=${limit}`;
    //console.log(`Fetching batch profiles from ${profilesUrl} with token ${token ? token.substring(0, 5) : 'NONE'}...`);

    const response = await fetch(profilesUrl, {
        headers: makeFetchHeaders(token)
    })
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`getProfileData failed (${response.status}): ${errorBody}`);
        throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    return await response.json();
}

// An endpoint to fetch profiles for a specific batch
rcRouter.get('/batches/:batchId/profiles', async (req, res) => {
    console.log(`GET: /batches/${req.params.batchId}/profiles hit`);

    if (!req.accessToken) {
        console.error('/batches/:batchId/profiles: No access token found.');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const batchId = parseInt(req.params.batchId, 10);
    const limit = parseInt(req.query.limit, 10) || 50; // Get limit from query param or default

    if (isNaN(batchId) || batchId <= 0) { 
        return res.status(400).json({ error: 'Invalid Batch ID provided in URL.' });
    }

    try {
        const profiles = await fetchBatchProfiles(batchId, limit, req.accessToken);
        console.log(`Successfully fetched ${profiles.length} profiles for batch ${batchId}.`);
        res.json(profiles);
    } catch (error) {
        console.error(`Error fetching profiles for batch ${batchId}:`, error);

        if (error.message.includes('401')) {
            res.status(401).json({ error: 'Authentication failed or token invalid for fetching profiles.' });
        } else {
            res.status(500).json({ error: `Could not load profiles for batch ${batchId}: ${error.message}` });
        }
    }
});

export { rcRouter };
