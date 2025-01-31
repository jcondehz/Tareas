import { ObjectId,Collection } from "mongodb";
import { TaskModel,UserModel } from "./types.ts"
import { GraphQLError } from "graphql";
import { getInformationFromCountry, getInformationFromPhone } from "./apifunctions.ts";

type context = {
    tasksCollection: Collection<TaskModel>;
    usersCollection: Collection <UserModel>;
}



export const resolvers = {

    User: {
        id: (userModel:UserModel) => userModel._id?.toString(),
        tasks: async(userModel:UserModel,_:unknown,ctx:context) => {
            const tasks = await ctx.tasksCollection.find({
                _id:{$in:userModel.tasks},
            }).toArray
            return tasks;
        }
    },

    Task: {
        id: (taskModel:TaskModel) => taskModel._id?.toString(),
        owners: async(taskModel:TaskModel,_:unknown,ctx:context) => {
            const owners = await ctx.usersCollection.find({
                _id:{$in:taskModel.owners},
            }).toArray
            return owners
        } 

    },
    
    Query: {
        getTasks: async (
            _: unknown,
            __: unknown,
            ctx: context
        ): Promise<TaskModel[]> => {
            return await ctx.tasksCollection.find().toArray();
        },
    
        getTask: async (
            _: unknown,
            args: { id: string },
            ctx: context
        ): Promise<TaskModel | null> => {
            return await ctx.tasksCollection.findOne({ _id: new ObjectId(args.id) });
        },
    
        getUsers: async (
            _: unknown,
            __: unknown,
            ctx: context
        ): Promise<UserModel[]> => {
            const users = await ctx.usersCollection.find().toArray();
            return users.map(user => ({
                ...user,
                tasks: user.tasks ?? [],
            }));
        },
    
        getUser: async (
            _: unknown,
            args: { id: string },
            ctx: context
        ): Promise<UserModel | null> => {
            return await ctx.usersCollection.findOne({ _id: new ObjectId(args.id) });
        }
    }
    ,
    
    Mutation: {
        addUser: async (_: unknown, args: { name: string; email: string; phone: string }, ctx: context) => {
            
            let phoneInfo;
            try {
                phoneInfo = await getInformationFromPhone(args.phone);
                console.log("API Response for phone validation:", phoneInfo);
            } catch (error) {
                console.error("Error al validar el número de teléfono:", error);
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

            // Insertar el usuario en la base de datos
            const result = await ctx.usersCollection.insertOne(newUser);
            return { id: result.insertedId.toString(), ...newUser };
        },

        addTask: async (_: unknown, args: { title: string; description: string }, ctx: context) => {
            const newTask: TaskModel = {
                title: args.title,
                description: args.description,
                completed: false,
                owners: [],
            };
            const result = await ctx.tasksCollection.insertOne(newTask);
            return { id: result.insertedId.toString(), ...newTask };
        },
    
        assignTaskToUser: async (_: unknown, { taskId, userId }: { taskId: string, userId: string }, ctx: context) => {
            const task = await ctx.tasksCollection.findOne({ _id: new ObjectId(taskId) });
            const user = await ctx.usersCollection.findOne({ _id: new ObjectId(userId) });
            if (!task || !user) throw new GraphQLError("Task or User not found");
    
            await ctx.tasksCollection.updateOne(
                { _id: new ObjectId(taskId) },
                { $push: { owners: new ObjectId(userId) } }
            );
            await ctx.usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $push: { tasks: new ObjectId(taskId) } }
            );
            return { id: taskId, ...task };
        }

        
    }

     
}

