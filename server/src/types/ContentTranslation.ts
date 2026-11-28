import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
@InputType("ContentTranslationInput")
export class ContentTranslationText {
  @Field(() => String)
  language: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;
}
