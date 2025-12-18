import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { musicRouter } from './routes/music.router';
import { usersRouter } from './routes/users.router';
import { connectToDatabase } from './services/database.service';

console.clear();

const app = express();
const port = 3000;

const limiter = rateLimit({
	windowMs: parseFloat(process.env.RATE_LIMIT_COOLDOWN || '15') * 60 * 1000,
	max: parseFloat(process.env.RATE_LIMIT || '25'),
});

const speedLimiter = slowDown({
	windowMs: parseFloat(process.env.RATE_LIMIT_COOLDOWN || '15') * 60 * 1000,
	delayAfter: parseFloat(process.env.SPEED_LIMIT_TRIES || '1'),
	delayMs: () => parseFloat(process.env.SPEED_LIMIT_DELAY || '2') * 1000,
});

app.use(speedLimiter);
app.use(limiter);

app.use('/static/', express.static('static'));
app.use(express.urlencoded({ extended: true }));

connectToDatabase()
	.then(() => {
		app.use('/users', usersRouter);
		app.use('/music', musicRouter);

		app.listen(port, () => {
			console.log(`Server started at http://localhost:${port}`);
		});
	})
	.catch((error: Error) => {
		console.error('Database connection failed', error);
		process.exit();
	});
