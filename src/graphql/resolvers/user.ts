import { INotificationDocument } from "@app/interfaces/notification.interface";
import { IUserDocument, IUserResponse } from "@app/interfaces/user.interface";
import { UserModel } from "@app/models/user.model";
import { JWT_TOKEN } from "@app/server/config";
import { AppContext } from "@app/interfaces/monitor.interface";
import {
  createNotificationGroup,
  getAllNotificationGroups,
} from "@app/services/notification.service";
import {
  createNewUser,
  getUserByProp,
  getUserBySocialId,
  getUserByUsernameOrEmail,
} from "@app/services/user.service";
import { authenticatedGraphQLRoute, isEmail } from "@app/utils/utils";
import { UserLoginRules, UserRegisterationRules } from "@app/validations";
import { Request } from "express";
import { GraphQLError } from "graphql";
import { sign } from "jsonwebtoken";
import { toLower, upperFirst } from "lodash";

export const UserResolver = {
  Query : {
    async checkCurrentUser(
      _ : undefined, __ : undefined, contextValue : AppContext
    ){
    const { req } = contextValue; 
    authenticatedGraphQLRoute(req);
      const notifications = await getAllNotificationGroups(req.currentUser!.id);
      return {
        user: {
          id: req.currentUser!.id,
          email: req.currentUser!.email,
          username: req.currentUser!.username,
          createdAt: new Date()
        },
        notifications
      }
    }
  },
  Mutation: {
    async loginUser(
      _: undefined,
      args: { usernameOrEmail: string; password: string },
      contextValue: AppContext
    ) {
      const { usernameOrEmail, password } = args;
      await UserLoginRules.validate({ usernameOrEmail, password },
        { abortEarly: false }
      );
      const isValidEmail = isEmail(usernameOrEmail);
      const type = isValidEmail ? "email" : "username";
      const existingUser: IUserDocument | undefined = await getUserByProp(
        usernameOrEmail,
        type
      );
      if (!existingUser) {
        throw new GraphQLError("Invalid credentials");
      }
      const passwordMatch: boolean = await UserModel.prototype.comparePassword(
        password,
        existingUser.password!
      );
      if (!passwordMatch) {
        throw new GraphQLError("Invalid credentials");
      }
      const response: IUserResponse = await userReturnValue(
        contextValue.req,
        existingUser,
        "login"
      );
      return response;
    },
    async registerUser(
      _: undefined,
      args: { user: IUserDocument },
      contextValue: AppContext
    ) {
      const { user } = args;
      await UserRegisterationRules.validate(user, { abortEarly: false });
      const { username, email, password } = user;
      const checkIfUserExists: IUserDocument | undefined =
        await getUserByUsernameOrEmail(username!, email!);
      if (checkIfUserExists) {
        throw new GraphQLError("User already exists");
      }
      const authData: IUserDocument = {
        username: upperFirst(username),
        email: toLower(email),
        password,
      } as IUserDocument;

      const result: IUserDocument | undefined = await createNewUser(authData);
      const response: IUserResponse = await userReturnValue(
        contextValue.req,
        result!,
        "register"
      );
      return response;
    },
    async authSocialUser(
      _: undefined,
      args: { user: IUserDocument },
      contextValue: AppContext
    ) {
      const { user } = args;
      await UserRegisterationRules.validate(user, { abortEarly: false });
      const { username, email, socialId, type } = user;
      console.log({ username, email, socialId, type });
      
      const checkIfUserExists: IUserDocument | undefined =
        await getUserBySocialId(socialId!, email!, type!);
      if (checkIfUserExists) {
        const response: IUserResponse = await userReturnValue(
          contextValue.req,
          checkIfUserExists,
          "login"
        );
        return response;
      } else {
        const authData: IUserDocument = {
          username: upperFirst(username),
          email: toLower(email),
          ...(type === "facebook" ? {
            facebookId: socialId,
          } : {}),
          ...(type === "google" ? {
            googleId: socialId,
          } : {}),
        } as IUserDocument;
        const result: IUserDocument | undefined = await createNewUser(authData);
        const response: IUserResponse = await userReturnValue(
          contextValue.req,
          result!,
          "register"
        );
        return response;
      }
    },
    logout(_ : undefined, __ : undefined, contextValue : AppContext) {
      const { req } = contextValue;
      req.session = null;
      req.currentUser = undefined;
      return null;
    }
  },
  User: {
    createdAt: (user: IUserDocument) => {
      return new Date(user.createdAt!).toISOString();
    },
  },
};

async function userReturnValue(
  req: Request,
  result: IUserDocument,
  type: string
): Promise<IUserResponse> {
  let notifications: INotificationDocument[] = [];
  if (type === "register" && result && result.id && result.email) {
    const notification = await createNotificationGroup({
      userId: result.id,
      groupName: "Default Contact Group",
      emails: JSON.stringify([result.email]),
    });
    notifications.push(notification);
  } else if (type === "login" && result && result.id && result.email) {
    notifications = await getAllNotificationGroups(result.id);
  }

  const userJwt: string = sign(
    {
      id: result.id,
      email: result.email,
      username: result.username,
    },
    JWT_TOKEN
  );

  req.session = { jwt: userJwt, enableAutomaticRefresh: false };
  const user: IUserDocument = {
    id: result.id,
    email: result.email,
    username: result.username,
    createdAt: result.createdAt,
  } as IUserDocument;
  return {
    user,
    notifications,
  };
}
