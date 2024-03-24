const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const cp = require('child_process');
const stream = require('stream');

const app = express();
const port = 3000;

var cors = require('cors');


const checkOrigin = (req, res, next) => {
    const allowedOrigin = 'https://nicko.do.nerdspeak.com';
    const origin = req.headers.origin;
    if (origin === allowedOrigin) {
        next();
    } else {
        res.status(403).send('Request not allowed due to origin');
    }
};

const validateApiKey = (req, res, next) => {
    const apiKey = '13dde8c6-kjna-8141-v6gu-86005e6fa28c';
    const requestApiKey = req.headers['x-api-key'];
    if (requestApiKey && requestApiKey === apiKey) {
        next();
    } else {
        res.status(403).send('Invalid API Key');
    }
};

// const corsOpts = {
//     origin: ,
//     methods: [
//         'GET',
//         'POST',
//     ],
  
//     allowedHeaders: [
//         'Content-Type',
//         'X-API-KEY'
//     ],
//   };
  
app.use(cors());
// app.use(checkOrigin);
app.use(validateApiKey);

app.get('/title', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('No URL provided');
    }

    try {
        const videoID = ytdl.getURLVideoID(url);
        const info = await ytdl.getInfo(videoID);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_');
        res.json({ title: title })
    } catch (error) {
        // In case of any errors, return a 500 Internal Server Error status with JSON
        console.error('Error fetching video info:', error);
        res.status(500).json({ message: 'Failed to retrieve video information' });
    }
})

app.get('/download', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('No URL provided');
    }

    try {
        const videoID = ytdl.getURLVideoID(url);
        const info = await ytdl.getInfo(videoID);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);

        const audio = ytdl.downloadFromInfo(info, { format: audioFormat });
        const ffmpegProcess = cp.spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner',
            '-i', 'pipe:3',
            '-f', 'mp3',
            'pipe:4',
        ], {
            windowsHide: true,
            stdio: [
                'inherit', 'inherit', 'inherit',
                'pipe', 'pipe',
            ],
        });

        stream.pipeline(audio, ffmpegProcess.stdio[3], (err) => {
            if (err) {
                console.error('Pipeline failed.', err);
                res.status(500).send('Internal Server Error');
            }
        });

        ffmpegProcess.stdio[4].pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

const server = app.listen(port, () => {
    console.log(`Server is listening at http://0.0.0.0:${port}`);
});

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('SIGINT', () => gracefulShutdown('SIGINT'));