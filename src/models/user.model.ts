import { IUserDocument } from "@app/interfaces/user.interface";
import { sequelize } from "@app/server/database";
import { DataTypes, Model, ModelDefined, Optional } from "sequelize";
import { compare, hash } from 'bcryptjs';

const SALT_ROUND = 10;

interface UserModelInstanceMethods extends Model {
    prototype : {
    comparePassword : (password: string, hashedPassword : string) => Promise<boolean>;
    hashPassword : (password: string) => Promise<string>;
    }
}

type UserCreationAttributes = Optional<IUserDocument, 'id' | 'createdAt'>;

const UserModel : ModelDefined<IUserDocument, UserCreationAttributes> & UserModelInstanceMethods = sequelize.define(
    'users',
    {
        username : {
            type : DataTypes.STRING,
            allowNull : false
        },
        googleId : {
            type : DataTypes.STRING,
            allowNull : true
        },
        facebookId : {
            type : DataTypes.STRING,
            allowNull : true
        },
        email : {
            type : DataTypes.STRING,
            allowNull : false,
            unique : false
        },
        password : {
            type : DataTypes.STRING,
            allowNull : true
        },
        createdAt : {
            type : DataTypes.DATE,
            defaultValue : DataTypes.NOW
        }
    },
    {
       indexes : [
        {
            unique : true,
            fields : ['email']
        },
        {
            unique : true,
            fields : ['username']
        },
        
       ]
    }
) as ModelDefined<IUserDocument, UserCreationAttributes> & UserModelInstanceMethods;

UserModel.addHook('beforeCreate', async (auth : Model)=>{
    if(auth.dataValues.password !== undefined){
        const hashedPassword : string = await hash(auth.dataValues.password, SALT_ROUND);
        auth.dataValues.password = hashedPassword;
    }
});

UserModel.prototype.comparePassword = async function(password : string, hashedPassword : string) : Promise<boolean>{
    return await compare(password, hashedPassword);
}

UserModel.prototype.hashPassword = async function(password : string) : Promise<string>{
    return await hash(password, SALT_ROUND);
}

export { UserModel };