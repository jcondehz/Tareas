export const schema = `#graphql
    type Task{
        id: ID!
        title: String!
        description: String!
        completed: Boolean!
        owners: [User]!
    }
    
    type User{
        id:ID!
        name:String!
        email:String!
        phone:String!
        country:String!
        tasks: [Task]!
    }

    type Query{
        getTasks: [Task!]!
        getTask(id:ID!):Task
        getUsers: [User!]!
        getUser(id:ID!): User 
    }

    type Mutation{
        addTask(title:String!,description:String): Task!
        addUser(name:String!,phone:String!,email:String!): User!
        assignTaskToUser(taskId: ID!, userId: ID!): Task
    }
`;