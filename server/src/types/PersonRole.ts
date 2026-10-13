import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class PersonRoleType {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  label: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;

  @Field(() => Int, { nullable: true })
  contentCount?: number;
}


