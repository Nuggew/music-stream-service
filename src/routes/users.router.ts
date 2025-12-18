import express, { type Request, type Response, type Router } from 'express';
import * as fs from 'fs';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import authMiddleware from '../middlewares/auth.middleware';
import type User from '../models/user';
import { collections } from '../services/database.service';

export const usersRouter: Router = express.Router();

usersRouter.use(express.json());

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'static/profile_pictures/');
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const fileFilter = (_req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpeg' ||
		file.mimetype === 'image/x-png' ||
		file.mimetype === 'image/x-jpeg'
	) {
		cb(null, true); // Accept the file
	} else {
		cb(new Error('Only PNG and JPG files are allowed!'), false);
	}
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

usersRouter.get('/', authMiddleware, async (_req: Request, res: Response) => {
	try {
		const users = (await collections.users
			.find({})
			.toArray()) as unknown as User[];
		res.status(200).send(users);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

usersRouter.get(
	'/search',
	authMiddleware,
	async (req: Request, res: Response) => {
		try {
			const maxNumber = (process.env
				.MAX_SEARCH_NUMBER_PER_TYPE as unknown as number) || 25;
			const number = (req.query.maxNumber as unknown as number) || maxNumber;
			const page = (req.query.page as unknown as number) || 0;

			const users = (await collections.users
				.find({ username: { $regex: req.query.content, $options: 'i' } })
				.skip(Math.round(page))
				.limit(Math.round(number > maxNumber ? maxNumber : number))
				.toArray()) as unknown as User[];
			res.status(200).send(users);
		} catch (error) {
			res.status(500).send(error.message);
		}
	},
);

usersRouter.get(
	'/user/:id',
	authMiddleware,
	async (req: Request, res: Response) => {
		const id = req?.params?.id;

		try {
			var query = { _id: new ObjectId(id) };
			const user = (await collections.users.findOne(query)) as unknown as User;

			if (user) {
				res.status(200).send(user);
			}
		} catch (error) {
			res.status(500).send(error.message);
		}
	},
);

usersRouter.get('/user/:id/picture', async (req: Request, res: Response) => {
	const id = req?.params?.id;

	try {
		var query = { _id: new ObjectId(id) };
		const user = (await collections.users.findOne(query, {
			projection: { pictureName: 1, pictureType: 1, _id: 0 },
		})) as unknown as User;

		if (user && user.pictureName && user.pictureType) {
			res
				.status(200)
				.sendFile(
					path.resolve(
						`static/profile_pictures/${user.pictureName}${user.pictureType}`,
					),
					(err) => {
						if (err) {
							console.error('Error sending file:', err);
							res.status(500).send('Error sending image.');
						}
					},
				);
		} else res.status(200).send(null);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

usersRouter.delete(
	'/user/:id/picture',
	authMiddleware,
	async (req: Request, res: Response) => {
		const id = req?.params?.id;

		try {
			var query = { _id: new ObjectId(id) };

			const user = (await collections.users.findOne(query, {
				projection: { pictureName: 1, pictureType: 1, _id: 0 },
			})) as unknown as User;
			fs.rmSync(
				path.resolve(
					`static/profile_pictures/${user.pictureName}${user.pictureType}`,
				),
			);

			const result = await collections.users.updateOne(query, {
				$set: { pictureName: null, pictureType: null },
			});

			if (result) {
				res.status(200).end();
			} else res.status(500).end();
		} catch (error) {
			res.status(500).send(error.message);
		}
	},
);

usersRouter.get('/login', async (req: Request, res: Response) => {
	const secretKey: Secret = process.env.SECRET_AUTH_KEY as Secret;

	const username = req?.body?.username;
	const password = req?.body?.password;

	try {
		var query = { username: username };
		const user = (await collections.users.findOne(query)) as unknown as User;

		if (user) {
			if (user.password != password)
				return res
					.status(400)
					.send({ message: `Could not login into ${req?.body?.username}` });

			const token = jwt.sign(
				{ id: user.id?.toString(), name: user.username },
				secretKey,
				{
					expiresIn: '2 days',
				},
			);
			res.status(200).send({ token: token });
		}
	} catch (error) {
		res
			.status(400)
			.send({ message: `Could not login into ${req?.body?.username}` });
	}
});

usersRouter.post(
	'/register',
	upload.single('picture'),
	async (req: Request, res: Response) => {
		try {
			const newUser = req.body as User;

			if (req.file != null) {
				newUser.pictureName = path.parse(req.file.filename).name;
				newUser.pictureType = path.parse(req.file.filename).ext;
			}

			const result = await collections.users.insertOne(newUser);

			result
				? res
						.status(201)
						.send(
							`Successfully created a new user with id ${result.insertedId}`,
						)
				: res.status(500).send('Failed to create a new user.');
		} catch (error) {
			console.error(error);
			res.status(400).send(error.message);
		}
	},
);

usersRouter.put('/:id', authMiddleware, async (req: Request, res: Response) => {
	const id = req?.params?.id;

	try {
		const updatedUser: User = req.body as User;
		const query = { _id: new ObjectId(id) };

		const result = await collections.users.updateOne(query, {
			$set: updatedUser,
		});

		result
			? res.status(200).send(`Successfully updated user with id ${id}`)
			: res.status(304).send(`User with id: ${id} not updated`);
	} catch (error) {
		console.error(error.message);
		res.status(400).send(error.message);
	}
});

usersRouter.delete(
	'/:id',
	authMiddleware,
	async (req: Request, res: Response) => {
		const id = req?.params?.id;

		try {
			const query = { _id: new ObjectId(id) };
			const result = await collections.users.deleteOne(query);

			if (result && result.deletedCount) {
				res.status(202).send(`Successfully removed user with id ${id}`);
			} else if (!result) {
				res.status(400).send(`Failed to remove user with id ${id}`);
			} else if (!result.deletedCount) {
				res.status(404).send(`User with id ${id} does not exist`);
			}
		} catch (error) {
			console.error(error.message);
			res.status(400).send(error.message);
		}
	},
);
