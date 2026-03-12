import type { Component, EntityQuery } from "@claudiu-ceia/tick";

export const getSingletonEntity = <T>(query: EntityQuery): T | null => {
  const entities = query.run();
  return (entities[0] as T | undefined) ?? null;
};

export const getSingletonComponent = <C extends Component>(
  query: EntityQuery,
  constr: { prototype: C },
): C | null => {
  const entity = query.run()[0] as { getComponent(c: { prototype: C }): C } | undefined;
  return entity ? entity.getComponent(constr) : null;
};
