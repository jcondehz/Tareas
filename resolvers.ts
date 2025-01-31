import { ObjectId, Collection } from "mongodb";
import { TaskModel, UserModel } from "./types.ts";
import { GraphQLError } from "graphql";
import { getInformationFromCountry, getInformationFromPhone } from "./apifunctions.ts";

type Context = {
    tasksCollection: Collection<TaskModel>;
    usersCollection: Collection<UserModel>;
};

export const resolvers = {
    User: {
        id: (userModel: UserModel) => userModel._id?.toString(),
        tasks: async (userModel: UserModel, _: unknown, ctx: Context) => {
            return await ctx.tasksCollection.find({
                _id: { $in: userModel.tasks.map(id => new ObjectId(id)) }
            }).toArray();
        }
    },

    Task: {
        id: (taskModel: TaskModel) => taskModel._id?.toString(),
        owners: async (taskModel: TaskModel, _: unknown, ctx: Context) => {
            return await ctx.usersCollection.find({
                _id: { $in: taskModel.owners.map(id => new ObjectId(id)) }
            }).toArray();
        }
    },

    Query: {
        getTasks: async (_: unknown, __: unknown, ctx: Context): Promise<TaskModel[]> => {
            return await ctx.tasksCollection.find().toArray();
        },

        getTask: async (_: unknown, args: { id: string }, ctx: Context): Promise<TaskModel | null> => {
            return await ctx.tasksCollection.findOne({ _id: new ObjectId(args.id) });
        },

        getUsers: async (_: unknown, __: unknown, ctx: Context): Promise<UserModel[]> => {
            return await ctx.usersCollection.find().toArray();
        },

        getUser: async (_: unknown, args: { id: string }, ctx: Context): Promise<UserModel | null> => {
            return await ctx.usersCollection.findOne({ _id: new ObjectId(args.id) });
        }
    },

    Mutation: {
        addUser: async (_: unknown, args: { name: string; email: string; phone: string }, ctx: Context) => {
            let phoneInfo;
            try {
                phoneInfo = await getInformationFromPhone(args.phone);
            } catch (error) {
                throw new GraphQLError("Error al validar el número de teléfono");
            }
            if (!phoneInfo.is_valid) {
                throw new GraphQLError("El número de teléfono no es válido");
            }

            const existingUser = await ctx.usersCollection.findOne({ phone: args.phone });
            if (existingUser) {
                throw new GraphQLError("El número de teléfono ya está registrado");
            }

            const newUser: UserModel = {
                name: args.name,
                email: args.email,
                phone: args.phone,
                country: phoneInfo.country,
                tasks: [],
            };

            const result = await ctx.usersCollection.insertOne(newUser);
            return { id: result.insertedId.toString(), ...newUser };
        },

        addTask: async (_: unknown, args: { title: string; description: string }, ctx: Context) => {
            const newTask: TaskModel = {
                title: args.title,
                description: args.description,
                completed: false,
                owners: [],
            };
            const result = await ctx.tasksCollection.insertOne(newTask);
            return { id: result.insertedId.toString(), ...newTask };
        },

        assignTaskToUser: async (_: unknown, { taskId, userId }: { taskId: string, userId: string }, ctx: Context) => {
            const task = await ctx.tasksCollection.findOne({ _id: new ObjectId(taskId) });
            const user = await ctx.usersCollection.findOne({ _id: new ObjectId(userId) });
            if (!task || !user) throw new GraphQLError("Task or User not found");

            await ctx.tasksCollection.updateOne(
                { _id: new ObjectId(taskId) },
                { $addToSet: { owners: new ObjectId(userId) } }
            );
            await ctx.usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $addToSet: { tasks: new ObjectId(taskId) } }
            );
            return { id: taskId, ...task };
        }
    }
};


