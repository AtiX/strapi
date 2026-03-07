import type { Components, Component } from '../../../types';
import type { UID } from '@strapi/types';

export type NestedComponent = {
  component: UID.Component;
  uidsOfAllParents?: UID.Component[];
  parentCompoUid?: UID.Component;
  /** True if this component is referenced by another component's dynamiczone attribute */
  viaDynamicZone?: boolean;
};

export const retrieveNestedComponents = (appComponents: Components): NestedComponent[] => {
  const nestedComponents = Object.keys(appComponents).reduce((acc: NestedComponent[], current) => {
    const componentAttributes = appComponents?.[current]?.attributes ?? [];
    const currentComponentNestedCompos = getComponentsNestedWithinComponent(
      componentAttributes,
      current as UID.Component
    );
    return [...acc, ...currentComponentNestedCompos];
  }, []);

  return mergeComponents(nestedComponents);
};

const getComponentsNestedWithinComponent = (
  componentAttributes: Component['attributes'],
  parentCompoUid: UID.Component
) => {
  return componentAttributes.reduce((acc: NestedComponent[], current) => {
    const { type } = current;

    if (type === 'component') {
      acc.push({
        component: current.component,
        parentCompoUid,
      });
    }

    if (type === 'dynamiczone' && 'components' in current && current.components) {
      for (const dzComponentUid of current.components) {
        acc.push({
          component: dzComponentUid as UID.Component,
          parentCompoUid,
          viaDynamicZone: true,
        });
      }
    }

    return acc;
  }, []);
};

// Merge duplicate components
const mergeComponents = (originalComponents: NestedComponent[]): NestedComponent[] => {
  const componentMap = new Map();
  // Populate the map with component and its parents
  originalComponents.forEach(({ component, parentCompoUid, viaDynamicZone }) => {
    if (!componentMap.has(component)) {
      componentMap.set(component, { parents: new Set(), viaDynamicZone: false });
    }
    const entry = componentMap.get(component)!;
    entry.parents.add(parentCompoUid);
    if (viaDynamicZone) {
      entry.viaDynamicZone = true;
    }
  });

  // Convert the map to the desired array format
  const transformedComponents: NestedComponent[] = Array.from(componentMap.entries()).map(
    ([component, { parents, viaDynamicZone }]) => ({
      component,
      uidsOfAllParents: Array.from(parents),
      viaDynamicZone,
    })
  );

  return transformedComponents;
};
