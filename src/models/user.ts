import type { ObjectId } from 'mongodb';

export default class User {
	constructor(
		public username: string,
		public email: number,
		public password: string,

		public pictureName?: string,
		public pictureType?: string,

		public id?: ObjectId,
	) {}
}
