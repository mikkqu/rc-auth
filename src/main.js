import express from 'express';
import session from 'express-session';
import cors from 'cors';
import http from 'http';

import { authRouter } from './auth.js';
import { rcRouter } from './rc.js';

const app = express();
const httpServer = http.createServer(app);

// Validate config
const validateEnv = () => {
    if (!process.env.RC_OAUTH_HOST) { throw new Error('RC_OAUTH_HOST env is missing.'); }
    if (!process.env.RC_API_BASE_URL) { throw new Error('RC_API_BASE_URL env is missing.'); }
    if (!process.env.CLIENT_ORIGIN) { throw new Error('CLIENT_ORIGIN env is missing.'); }
    if (!process.env.SESSION_SECRET) { throw new Error('SESSION_SECRET env is missing.'); }
    if (!process.env.OAUTH_REDIRECT_URI) { throw new Error('OAUTH_REDIRECT_URI env is missing.'); }
};
validateEnv();

// CORS middleware
app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // Allow cookies
}));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,                 // Used to sign the session ID cookie. Prevents tampering.
    resave: false,
    saveUninitialized: false,
    rolling: true,                                      // Refresh session on every request
    cookie: {
        secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production
        maxAge: 30 * 24 * 60 * 60 * 1000                // 30 days (matches refresh lifetime)
    }
}));

// Routes
app.use('/', authRouter);

app.use('/api', rcRouter);

app.get('/', async (req, res) => {
    if (req.session && req.session.token) {
        res.send(`<h1>RC Auth</h1><p>Session detected. <a href="/api/profile">Profile</a></p><form action="/logout" method="get"><button>Logout</button></form>`);
    } else {
        res.send(`<h1>RC Auth</h1><p>No active session.</p>`);
    }
});

// HTTP server 
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
    console.log(`RC auth running at: 'http://localhost:${port}'`);
}); 