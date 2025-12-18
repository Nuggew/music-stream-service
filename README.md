# Music Streaming Service
A simple music stream service REST API example.

[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://app.getpostman.com/run-collection/26173735-4d15e2e9-eb10-44f0-b043-f6ec9036397b?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D26173735-4d15e2e9-eb10-44f0-b043-f6ec9036397b%26entityType%3Dcollection%26workspaceId%3D031dfefd-ffc5-4da9-87ce-2cc9eef57142)

## Installation
Just ``git clone`` the repository and setup the .env file.
```dotenv
# Libs
FFMPEG_PATH="/libs/ffmpeg/ffmpeg.exe"
FFPROBE_PATH="/libs/ffmpeg/ffprobe.exe"

# Auth
SECRET_AUTH_KEY="YOUR SECRET AUTH KEY"

# Rate Limit & Speed Limiter
RATE_LIMIT=25 #(optional)
RATE_LIMIT_COOLDOWN=15 #(in minutes)(optional)

SPEED_LIMIT_TRIES=1 #(optional)
SPEED_LIMIT_DELAY=2 #(in seconds)(optional)

# MongoDB Database
DB_CONN_STRING="YOUR MONGODB CONNECTION STRING"
DB_NAME="YOUR MONGODB DATABASE NAME"

USERS_COLLECTION_NAME="users"
MUSIC_COLLECTION_NAME="music"

# Search
MAX_SEARCH_NUMBER_PER_TYPE=25 #(optional)
```

## Features
- Music upload, listening and quality setting.
- User creation, deletion, replacement and modification.
- Profile picture.

## Libraries
- dotenv
- express
- express-rate-limit
- express-slow-down
- fluent-ffmpeg
- jsonwebtoken
- mongodb
- multer
