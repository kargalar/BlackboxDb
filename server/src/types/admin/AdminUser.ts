import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class AdminUser {
    @Field(() => String)
    authUserId: string;

    @Field(() => String)
    username: string;

    @Field(() => String)
    email: string;

    @Field(() => Boolean)
    isAdmin: boolean;

    @Field(() => Boolean)
    isModerator: boolean;

    @Field(() => Date)
    createdAt: Date;
}


