import { SchemaKey } from '@formily/react';
import { reduce, unionBy } from 'lodash';
import { useContext } from 'react';
import { useAPIClient } from '../../api-client';
import { CollectionContext } from '../context';
import { CollectionFieldOptions } from '../types';
import { useCollectionManager } from './useCollectionManager';

export type Collection = ReturnType<typeof useCollection>;

export const useCollection = () => {
  const collection = useContext(CollectionContext);
  const api = useAPIClient();
  const resource = api?.resource(collection?.name);
  const { getInheritCollections, getCurrentCollectionFields } = useCollectionManager();
  const currentFields = collection?.fields || [];
  const inheritKeys = getInheritCollections(collection?.name) || [];
  const inheritedFields = reduce(
    inheritKeys,
    (result, value) => {
      const arr = result;
      return arr.concat(getCurrentCollectionFields(value));
    },
    [],
  );
  const totalFields = unionBy(currentFields?.concat(inheritedFields), 'name').filter((v) => {
    return !v.isForeignKey;
  });
  return {
    ...collection,
    resource,
    getField(name: SchemaKey): CollectionFieldOptions {
      const fields = totalFields;
      return fields?.find((field) => field.name === name);
    },
    fields: totalFields,
    getPrimaryKey: () => {
      if (collection.targetKey || collection.filterTargetKey) {
        return collection.targetKey || collection.filterTargetKey;
      }
      const field = currentFields.find((field) => field.primaryKey);
      return field ? field.name : 'id';
    },
    currentFields,
    inheritedFields,
  };
};
