import type { ComponentWithChildren } from '../components/DataManager/utils/retrieveComponentsThatHaveComponents';
import type { NestedComponent } from '../components/DataManager/utils/retrieveNestedComponents';
import type { Internal } from '@strapi/types';

const findComponent = <T extends { component: Internal.UID.Component }>(
  componentUid: Internal.UID.Schema,
  components: Array<T>
) => {
  return components.find((c) => c.component === componentUid);
};

/**
 * Recursively calculates the maximum depth of nested child components
 * for a given component UID.
 *
 * @param componentUid - The UID of the component to start from.
 * @param components - The array of all components with their child components.
 * @param currentDepth - The current depth of the recursion. Defaults to 0.
 * @returns The maximum depth of the nested child components.
 */
export const getChildrenMaxDepth = (
  componentUid: Internal.UID.Component,
  components: Array<ComponentWithChildren>,
  currentDepth = 0
) => {
  const component = findComponent(componentUid, components);

  // If the component doesn't exist or has no child components, return the current depth.
  if (!component || !component.childComponents || component.childComponents.length === 0) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  // Iterate through each child component to calculate their respective depths.
  component.childComponents.forEach((child) => {
    // Recursively calculate the depth of the child component.
    const depth = getChildrenMaxDepth(child.component, components, currentDepth + 1);
    // Update the maximum depth if the child's depth is greater.
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });

  return maxDepth;
};

/**
 * Returns the dynamic zone nesting depth for a component.
 *
 * Returns 1 if the component is referenced by another component's dynamiczone attribute
 * (i.e. it lives inside a DZ that is itself inside a component), 0 otherwise.
 *
 * This is used to enforce MAX_DZ_DEPTH: if depth >= MAX_DZ_DEPTH the CTB should not
 * offer "Dynamic Zone" as an available attribute type for that component.
 *
 * Note: This currently only returns 0 or 1, which is sufficient for MAX_DZ_DEPTH=1.
 * If MAX_DZ_DEPTH is increased beyond 1, this function must be made recursive
 * to walk the parent chain and count DZ transitions.
 *
 * @param component - The UID of the component to check.
 * @param components - The array of all nested components (from retrieveNestedComponents).
 * @returns 0 or 1 indicating the DZ nesting depth.
 */
export const getDzDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
): number => {
  const nestedCompo = findComponent(component, components);
  if (!nestedCompo || !nestedCompo.viaDynamicZone) {
    return 0;
  }
  return 1;
};

/**
 * Calculates the depth of a component within a nested component tree.
 * Depth is defined as the level at which the component is nested.
 * For example, a component at Depth 3 is the third nested component.
 *
 * @param component - The UID of the component to find the depth for.
 * @param components - The array of all nested components.
 * @returns The depth level of the component within the nested tree.
 */
export const getComponentDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
) => {
  /**
   * Helper function to recursively calculate the depth of a component.
   *
   * @param currentComponent - The current component being inspected.
   * @param currentLevel - The current level of depth in the tree.
   * @returns An array of depth levels found for the component.
   */
  const getDepth = (currentComponent: NestedComponent, currentLevel: number): Array<number> => {
    const levels = [];
    levels.push(currentLevel);

    // If the component has no parent UIDs, return the current levels
    if (!currentComponent.uidsOfAllParents) {
      return levels;
    }

    // Iterate over each parent UID to calculate their respective depths
    for (const parentUid of currentComponent.uidsOfAllParents) {
      const parentComponent = findComponent(parentUid, components);
      if (parentComponent) {
        levels.push(...getDepth(parentComponent, currentLevel + 1));
      }
    }

    return levels;
  };

  const nestedCompo = findComponent(component, components);
  // return depth 0 if component is not nested
  if (!nestedCompo) {
    return 0;
  }
  const compoDepth = Math.max(...getDepth(nestedCompo, 1));
  return compoDepth;
};
