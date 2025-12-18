import express, { type Request, type Response, type Router } from 'express';
import Ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import authMiddleware from '../middlewares/auth.middleware';
import type Song from '../models/song';
import { collections } from '../services/database.service';

if (process.env.FFMPEG_PATH == null || process.env.FFPROBE_PATH == null)
{
	console.error("NO FFMPEG OR FFPROBE PATH DEFINED IN .ENV!");
	process.exit(-1);
}

Ffmpeg.setFfmpegPath(path.join(path.dirname(require.main.filename), "..", process.env.FFMPEG_PATH));
Ffmpeg.setFfprobePath(path.join(path.dirname(require.main.filename), "..", process.env.FFPROBE_PATH));

export const musicRouter: Router = express.Router();

musicRouter.use(authMiddleware);
musicRouter.use(express.json());

const audioBitrates = [
	{
		name: 'low',
		value: '64k',
	},
	{
		name: 'medium',
		value: '128k',
	},
	{
		name: 'high',
		value: '320k',
	},
	{
		name: 'lossless',
		filter: (file) => path.parse(file).ext === '.flac',
		value: 'raw',
	},
];

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'static/music/');
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const fileFilter = (_req, file, cb) => {
	if (
		file.mimetype === 'audio/mpeg' ||
		file.mimetype === 'audio/x-mpeg' ||
		file.mimetype === 'audio/wav' ||
		file.mimetype === 'audio/x-wav' ||
		file.mimetype === 'audio/flac' ||
		file.mimetype === 'audio/x-flac'
	) {
		cb(null, true); // Accept the file
	} else {
		cb(new Error('Only MP3, WAVE, and FLAC files are allowed!'), false);
	}
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

musicRouter.get('/upload', async (_req: Request, res: Response) => {
	try {
		const music = (await collections.music
			.find({})
			.toArray()) as unknown as Song[];
		res.status(200).send(music);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

musicRouter.get('/:id', async (req: Request, res: Response) => {
	const id = req?.params?.id;

	try {
		var query = { _id: new ObjectId(id) };
		const song = (await collections.music.findOne(query)) as unknown as Song;
		if (song) res.status(200).send(song);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

musicRouter.post(
	'/',
	upload.single('file'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) return res.status(400).send('No file uploaded.');

			const newSong = req.body as Song;
			newSong.filename = path.parse(req.file.filename).name;
			newSong.filetype = path.parse(req.file.filename).ext;

			let processedAudios = 0;

			audioBitrates.forEach(async (v) => {
				if (
					(v.filter !== undefined && v.filter(req.file.path) === true) ||
					v.filter === undefined
				) {
					if (v.value == 'raw') {
						await fs.copyFileSync(
							req.file.path,
							`static/music/${newSong.filename}-${v.name}${newSong.filetype}`,
						);
						processedAudios++;
						if (processedAudios == audioBitrates.length)
							fs.rmSync(req.file.path);
					} else {
						Ffmpeg()
							.input(req.file.path)
							.audioBitrate(v.value)
							//.outputOptions(['-strict', '-2'])
							.output(`static/music/${newSong.filename}-${v.name}.mp3`)
							.on('error', (err) => {
								console.log('An error occurred: ' + err.message);
								res.status(500).send({ message: 'Internal Error' });
							})
							.on('end', () => {
								processedAudios++;
								if (processedAudios == audioBitrates.length)
									fs.rmSync(req.file.path);
							})
							.run();
					}
				}
			});

			const result = await collections.music.insertOne(newSong);
			result
				? res
						.status(201)
						.send(
							`Successfully created a new song with id ${result.insertedId}`,
						)
				: res.status(500).send('Failed to create a new song.');
		} catch (error) {
			console.error(error);
			res.status(400).send(error.message);
		}
	},
);

musicRouter.get('/stream/:name', async (req: Request, res: Response) => {
	try {
		var query = { name: req.params.name };
		const music = (await collections.music.findOne(query)) as unknown as Song;

		const quality = req.query.quality?.toString().toLowerCase() || 'medium';

		let contentType = '';
		switch (music.filetype) {
			case '.mp3':
				contentType = 'mpeg';
				break;
			case '.wav':
				contentType = 'wav';
				break;
			case '.flac':
				contentType = 'flac';
				break;
		}

		res.setHeader('Content-Type', `audio/${contentType}`);
		res.setHeader('Accept-Ranges', 'bytes');
		res.setHeader(
			'Content-Length',
			fs.statSync(
				path.join(
					'static',
					'music',
					`${music.filename}-${quality}${quality == 'lossless' ? music.filetype : '.mp3'}`,
				),
			).size,
		);

		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader('Expires', '0');

		const audioStream = fs.createReadStream(
			path.join(
				'static',
				'music',
				`${music.filename}-${quality}${quality == 'lossless' ? music.filetype : '.mp3'}`,
			),
		);

		audioStream.pipe(res);

		audioStream.on('end', () => {
			res.end();
		});

		audioStream.on('error', (err) => {
			res.status(500).send({ message: 'Internal Error' });
		});
	} catch (error) {
		res.status(500).send(error.message);
	}
});
