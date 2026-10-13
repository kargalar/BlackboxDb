import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class ContentType {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

}


