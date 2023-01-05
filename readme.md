### server ###
1. cd sync-server
2. touch .env (with content the similar content of .env.example)
3. mkdir uploads (skip if uploads existed)
4. mkdir assets => cd assets/ => touch agents.txt (skip if assets & agents.txt existed)
5. npm install
6. pm2 start "npm run server"

### watcher ###
1. cd sync-server
2. touch .env (with content the similar content of .env.example)
3. mkdir uploads (skip if uploads existed)
4. npm install
5. pm2 start "npm run watcher"

### agent ###
1. cd sync-server
2. touch .env (with content the similar content of .env.example)
3. npm install
4. pm2 start "npm run watcher"