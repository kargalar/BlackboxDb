import { ObjectType, Field, Int } from 'type-graphql';
import { PersonRoleType } from './PersonRole';

@ObjectType()
export class PersonObject {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  birthDate?: string;

  @Field(() => String, { nullable: true })
  deathDate?: string;

  @Field(() => String, { nullable: true })
  gender?: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;

  @Field(() => String, { nullable: true })
  placeOfBirth?: string;
}

@ObjectType()
export class ContentPerson {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  personId: string;

  @Field(() => PersonObject)
  person: PersonObject;

  @Field(() => String, { nullable: true })
  role?: string; // Legacy field - will be deprecated

  @Field(() => PersonRoleType, { nullable: true })
  personRole?: PersonRoleType;

  @Field(() => String, { nullable: true })
  character?: string;

  @Field(() => String, { nullable: true })
  department?: string;

  @Field(() => String, { nullable: true })
  job?: string;

  @Field(() => Int, { nullable: true })
  creditOrder?: number;
}


