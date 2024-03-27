import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphql, print, ASTNode, GraphQLSchema, Kind } from "graphql";

let schema: GraphQLSchema;

export function initLocalGraphQLServer({
  resolvers,
  typeDefs,
}: {
  resolvers: any;
  typeDefs: string;
}) {
  schema = makeExecutableSchema({ typeDefs, resolvers });
}

export async function query(item: any, query: ASTNode, type: string) {
  let adjustedQuery = `
  {
      ${print(query)}
  }`;

  adjustedQuery = adjustedQuery.replace("item", type);

  const result = await graphql({
    schema,
    source: adjustedQuery,
    rootValue: { [type]: item },
  });

  return { ...(result?.data?.[type] || {}) };
}
