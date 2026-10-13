import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
export class Franchise {
  @Field(() => ID)
  id: string; // UUID

  @Field(() => String)
  name: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => Int, { nullable: true })
  contentCount?: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string | null;
}

// Keep ContentSeries as alias for backward compatibility
export { Franchise as ContentSeries };


