### server

1. cd sync-server
2. touch .env (with the similar content as file .env.example)
3. mkdir uploads (skip if uploads existed)
4. mkdir assets => cd assets/ => touch agents.txt (skip if assets & agents.txt existed)
5. mkdir nasa (skip if uploads existed)
6. npm ci
7. pm2 start "npm run prod_server"
8. pm2 start "npm run prod_sync_data"

### watcher

1. cd sync-server
2. touch .env (with the similar content as file .env.example)
3. mkdir uploads (skip if uploads existed)
4. npm ci
5. pm2 start "npm run prod_watcher"

### agent

1. cd sync-server
2. touch .env (with the similar content as file .env.example)
3. npm ci
4. pm2 start "npm run prod_watcher"
