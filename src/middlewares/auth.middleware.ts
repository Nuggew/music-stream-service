import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';

interface CustomRequest extends Request {
	token: string | JwtPayload;
}

function authMiddleware(req: CustomRequest, res: Response, next: NextFunction) {
	const secretKey: Secret = process.env.SECRET_AUTH_KEY as Secret;

	try {
		const token = req.header('Authorization')?.replace('Bearer ', '');

		if (!token) return res.status(401).send({ message: 'Unauthorized' });

		const decoded = jwt.verify(token!, secretKey);
		req.token = decoded;

		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			return res.status(401).send({ message: 'Invalid token.' });
		} else if (error instanceof jwt.TokenExpiredError) {
			return res.status(401).send({ message: 'Token expired.' });
		}

		return res.status(500);
	}
}

export default authMiddleware;
