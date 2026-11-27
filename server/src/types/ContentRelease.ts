import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
@InputType("ContentReleaseInput")
export class ContentRelease {
  @Field(() => String, { nullable: true })
  regionCode?: string | null;

  @Field(() => String)
  date!: string;
}
