import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "npm:@apollo/server/standalone";
import { MongoClient } from "mongodb";
import { TaskModel,UserModel } from "./types.ts";
import { schema } from "./schema.ts";
import { resolvers } from "./resolvers.ts";


const MONGO_URL =
   Deno.env.get("MONGO_URL") ;

if (!MONGO_URL) {
  Deno.exit(0)
}

const dbuser = new MongoClient(MONGO_URL);
await dbuser.connect();
console.info("Connected to MongoDB");
const db = dbuser.db("Tasks");
const tasksCollection = db.collection<TaskModel>("Task");
const usersCollection = db.collection<UserModel>("User");

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async () => (await {
    tasksCollection,
    usersCollection
  }),
  listen: { port: 8080 },
});

console.info(`Server ready at ${url}`);