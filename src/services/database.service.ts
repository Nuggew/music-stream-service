import * as mongoDB from 'mongodb';

export const collections: {
	users?: mongoDB.Collection;
	music?: mongoDB.Collection;
} = {};

export async function connectToDatabase() {
	const client: mongoDB.MongoClient = new mongoDB.MongoClient(
		process.env.DB_CONN_STRING,
	);
	await client.connect();
	const db: mongoDB.Db = client.db(process.env.DB_NAME);

	const usersCollection: mongoDB.Collection = db.collection(
		process.env.USERS_COLLECTION_NAME,
	);

	const musicCollection: mongoDB.Collection = db.collection(
		process.env.MUSIC_COLLECTION_NAME,
	);

	collections.users = usersCollection;
	collections.music = musicCollection;

	console.log(
		`Successfully connected to database: ${db.databaseName} and collections: ${usersCollection.collectionName}, ${musicCollection.collectionName}`,
	);
}
