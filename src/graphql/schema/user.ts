import { buildSchema } from "graphql";

export const userSchema = buildSchema(`#graphql
    input Auth {
       username : String
       email : String
       password : String
       socialId : String
       type : String
    }

    type User {
       id : Int
       username : String
       email : String
       createdAt : String
       googleId : String
       facebookId : String
    }

    type NotificationResult{
        id : ID!
        userId : Int!
        groupName : String!
        emails : String!
    }

    type AuthResponse {
        user : User!
        notifications : [NotificationResult!]!   
    }

    type AuthLogoutResponse {
        message : String
    }

    type CurrentUserResponse{
        user : User
        notifications : [NotificationResult]
    }

    type Query {
        checkCurrentUser : CurrentUserResponse
    }

    type Mutation {
        registerUser(user : Auth!) : AuthResponse
        loginUser(usernameOrEmail : String!, password:String!) : AuthResponse!
        authSocialUser(user : Auth!) : AuthResponse!
        logout : AuthLogoutResponse
    }
    `);
