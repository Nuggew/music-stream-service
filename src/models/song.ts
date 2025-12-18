import type { ObjectId } from 'mongodb';

export default class Song {
	constructor(
		public name: string,
		public author: string,
		public filename?: string,
		public filetype?: string,
		public id?: ObjectId,
	) {}
}
