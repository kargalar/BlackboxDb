import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class AdminGenre {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminGameMode {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminGameEngine {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminPerspective {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminPlatform {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminTheme {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminMood {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}

@ObjectType()
export class AdminAgeRating {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;
}


