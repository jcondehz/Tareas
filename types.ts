import {ObjectId, OptionalId} from "mongodb";


export type TaskModel = OptionalId<{
    title: string
    description: string,
    completed: boolean,
    owners: ObjectId[],
}>;

export type UserModel = OptionalId<{
    name: string,
    email:string,
    phone:string,
    country:string,
    tasks: ObjectId[],
}>;