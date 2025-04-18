import express from 'express';
import { AuthorizationCode } from 'simple-oauth2';

// Create a router instance
const authRouter = express.Router();

// OAuth client
const oauthClient = new AuthorizationCode({
    client: {
        id:     process.env.RC_OAUTH_CLIENT_ID,
        secret: process.env.RC_OAUTH_CLIENT_SECRET
    },
    auth: {
        tokenHost: process.env.RC_OAUTH_HOST,
    },
});

// Refresh token middleware
async function refreshTokenMiddleware(req, res, next) {
    if (!req.session.token) {
        return next();
    }

    try {
        let tokenObject = oauthClient.createToken(req.session.token);
        if (tokenObject.expired()) {
            console.log('Token expired, attempting refresh...');
            const refreshedToken = await tokenObject.refresh();
            req.session.token = refreshedToken.token;
        }

        req.accessToken = req.session.token.access_token;
        next();
    } catch (error) {
        console.error('Refresh Token Error:', error.message, error.response?.data || error);
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session after refresh failure:", err);
                return next(err);
            }
            console.log('Redirecting to login due to refresh failure.');
            res.redirect('/login');
        });
    }
}

// Start Login Flow: Redirect to RC
authRouter.get('/login', (req, res) => {
    console.log('GET: /login');

    const authorizationUri = oauthClient.authorizeURL({
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
    });
    res.redirect(authorizationUri);
});

// Logout: Clear session and send success response
authRouter.get('/logout', (req, res, next) => {
    console.log('GET: /logout');

    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Could not log out session.' });
        }

        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Check Authentication Status
authRouter.get('/status', refreshTokenMiddleware, (req, res) => {
    console.log('GET: /status');

    if (req.session && req.session.token) {
        res.status(200).json({ loggedIn: true });
    } else {
        res.status(200).json({ loggedIn: false }); 
    }
});

// OAuth Callback: Exchange code for token
authRouter.get('/oauth_callback', async (req, res) => {
    //console.log('GET: /oauth_callback');

    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Error: No authorization code provided in callback.');
    }

    try {
        const accessToken = await oauthClient.getToken({ 
            code,
            redirect_uri: process.env.OAUTH_REDIRECT_URI    // Has to match 'redirect_uri' arg to authorizeURL()
        });
        req.session.token = accessToken.token;

        console.log('GET: /oauth_callback', req.session.token.access_token.substring(0, 5));
        res.redirect(process.env.CLIENT_ORIGIN);
    } catch (error) {
        console.error('Access Token Error:', error.message, error.response?.data || error);
        res.status(500).send(`Auth failed: ${error.message}`);
    }
});

// Needs to run *after* session and CORS, but *before* protected routes like /api/profile
authRouter.use(refreshTokenMiddleware);

export {
    authRouter,
}; 