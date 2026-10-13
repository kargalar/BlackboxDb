import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class PersonSearchResult {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    biography?: string;

    @Field(() => String, { nullable: true })
    profileUrl?: string;

    @Field(() => String, { nullable: true })
    birthDate?: string;

    @Field(() => String, { nullable: true })
    deathDate?: string;

    @Field(() => String, { nullable: true })
    gender?: string;

    @Field(() => String, { nullable: true })
    placeOfBirth?: string;

    @Field(() => String)
    createdAt: string;
}

@ObjectType()
export class Genre {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;

    @Field(() => Int, { nullable: true })
    contentTypeId?: number;

    @Field(() => String)
    createdAt: string;
}

@ObjectType()
export class Language {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    name: string;

    @Field(() => String)
    createdAt: string;
}


