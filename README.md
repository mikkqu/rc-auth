A small proxy helper to keep the client session alive and access Recurse Center API

Endpoints (add more as necessary):
- /profile                   - GET profile data of a logged user
- /batches/:batchId/profiles - GET all profiles from specified batch

In your RC account, go to Profile -> Settings -> Apps, create a new app and put the credentials into `.env` config file